import { NextRequest, NextResponse } from "next/server";
import { parseNFeXML } from "@/lib/nfe-parser";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const xmlContent = await file.text();
    const nfeData = parseNFeXML(xmlContent);

    // 1. Verificar/Criar Fornecedor
    let fornecedor = await prisma.fornecedor.findFirst({
      where: { cnpj: nfeData.emitente.cnpj },
    });

    if (!fornecedor) {
      fornecedor = await prisma.fornecedor.create({
        data: {
          razaoSocial: nfeData.emitente.razaoSocial,
          nomeFantasia: nfeData.emitente.nomeFantasia || nfeData.emitente.razaoSocial,
          cnpj: nfeData.emitente.cnpj,
          endereco: `${nfeData.emitente.logradouro}, ${nfeData.emitente.numero}`,
          cidade: nfeData.emitente.cidade,
          estado: nfeData.emitente.uf,
          cep: nfeData.emitente.cep,
        },
      });
    }

    // 2. Processar Produtos e criar Pedido de Compra
    // Nota: Em um ERP real, faríamos o "de-para" de códigos de produtos. 
    // Aqui, vamos buscar por EAN ou Descrição para simplificar.
    
    const pedido = await prisma.pedidoCompra.create({
      data: {
        numero: `NFE-${nfeData.numero}`,
        fornecedorId: fornecedor.id,
        status: "RECEBIDO", // Importação de XML assume que a mercadoria chegou ou está chegando
        valorTotal: nfeData.valorTotal,
        observacao: `Importado via XML - Chave: ${nfeData.chave}`,
        itens: {
          create: await Promise.all(nfeData.produtos.map(async (p) => {
            // Tentar localizar produto existente
            let produto = await prisma.produto.findFirst({
              where: {
                OR: [
                  { codigoBarras: p.ean },
                  { descricao: p.descricao }
                ]
              }
            });

            // Se não existe, cria um novo SKU
            if (!produto) {
              produto = await prisma.produto.create({
                data: {
                  descricao: p.descricao,
                  codigoBarras: p.ean || null,
                  unidadeCompra: p.unidade,
                  unidadeVenda: p.unidade,
                  precoCustoBase: p.valorUnitario,
                  ativo: true,
                }
              });
            }

            return {
              produtoId: produto.id,
              quantidade: p.quantidade,
              precoUnitario: p.valorUnitario,
              subtotal: p.valorTotal,
            };
          })),
        },
      },
    });

    // 3. Opcional: Já dar entrada no estoque se o usuário desejar
    // Por enquanto vamos apenas criar o pedido como 'RECEBIDO'.

    return NextResponse.json({ 
      success: true, 
      pedidoId: pedido.id,
      fornecedor: fornecedor.razaoSocial,
      valor: nfeData.valorTotal 
    });

  } catch (error: any) {
    console.error("Erro na importação de XML:", error);
    return NextResponse.json({ error: error.message || "Erro ao processar XML." }, { status: 500 });
  }
}
