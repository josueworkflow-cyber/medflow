"use client";

import React, { use, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Download,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Clock
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Erro ao buscar dados do lote.");
  return r.json();
});

export default function LoteDetalhePage({
  params,
}: {
  params: Promise<{ loteId: string }>;
}) {
  const { loteId } = use(params);
  const { data, error, isLoading } = useSWR(`/api/estoque/lote/${loteId}/distribuicao`, fetcher);
  const [expandedEntrada, setExpandedEntrada] = useState<number | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIVEL":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Disponível</Badge>;
      case "QUARENTENA":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Quarentena</Badge>;
      case "BLOQUEADO":
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Bloqueado</Badge>;
      case "VENCIDO":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Vencido</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">{status}</Badge>;
    }
  };

  const getDiasRestantes = (validadeStr: string) => {
    const validadeDate = new Date(validadeStr);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    validadeDate.setHours(0, 0, 0, 0);
    const diffTime = validadeDate.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);
  };

  const renderValidadeBadge = (validadeStr: string | null) => {
    if (!validadeStr) return <Badge variant="outline">Sem validade</Badge>;
    const dias = getDiasRestantes(validadeStr);
    const formattedDate = new Date(validadeStr).toLocaleDateString("pt-BR");

    if (dias < 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          Vencido em {formattedDate}
        </Badge>
      );
    }
    if (dias <= 7) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 font-bold animate-pulse">
          Crítico: {formattedDate} ({dias}d rest.)
        </Badge>
      );
    }
    if (dias <= 30) {
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-semibold">
          Urgente: {formattedDate} ({dias}d rest.)
        </Badge>
      );
    }
    if (dias <= 60) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 font-medium">
          Atenção: {formattedDate} ({dias}d rest.)
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200">
        Validade: {formattedDate} ({dias}d rest.)
      </Badge>
    );
  };

  const exportarCSV = () => {
    if (!data) return;

    let csv = "RASTREAMENTO DE LOTE\n";
    csv += `Lote;${data.lote.numeroLote}\n`;
    csv += `Produto;${data.produto.descricao}\n`;
    csv += `Validade;${data.lote.validade ? new Date(data.lote.validade).toLocaleDateString("pt-BR") : "N/A"}\n`;
    csv += `Status;${data.lote.status}\n\n`;

    csv += "RESUMO\n";
    csv += `Total Entrado;${data.resumo.totalEntrado}\n`;
    csv += `  - Entrada Fornecedor;${data.resumo.totalEntradoOriginal}\n`;
    csv += `  - Devolucao Cliente;${data.resumo.totalDevolvidoOriginal}\n`;
    csv += `Total Saido;${data.resumo.totalSaido}\n`;
    csv += `Total Reservado;${data.resumo.totalReservado}\n`;
    csv += `Total Disponivel;${data.resumo.totalDisponivel}\n`;
    csv += `Total Perdas;${data.resumo.totalPerdas}\n\n`;

    csv += "ENTRADAS\n";
    csv += "Data;Quantidade;Origem;Fornecedor;Chave de Acesso;Usuario;Tipo\n";
    data.entradas.forEach((e: any) => {
      csv += `${new Date(e.data).toLocaleDateString("pt-BR")};${e.quantidade};${e.origem};${e.fornecedor || ""};${e.chaveAcesso || ""};${e.usuario};${e.tipoBadge}\n`;
    });
    csv += "\n";

    csv += "SAIDAS\n";
    csv += "Data;Quantidade;Cliente;Pedido;Tipo;NF Numero;NF Chave;Usuario;Status\n";
    data.saidas.forEach((s: any) => {
      csv += `${new Date(s.data).toLocaleDateString("pt-BR")};${s.quantidade};${s.cliente};${s.pedidoNumero};${s.tipo};${s.nfNumero || ""};${s.nfChave || ""};${s.usuario};${s.status}\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rastreabilidade_lote_${data.lote.numeroLote}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV de rastreabilidade exportado com sucesso.");
  };

  const getEntradaBadge = (tipo: string) => {
    switch (tipo) {
      case "Entrada NF-e":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Entrada NF-e</Badge>;
      case "Entrada Manual":
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Entrada Manual</Badge>;
      case "Devolução de Cliente":
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Devolução de Cliente</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">{tipo}</Badge>;
    }
  };

  const getPedidoTipoBadge = (tipo: string) => {
    if (tipo === "PEDIDO_INTERNO") {
      return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Interno</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Com NF</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-[120px] w-full" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[90px]" />)}
        </div>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Erro ao carregar mapa de distribuição</h1>
        <p className="text-slate-500">{error?.message || "Lote não encontrado no sistema."}</p>
        <Link href="/sistema/estoque/lotes">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Lotes
          </Button>
        </Link>
      </div>
    );
  }

  const hasImportMetadata = Boolean(
    data.lote.codigoProdutoLegado ||
    data.lote.nomeProdutoOrigem ||
    data.lote.fornecedorOrigem ||
    data.lote.unidadeOrigem ||
    data.lote.linhaFonteOrigem ||
    data.produto.cest ||
    data.produto.codigoBeneficioFiscal ||
    data.produto.tipoClassificacaoFiscal ||
    data.produto.estoqueMaximo !== null && data.produto.estoqueMaximo !== undefined
  );

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* BREADCRUMB / BACK */}
      <div className="flex items-center justify-between">
        <Link href="/sistema/estoque/lotes" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar para Lotes
        </Link>
        <Button onClick={exportarCSV} className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs flex items-center gap-1.5">
          <Download className="h-4 w-4" /> Exportar rastreabilidade
        </Button>
      </div>

      {/* HEADER PREMIUM */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lote / Rastreabilidade</p>
              <h2 className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight mt-1">
                {data.lote.numeroLote}
              </h2>
              <h3 className="text-lg font-semibold text-slate-700 mt-1">
                {data.produto.descricao}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                {data.produto.registroAnvisa && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    ANVISA: {data.produto.registroAnvisa}
                  </span>
                )}
                {data.produto.fabricante && (
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    Fabricante: {data.produto.fabricante}
                  </span>
                )}
                {data.produto.ncm && (
                  <span className="flex items-center gap-1">
                    NCM: {data.produto.ncm}
                  </span>
                )}
                {data.produto.cest && (
                  <span className="flex items-center gap-1">
                    CEST: {data.produto.cest}
                  </span>
                )}
                {data.produto.codigoBarras && (
                  <span className="flex items-center gap-1">
                    GTIN: {data.produto.codigoBarras}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {getStatusBadge(data.lote.status)}
                {renderValidadeBadge(data.lote.validade)}
              </div>
              {data.lote.status === "QUARENTENA" && data.lote.motivoBloqueio && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 mt-1 max-w-sm text-right">
                  <strong>Quarentena:</strong> {data.lote.motivoBloqueio}
                </div>
              )}
              {data.lote.status === "BLOQUEADO" && data.lote.motivoBloqueio && (
                <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2.5 py-1 mt-1 max-w-sm text-right">
                  <strong>Bloqueado:</strong> {data.lote.motivoBloqueio}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasImportMetadata && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/40 border-b p-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-500" />
              Dados completos do produto e origem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Cadastro do produto</h4>
              <p><span className="font-semibold text-slate-500">Marca:</span> {data.produto.marca || "—"}</p>
              <p><span className="font-semibold text-slate-500">Unidade venda:</span> {data.produto.unidadeVenda || "—"}</p>
              <p><span className="font-semibold text-slate-500">Unidade compra:</span> {data.produto.unidadeCompra || "—"}</p>
              <p><span className="font-semibold text-slate-500">Fator conversão:</span> {formatNumber(data.produto.fatorConversao)}</p>
              <p><span className="font-semibold text-slate-500">Produto variado:</span> {data.produto.produtoVariado ? "Sim" : "Não"}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Reposição e fiscal</h4>
              <p><span className="font-semibold text-slate-500">Estoque mínimo:</span> {formatNumber(data.produto.estoqueMinimo)}</p>
              <p><span className="font-semibold text-slate-500">Estoque máximo:</span> {formatNumber(data.produto.estoqueMaximo)}</p>
              <p><span className="font-semibold text-slate-500">Benefício fiscal:</span> {data.produto.codigoBeneficioFiscal || "—"}</p>
              <p><span className="font-semibold text-slate-500">Class. fiscal legada:</span> {data.produto.tipoClassificacaoFiscal || "—"}</p>
              <p><span className="font-semibold text-slate-500">Categoria legada:</span> {[data.produto.categoriaLegadoId, data.produto.subcategoriaLegadoId].filter(Boolean).join(" / ") || "—"}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Linha original do estoque</h4>
              <p><span className="font-semibold text-slate-500">Código legado:</span> {data.lote.codigoProdutoLegado || "—"}</p>
              <p><span className="font-semibold text-slate-500">Linha fonte:</span> {data.lote.linhaFonteOrigem || "—"}</p>
              <p><span className="font-semibold text-slate-500">Fornecedor origem:</span> {[data.lote.fornecedorOrigem, data.lote.fornecedorLegadoId].filter(Boolean).join(" / ") || "—"}</p>
              <p><span className="font-semibold text-slate-500">Unidade origem:</span> {data.lote.unidadeOrigem || "—"}</p>
              <p><span className="font-semibold text-slate-500">Venda/custo origem:</span> {formatCurrency(data.lote.valorVendaOrigem)} / {formatCurrency(data.lote.valorCustoOrigem)}</p>
              {data.lote.nomeProdutoOrigem && (
                <p className="pt-1 text-slate-500"><span className="font-semibold">Nome original:</span> {data.lote.nomeProdutoOrigem}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI RESUMO - 5 CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card Total Entrado */}
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[90px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Entrado</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{data.resumo.totalEntrado}</h4>
            <div className="text-[9px] text-slate-500 mt-1 font-medium leading-tight">
              Forn: {data.resumo.totalEntradoOriginal} <span className="text-slate-300">|</span> Dev: {data.resumo.totalDevolvidoOriginal}
            </div>
          </CardContent>
        </Card>

        {/* Card Total Saído */}
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[90px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Saído</p>
            <h4 className="text-2xl font-bold text-indigo-600 mt-1">{data.resumo.totalSaido}</h4>
            <div className="text-[9px] text-slate-500 mt-1 font-medium">
              Vendido / Faturado
            </div>
          </CardContent>
        </Card>

        {/* Card Total Reservado */}
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[90px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reservado</p>
            <h4 className="text-2xl font-bold text-orange-600 mt-1">{data.resumo.totalReservado}</h4>
            <div className="text-[9px] text-slate-500 mt-1 font-medium">
              Aguardando separação
            </div>
          </CardContent>
        </Card>

        {/* Card Total Disponível */}
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[90px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Disponível</p>
            <h4 className="text-2xl font-bold text-emerald-600 mt-1">{data.resumo.totalDisponivel}</h4>
            <div className="text-[9px] text-slate-500 mt-1 font-medium">
              Físico livre no estoque
            </div>
          </CardContent>
        </Card>

        {/* Card Total Perdas */}
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[90px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Perdas</p>
            <h4 className="text-2xl font-bold text-red-600 mt-1">{data.resumo.totalPerdas}</h4>
            <div className="text-[9px] text-slate-500 mt-1 font-medium">
              Perdas / descartes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ENTRADAS TABLE */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/40 border-b p-4">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Entradas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.entradas.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhuma entrada registrada para este lote.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-bold text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4 w-[50px]"></th>
                    <th className="py-2.5 px-4">Data</th>
                    <th className="px-4">Quantidade</th>
                    <th className="px-4">Origem</th>
                    <th className="px-4">Tipo</th>
                    <th className="px-4">Fornecedor</th>
                    <th className="px-4">Usuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.entradas.map((e: any, idx: number) => {
                    const isExpanded = expandedEntrada === idx;
                    const canExpand = !!e.chaveAcesso;

                    return (
                      <React.Fragment key={idx}>
                        <tr
                          className={`hover:bg-slate-50/50 transition-colors ${canExpand ? "cursor-pointer font-medium" : ""}`}
                          onClick={() => canExpand && setExpandedEntrada(isExpanded ? null : idx)}
                        >
                          <td className="py-3 px-4 text-center">
                            {canExpand && (
                              isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {new Date(e.data).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 font-bold text-slate-800">{e.quantidade}</td>
                          <td className="px-4 text-slate-600">{e.origem}</td>
                          <td className="px-4">{getEntradaBadge(e.tipoBadge)}</td>
                          <td className="px-4 text-slate-600 truncate max-w-[200px]">{e.fornecedor || "—"}</td>
                          <td className="px-4 text-xs text-slate-500 flex items-center gap-1.5 mt-2.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {e.usuario}
                          </td>
                        </tr>
                        {canExpand && isExpanded && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={7} className="px-12 py-3 border-t">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                <div className="space-y-1">
                                  <span className="font-bold text-slate-600 block">Chave de Acesso NF-e:</span>
                                  <span className="font-mono text-slate-500 select-all block bg-white border p-1.5 rounded">{e.chaveAcesso}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[11px] h-7 border-slate-200"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    navigator.clipboard.writeText(e.chaveAcesso);
                                    toast.success("Chave de acesso copiada!");
                                  }}
                                >
                                  Copiar Chave
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SAIDAS TABLE */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/40 border-b p-4">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            Saídas de Estoque (Distribuição)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.saidas.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhuma saída registrada para este lote.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-bold text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4">Data</th>
                    <th className="px-4">Quantidade</th>
                    <th className="px-4">Cliente</th>
                    <th className="px-4">Pedido</th>
                    <th className="px-4">Tipo</th>
                    <th className="px-4">NF número</th>
                    <th className="px-4">Usuário</th>
                    <th className="px-4 text-right">Status Pedido</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.saidas.map((s: any, idx: number) => {
                    const hasPedidoLink = !!s.pedidoVendaId;

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/50 transition-colors ${hasPedidoLink ? "cursor-pointer font-medium" : ""}`}
                        onClick={() => {
                          if (hasPedidoLink) {
                            window.open(`/sistema/pedidos/funil?pedidoId=${s.pedidoVendaId}`, "_blank");
                          }
                        }}
                      >
                        <td className="py-3 px-4 text-slate-800">
                          {new Date(s.data).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 font-bold text-slate-800">{s.quantidade}</td>
                        <td className="px-4 text-slate-800 font-semibold">{s.cliente}</td>
                        <td className="px-4 font-mono text-xs text-blue-600 hover:underline">{s.pedidoNumero}</td>
                        <td className="px-4">{getPedidoTipoBadge(s.tipo)}</td>
                        <td className="px-4 text-slate-600 font-mono text-xs">{s.nfNumero || "—"}</td>
                        <td className="px-4 text-xs text-slate-500">{s.usuario}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant="secondary" className="text-[10px]">
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
