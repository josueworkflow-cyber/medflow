import { prisma } from "@/lib/prisma";
import { parseNFeXML } from "@/lib/nfe-parser";
import { StatusDocumentoFiscal, TipoDocumentoFiscal } from "@prisma/client";

export const deps = {
  parseNFeXML,
};

export interface ItemPendente {
  descricao: string;
  ncm: string;
  ean?: string;
  codigoFornecedor: string;
  quantidade: number;
  valorUnitario: number;
}

export interface ImportacaoResult {
  sucesso: boolean;
  documentoFiscalId: number;
  fornecedorId: number;
  fornecedorCriado: boolean;
  itensImportados: number;
  itensPendentes: ItemPendente[];
  alertasLote: string[];
  chave?: string;
  numero?: string;
}

export class NFeImportacaoService {
  /**
   * Importa um XML de NF-e de entrada e realiza a persistência no banco de dados.
   * 
   * @param xmlBase64 XML em formato base64
   * @param usuarioId ID do usuário logado que executou a ação
   */
  static async importarNFeEntrada(
    xmlBase64: string,
    usuarioId: number
  ): Promise<ImportacaoResult> {
    // 1. Decodificar XML de base64
    const xmlContent = Buffer.from(xmlBase64, "base64").toString("utf-8");

    // 2. Chamar o parser existente
    const nfeData = deps.parseNFeXML(xmlContent);

    // 3. Validar se a nota já foi importada anteriormente
    const existingDoc = await prisma.documentoFiscal.findFirst({
      where: {
        chaveAcesso: nfeData.chave,
        tipo: "NFE_ENTRADA",
      },
    });

    if (existingDoc) {
      throw new Error("Nota fiscal já importada anteriormente");
    }

    // 4. Resolver fornecedor pelo CNPJ do emitente
    // DECISÃO DE DESIGN: O cadastro de novos fornecedores ocorre fora da transação principal do Prisma.
    // Isso reduz significativamente os locks no banco e evita deadlocks desnecessários.
    // Caso a importação sofra rollback devido a itens pendentes ou outros erros transacionais,
    // o fornecedor permanecerá persistido no banco de dados, o que é um comportamento idempotente aceitável.
    let fornecedor = await prisma.fornecedor.findFirst({
      where: { cnpj: nfeData.emitente.cnpj },
    });
    let fornecedorCriado = false;

    if (!fornecedor) {
      fornecedor = await prisma.fornecedor.create({
        data: {
          razaoSocial: nfeData.emitente.razaoSocial,
          nomeFantasia: nfeData.emitente.nomeFantasia || null,
          cnpj: nfeData.emitente.cnpj,
          email: null,
          telefone: null,
          endereco: `${nfeData.emitente.logradouro}, ${nfeData.emitente.numero} - ${nfeData.emitente.bairro}`,
          cidade: nfeData.emitente.cidade,
          estado: nfeData.emitente.uf,
          cep: nfeData.emitente.cep,
          // Novos campos estruturados da migration
          logradouro: nfeData.emitente.logradouro,
          numero: nfeData.emitente.numero,
          complemento: null,
          bairro: nfeData.emitente.bairro,
          codigoMunicipio: null, // IBGE
          inscricaoEstadual: null,
          inscricaoMunicipal: null,
          ativo: true,
        },
      });
      fornecedorCriado = true;
    }

    // 5. Executar a persistência dos itens encontrados em transação atômica
    return prisma.$transaction(async (tx) => {
      let itensImportados = 0;
      const itensPendentes: ItemPendente[] = [];
      const alertasLote: string[] = [];

      for (const item of nfeData.produtos) {
        let produto = null;

        // Estratégia de Match:
        // a. Primeiro busca por EAN/codigoBarras (se presente e válido)
        if (item.ean && item.ean !== "SEM GTIN") {
          produto = await tx.produto.findFirst({
            where: { codigoBarras: item.ean },
          });
        }

        // b. Se não encontrar, busca por codigoFabricante + cnpjFabricante do emitente
        if (!produto) {
          produto = await tx.produto.findFirst({
            where: {
              codigoFabricante: item.codigo,
              cnpjFabricante: nfeData.emitente.cnpj,
            },
          });
        }

        // c. Se ainda assim não encontrar, adiciona a pendentes e passa para o próximo item
        if (!produto) {
          itensPendentes.push({
            descricao: item.descricao,
            ncm: item.ncm || "",
            ean: item.ean || undefined,
            codigoFornecedor: item.codigo,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
          });
          continue;
        }

        // d. Verificar alertas de lote
        if (produto.controlaLote && !item.lote) {
          alertasLote.push(
            `Produto ${produto.descricao} exige controle de lote mas o XML não contém informação de lote`
          );
        }

        let loteId: number | null = null;

        if (item.lote) {
          // Processa validade e determina se está vencido (Tarefa 2)
          const validadeDate = item.validade ? new Date(item.validade) : null;
          let statusLote: "DISPONIVEL" | "VENCIDO" = "DISPONIVEL";

          if (validadeDate) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const val = new Date(validadeDate);
            val.setHours(0, 0, 0, 0);
            if (val < hoje) {
              statusLote = "VENCIDO";
            }
          }

          // Criar ou atualizar o lote
          const lote = await tx.lote.upsert({
            where: {
              numeroLote_produtoId: {
                numeroLote: item.lote,
                produtoId: produto.id,
              },
            },
            update: {
              validade: validadeDate,
              fornecedorId: fornecedor!.id,
              precoCusto: item.valorUnitario,
              status: statusLote,
            },
            create: {
              numeroLote: item.lote,
              validade: validadeDate,
              produtoId: produto.id,
              fornecedorId: fornecedor!.id,
              precoCusto: item.valorUnitario,
              status: statusLote,
            },
          });
          loteId = lote.id;

          // Criar a movimentação de estoque
          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: produto.id,
              loteId: lote.id,
              tipo: "ENTRADA",
              quantidade: item.quantidade,
              usuarioId,
              observacao: `Importação de NF-e nº ${nfeData.numero}`,
              origem: `NF-e de Entrada: ${nfeData.chave}`,
            },
          });

          // Atualizar o EstoqueAtual
          const estoque = await tx.estoqueAtual.findFirst({
            where: {
              produtoId: produto.id,
              loteId: lote.id,
            },
          });

          const statusEstoque = statusLote === "VENCIDO" ? "VENCIDO" : "DISPONIVEL";

          if (estoque) {
            await tx.estoqueAtual.update({
              where: { id: estoque.id },
              data: {
                quantidadeDisponivel: { increment: item.quantidade },
                custoUnitario: item.valorUnitario,
                status: statusEstoque,
              },
            });
          } else {
            await tx.estoqueAtual.create({
              data: {
                produtoId: produto.id,
                loteId: lote.id,
                quantidadeDisponivel: item.quantidade,
                custoUnitario: item.valorUnitario,
                status: statusEstoque,
              },
            });
          }
        } else {
          // Sem lote (produto que não exige lote ou fallback)
          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: produto.id,
              loteId: null,
              tipo: "ENTRADA",
              quantidade: item.quantidade,
              usuarioId,
              observacao: `Importação de NF-e nº ${nfeData.numero} (sem lote)`,
              origem: `NF-e de Entrada: ${nfeData.chave}`,
            },
          });

          const estoque = await tx.estoqueAtual.findFirst({
            where: {
              produtoId: produto.id,
              loteId: null,
            },
          });

          if (estoque) {
            await tx.estoqueAtual.update({
              where: { id: estoque.id },
              data: {
                quantidadeDisponivel: { increment: item.quantidade },
                custoUnitario: item.valorUnitario,
                status: "DISPONIVEL",
              },
            });
          } else {
            await tx.estoqueAtual.create({
              data: {
                produtoId: produto.id,
                loteId: null,
                quantidadeDisponivel: item.quantidade,
                custoUnitario: item.valorUnitario,
                status: "DISPONIVEL",
              },
            });
          }
        }

        itensImportados++;
      }

      // 6. Criar o DocumentoFiscal correspondente
      const doc = await tx.documentoFiscal.create({
        data: {
          tipo: "NFE_ENTRADA",
          status: StatusDocumentoFiscal.AUTORIZADA,
          numero: nfeData.numero,
          chaveAcesso: nfeData.chave,
          dataEmissao: nfeData.dataEmissao ? new Date(nfeData.dataEmissao) : new Date(),
          fornecedorId: fornecedor!.id,
          empresaFiscalId: null, // Deixamos nulo pois é uma nota emitida por fornecedor externo
        },
      });

      return {
        sucesso: true,
        documentoFiscalId: doc.id,
        fornecedorId: fornecedor!.id,
        fornecedorCriado,
        itensImportados,
        itensPendentes,
        alertasLote,
        chave: nfeData.chave,
        numero: nfeData.numero,
      };
    });
  }
}
