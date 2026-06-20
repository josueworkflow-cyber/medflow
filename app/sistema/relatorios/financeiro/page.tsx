"use client";

import { useEffect, useState } from "react";
import { exportToXLSX } from "@/lib/relatorios/export-xlsx";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ChevronRight,
  Filter,
  RefreshCw,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
  Users
} from "lucide-react";



// Translate Payment Methods safely
function traduzirFormaPagamento(forma: string) {
  switch (forma) {
    case "PIX": return "PIX";
    case "BOLETO": return "Boleto";
    case "CARTAO_CREDITO": return "Cartão de Crédito";
    case "CARTAO_DEBITO": return "Cartão de Débito";
    case "DINHEIRO": return "Dinheiro";
    case "TRANSFERENCIA": return "Transferência";
    case "A_PRAZO": return "A prazo";
    case "CHEQUE": return "Cheque";
    case "NAO_INFORMADO": return "Não informado";
    default: return forma;
  }
}

export default function RelatorioFinanceiroPage() {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeTab, setActiveTab] = useState("dre");
  
  // Independent loading states per tab
  const [loadingDre, setLoadingDre] = useState(true);
  const [loadingInadimplencia, setLoadingInadimplencia] = useState(true);
  const [loadingFormas, setLoadingFormas] = useState(true);

  // States for API data
  const [dreData, setDreData] = useState<any>(null);
  const [inadimplenciaData, setInadimplenciaData] = useState<any[]>([]);
  const [formasData, setFormasData] = useState<any>(null);

  const carregarDre = async (inicio: string, fim: string) => {
    setLoadingDre(true);
    try {
      const res = await fetch(`/api/relatorios/dre?dataInicio=${inicio}&dataFim=${fim}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDreData(d);
    } catch {
      toast.error("Erro ao carregar relatório DRE");
    } finally {
      setLoadingDre(false);
    }
  };

  const carregarInadimplencia = async () => {
    setLoadingInadimplencia(true);
    try {
      const res = await fetch("/api/relatorios/inadimplencia");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setInadimplenciaData(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Erro ao carregar inadimplência de clientes");
    } finally {
      setLoadingInadimplencia(false);
    }
  };

  const carregarFormas = async (inicio: string, fim: string) => {
    setLoadingFormas(true);
    try {
      const res = await fetch(`/api/relatorios/formas-pagamento?dataInicio=${inicio}&dataFim=${fim}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setFormasData(d);
    } catch {
      toast.error("Erro ao carregar formas de pagamento");
    } finally {
      setLoadingFormas(false);
    }
  };

  useEffect(() => {
    carregarDre(dataInicio, dataFim);
    carregarInadimplencia();
    carregarFormas(dataInicio, dataFim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAplicarFiltros = (e: React.FormEvent) => {
    e.preventDefault();
    if (dataInicio > dataFim) {
      toast.error("A data de início não pode ser maior que a data de fim.");
      return;
    }
    if (activeTab === "dre") {
      carregarDre(dataInicio, dataFim);
    } else if (activeTab === "formas-pagamento") {
      carregarFormas(dataInicio, dataFim);
    }
  };

  const handleExport = () => {
    if (activeTab === "dre") {
      if (!dreData) return;
      const headers = ["Categoria / Descrição", "Valor (R$)"];
      
      const totalRowIndexes = [1, 2, 3]; // Receita Bruta, Total Despesas, Resultado Líquido

      const rows = [
        ["DRE Simplificado - Período de " + dreData.periodo.inicio + " a " + dreData.periodo.fim],
        ["Receita Bruta", dreData.receitaBruta],
        ["Total Despesas", dreData.totalDespesas],
        ["Resultado Líquido", dreData.resultado],
        [],
        ["Receitas por Forma de Pagamento"],
        ...dreData.receitasPorFormaPagamento.map((r: any) => [traduzirFormaPagamento(r.formaPagamento), r.valor]),
        [],
        ["Despesas por Categoria"],
        ...dreData.despesasPorCategoria.map((d: any) => [d.categoria, d.valor])
      ];
      exportToXLSX(`relatorio_dre_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "DRE",
        totalRowIndexes
      });
    } else if (activeTab === "inadimplencia") {
      const headers = ["Razão Social", "CNPJ / CPF", "Qtd Contas", "Conta mais Antiga", "Dias em Atraso", "Total em Aberto (R$)"];
      const rows = inadimplenciaData.map((p: any) => [
        p.razaoSocial,
        p.cnpjCpf || "—",
        p.qtdContas,
        p.contaMaisAntiga ? new Date(p.contaMaisAntiga).toLocaleDateString("pt-BR") : "—",
        p.diasEmAtraso,
        p.totalEmAberto
      ]);
      exportToXLSX(`relatorio_inadimplencia.xlsx`, headers, rows, {
        sheetName: "Inadimplência"
      });
    } else if (activeTab === "formas-pagamento") {
      if (!formasData) return;
      const headers = ["Forma de Pagamento", "Valor Recebido (R$)", "Qtd Transações", "Percentual (%)"];
      const rows = formasData.formas.map((f: any) => [
        traduzirFormaPagamento(f.formaPagamento),
        f.valor,
        f.qtdTransacoes,
        `${f.percentual}%`
      ]);
      exportToXLSX(`relatorio_formas_pagamento_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "Formas de Pagamento"
      });
    }
  };

  // Formatters
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString("pt-BR");
  };

  // KPI Calculations
  const totalInadimplentes = inadimplenciaData.length;
  const valorTotalInadimplente = inadimplenciaData.reduce((sum, item) => sum + item.totalEmAberto, 0);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Relatórios</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 font-medium">Financeiro</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 text-slate-900">Relatório Financeiro</h1>
          <p className="text-muted-foreground text-sm">
            Demonstrativos de performance, acompanhamento de inadimplência e fluxos de recebimento por canais.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector - Hidden on Inadimplência */}
          {activeTab !== "inadimplencia" && (
            <form onSubmit={handleAplicarFiltros} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-8 w-34 border-none bg-transparent focus-visible:ring-0 p-1 text-xs"
                />
              </div>
              <span className="text-slate-400 text-xs">até</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-8 w-34 border-none bg-transparent focus-visible:ring-0 p-1 text-xs"
              />
              <Button type="submit" size="sm" variant="ghost" className="h-8 gap-1 hover:bg-slate-100 rounded-lg text-slate-700 text-xs">
                <Filter className="h-3.5 w-3.5" />
                Aplicar
              </Button>
            </form>
          )}

          <Button 
            onClick={handleExport} 
            size="sm" 
            variant="outline" 
            className="h-10 gap-1.5 border-slate-200 shadow-sm rounded-xl text-slate-700 font-medium hover:bg-slate-50 bg-white"
            disabled={
              (activeTab === "dre" && loadingDre) || 
              (activeTab === "inadimplencia" && loadingInadimplencia) ||
              (activeTab === "formas-pagamento" && loadingFormas)
            }
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dre" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
          <TabsTrigger value="dre" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            DRE
          </TabsTrigger>
          <TabsTrigger value="inadimplencia" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Inadimplência
          </TabsTrigger>
          <TabsTrigger value="formas-pagamento" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Formas de Pagamento
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: DRE */}
        <TabsContent value="dre" className="space-y-6 outline-none">
          {loadingDre ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : !dreData ? (
            <div className="text-center py-12 text-slate-500">Nenhum demonstrativo gerado.</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Receita Bruta</p>
                      <div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(dreData.receitaBruta)}</h3>
                      <p className="text-xs text-slate-400 mt-1">Contas a receber pagas no período</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Total Despesas</p>
                      <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                        <ArrowDownRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(dreData.totalDespesas)}</h3>
                      <p className="text-xs text-slate-400 mt-1">Contas a pagar pagas no período</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all ${dreData.resultado >= 0 ? "border-green-200 bg-green-50/5" : "border-red-200 bg-red-50/5"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Resultado Líquido</p>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${dreData.resultado >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                        {dreData.resultado >= 0 ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className={`text-2xl font-bold ${dreData.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(dreData.resultado)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Resultado líquido do período</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Side-by-side Tables */}
              {dreData.receitasPorFormaPagamento.length === 0 && dreData.despesasPorCategoria.length === 0 ? (
                <Card className="border-dashed border-slate-200 border-2 bg-slate-50/50 p-12 text-center rounded-2xl">
                  <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-slate-700">Sem dados financeiros no período</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2">
                    Nenhum recebimento ou pagamento foi liquidado neste período selecionado.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  {/* Receitas Table */}
                  <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-100 pb-4">
                      <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                        Receitas por Forma de Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {dreData.receitasPorFormaPagamento.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          Nenhuma receita recebida neste período.
                        </div>
                      ) : (
                        <Table className="text-slate-600">
                          <TableHeader className="bg-slate-50/30">
                            <TableRow className="border-b border-slate-200">
                              <TableHead className="py-2.5 px-4 text-xs">Forma</TableHead>
                              <TableHead className="py-2.5 px-4 text-xs text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dreData.receitasPorFormaPagamento.map((item: any, idx: number) => (
                              <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <TableCell className="py-3.5 px-4 font-semibold text-slate-800 text-sm">
                                  {traduzirFormaPagamento(item.formaPagamento)}
                                </TableCell>
                                <TableCell className="py-3.5 px-4 text-right font-medium text-green-700 text-sm">
                                  {formatCurrency(item.valor)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Despesas Table */}
                  <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-100 pb-4">
                      <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                        Despesas por Categoria
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {dreData.despesasPorCategoria.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          Nenhuma despesa paga neste período.
                        </div>
                      ) : (
                        <Table className="text-slate-600">
                          <TableHeader className="bg-slate-50/30">
                            <TableRow className="border-b border-slate-200">
                              <TableHead className="py-2.5 px-4 text-xs">Categoria</TableHead>
                              <TableHead className="py-2.5 px-4 text-xs text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dreData.despesasPorCategoria.map((item: any, idx: number) => (
                              <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <TableCell className="py-3.5 px-4 font-semibold text-slate-800 text-sm">
                                  {item.categoria}
                                </TableCell>
                                <TableCell className="py-3.5 px-4 text-right font-medium text-red-700 text-sm">
                                  {formatCurrency(item.valor)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab Content: Inadimplência */}
        <TabsContent value="inadimplencia" className="space-y-6 outline-none">
          {loadingInadimplencia ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Clientes Inadimplentes</p>
                      <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatNumber(totalInadimplentes)} clientes</h3>
                      <p className="text-xs text-slate-400 mt-1">Com títulos vencidos no ERP</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Valor Total em Aberto</p>
                      <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-red-700">{formatCurrency(valorTotalInadimplente)}</h3>
                      <p className="text-xs text-slate-400 mt-1">Saldo pendente em atraso acumulado</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 pb-5 flex flex-row items-center justify-between space-y-0 flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">Carteira de Clientes Inadimplentes</CardTitle>
                    <CardDescription className="text-xs text-slate-400 mt-1">
                      Clientes com faturamentos e contas a receber vencidos, ordenados pelo valor total pendente.
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={carregarInadimplencia} 
                    variant="outline" 
                    size="sm" 
                    className="h-9 gap-1.5 border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 bg-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Atualizar
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {inadimplenciaData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Nenhum cliente inadimplente encontrado no sistema.
                    </div>
                  ) : (
                    <Table className="text-slate-700">
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Razão Social</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">CNPJ</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Qtd Contas</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Conta mais Antiga</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Dias em Atraso</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500 text-right">Total em Aberto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inadimplenciaData.map((p) => {
                          let badgeStyle = "bg-slate-100 text-slate-700 hover:bg-slate-100 border-none font-semibold text-[10px] px-2 py-0.5 rounded";
                          let badgeText = "Recente";
                          
                          if (p.diasEmAtraso > 90) {
                            badgeStyle = "bg-red-100 text-red-700 hover:bg-red-100 border-none font-semibold text-[10px] px-2 py-0.5 rounded";
                            badgeText = "Crítico";
                          } else if (p.diasEmAtraso > 30) {
                            badgeStyle = "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-semibold text-[10px] px-2 py-0.5 rounded";
                            badgeText = "Atenção";
                          }

                          return (
                            <TableRow key={p.clienteId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <TableCell className="py-3.5 px-4 font-semibold text-slate-900 text-sm">
                                {p.razaoSocial}
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-500 text-sm">
                                {p.cnpjCpf || "—"}
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-600 text-sm">
                                {p.qtdContas}
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-600 text-sm">
                                {p.contaMaisAntiga ? new Date(p.contaMaisAntiga).toLocaleDateString("pt-BR") : "—"}
                              </TableCell>
                              <TableCell className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-900 font-medium text-sm">{p.diasEmAtraso} dias</span>
                                  <Badge className={badgeStyle}>{badgeText}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-right font-bold text-red-600 text-sm">
                                {formatCurrency(p.totalEmAberto)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab Content: Formas de Pagamento */}
        <TabsContent value="formas-pagamento" className="space-y-6 outline-none">
          {loadingFormas ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : !formasData ? (
            <div className="text-center py-12 text-slate-500">Sem dados de pagamento.</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-1">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Total Recebido no Período</p>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <PieChart className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(formasData.totalRecebido)}</h3>
                      <p className="text-xs text-slate-400 mt-1">Baixas reais de recebimento no caixa</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <CardTitle className="text-lg font-semibold text-slate-900">Recebimentos por Canal de Pagamento</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Breakdown percentual e quantitativo do faturamento real liquidado por meio de pagamentos no período.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {formasData.formas.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Nenhum recebimento registrado no período.
                    </div>
                  ) : (
                    <Table className="text-slate-700">
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Forma de Pagamento</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Valor</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Qtd Transações</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500 w-[240px]">% do Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formasData.formas.map((item: any, idx: number) => (
                          <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="py-3.5 px-4 font-semibold text-slate-900 text-sm">
                              {traduzirFormaPagamento(item.formaPagamento)}
                            </TableCell>
                            <TableCell className="py-3.5 px-4 font-semibold text-slate-800 text-sm">
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell className="py-3.5 px-4 text-slate-600 text-sm">
                              {formatNumber(item.qtdTransacoes)}
                            </TableCell>
                            <TableCell className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <span className="text-slate-900 font-semibold text-xs w-10">{item.percentual}%</span>
                                <Progress value={item.percentual} className="h-2 w-28 bg-slate-100" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
