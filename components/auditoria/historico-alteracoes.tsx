"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { History, User, Calendar, ArrowRight } from "lucide-react";

type Alteracao = {
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
};

type GrupoHistorico = {
  grupoId: string;
  data: string;
  usuario: { id: number; nome: string } | null;
  motivo: string;
  alteracoes: Alteracao[];
};

type HistoricoAlteracoesProps = {
  entidade: "produto" | "lote" | "movimentacao-estoque";
  entidadeId: number;
};

// Dicionário para traduzir campos técnicos para amigáveis
const tradutorCampos: Record<string, string> = {
  // Produto
  descricao: "Descrição",
  codigoInterno: "Código Interno",
  codigoBarras: "Código de Barras",
  categoria: "Categoria",
  fabricante: "Fabricante",
  unidadeVenda: "Unidade de Venda",
  unidadeCompra: "Unidade de Compra",
  fatorConversao: "Fator de Conversão",
  registroAnvisa: "Registro ANVISA",
  temperaturaArmazenamento: "Temperatura de Armazenamento",
  controlaValidade: "Controla Validade",
  controlaLote: "Controla Lote",
  precoCustoBase: "Preço de Custo Base",
  precoVendaBase: "Preço de Venda Base",
  estoqueMinimo: "Estoque Mínimo",
  cnpjFabricante: "CNPJ do Fabricante",
  classeRisco: "Classe de Risco",
  codigoFabricante: "Código do Fabricante",
  apresentacao: "Apresentação",
  concentracaoValor: "Valor de Concentração",
  concentracaoUnidade: "Unidade de Concentração",
  principioAtivo: "Princípio Ativo",
  marca: "Marca",
  conteudoEmbalagem: "Conteúdo da Embalagem",
  localizacaoEstoque: "Localização de Estoque",
  pontoReposicao: "Ponto de Reposição",
  ncm: "NCM",
  cfop: "CFOP",
  cst: "CST",
  csosn: "CSOSN",
  origemMercadoria: "Origem da Mercadoria",
  aliquotaIcms: "Alíquota ICMS",
  aliquotaIpi: "Alíquota IPI",
  aliquotaPis: "Alíquota PIS",
  aliquotaCofins: "Alíquota COFINS",
  unidadeFiscal: "Unidade Fiscal",
  ativo: "Ativo",

  // Lote
  numeroLote: "Número do Lote",
  validade: "Data de Validade",
  localizacaoId: "Localização ID",
  fornecedorId: "Fornecedor ID",
  enderecoEstoque: "Endereço no Estoque",
  status: "Status do Lote",
  precoCusto: "Preço de Custo",
  motivoBloqueio: "Motivo do Bloqueio",
  bloqueadoEm: "Bloqueado Em",
  bloqueadoPor: "Bloqueado Por",

  // EstoqueAtual / MovimentacaoEstoque
  quantidade: "Quantidade",
  tipo: "Tipo de Movimentação",
  destino: "Destino",
  origem: "Origem",
  observacao: "Observação",
  pedidoVendaId: "Pedido de Venda ID",
  empresaFiscalId: "Empresa Fiscal ID",
};

export function HistoricoAlteracoes({ entidade, entidadeId }: HistoricoAlteracoesProps) {
  const [historico, setHistorico] = useState<GrupoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function buscarHistorico() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/auditoria/${entidade}/${entidadeId}`);
        if (!res.ok) {
          throw new Error("Erro ao carregar o histórico de alterações.");
        }
        const data = await res.json();
        if (active) {
          setHistorico(data);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Erro de conexão.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (entidadeId) {
      buscarHistorico();
    }

    return () => {
      active = false;
    };
  }, [entidade, entidadeId]);

  // Auxiliar para formatar valores antigos/novos
  const formatarValor = (campo: string, valor: string | null) => {
    if (valor === null || valor === undefined || valor === "") {
      return <span className="text-slate-400 italic">vazio</span>;
    }
    if (valor === "true") return "Sim";
    if (valor === "false") return "Não";

    // Verifica se parece um formato de data ISO
    if (valor.includes("-") && !isNaN(Date.parse(valor)) && valor.length >= 10) {
      const date = new Date(valor);
      // Evita falsos positivos com strings numéricas
      if (date.getFullYear() > 1990 && date.getFullYear() < 2100) {
        // Para validade especificamente (data sem componente de hora relevante) ou strings de data simples de 10 caracteres
        if (campo.toLowerCase() === "validade" || valor.length === 10) {
          return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
        }
        return date.toLocaleString("pt-BR", { timeZone: "UTC" });
      }
    }

    // Se o campo for alíquota, formata como percentual
    if (campo.toLowerCase().includes("aliquota")) {
      return `${valor}%`;
    }

    // Se o campo for preço ou custo, formata como moeda
    if (campo.toLowerCase().includes("preco") || campo.toLowerCase().includes("custo")) {
      const num = Number(valor);
      if (!isNaN(num)) {
        return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
    }

    return valor;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border border-slate-150 rounded-2xl shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center border border-red-200 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold">
        {error}
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <History className="h-7 w-7 text-slate-300 mb-2" />
        <h3 className="text-xs font-bold text-slate-700">Nenhum histórico encontrado</h3>
        <p className="text-[11px] text-slate-400 mt-1 leading-normal max-w-[260px]">
          Não há registros de alterações manuais salvas para este item até o momento.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l-2 border-slate-100 ml-3 space-y-6">
      {historico.map((grupo) => (
        <div key={grupo.grupoId} className="relative">
          {/* Ponto indicador na timeline */}
          <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-900 shadow-sm" />

          <Card className="border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Cabeçalho do Grupo */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {grupo.usuario?.nome || "Sistema"}
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(grupo.data).toLocaleString("pt-BR")}
                </div>
              </div>

              {/* Justificativa / Motivo */}
              <div className="bg-slate-50 border rounded-xl p-2.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Motivo da Alteração</p>
                <p className="text-xs text-slate-700 mt-1 font-medium italic">&quot;{grupo.motivo}&quot;</p>
              </div>

              {/* Tabela / Lista de alterações individuais */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campos Modificados</p>
                <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden bg-white text-xs">
                  {grupo.alteracoes.map((alt, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center p-3 gap-2 hover:bg-slate-50/40">
                      <div className="sm:w-[150px] font-semibold text-slate-700 shrink-0">
                        {tradutorCampos[alt.campo] || alt.campo}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <div className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 truncate max-w-[200px]">
                          {formatarValor(alt.campo, alt.valorAnterior)}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <div className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-emerald-800 font-medium truncate max-w-[200px]">
                          {formatarValor(alt.campo, alt.valorNovo)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
