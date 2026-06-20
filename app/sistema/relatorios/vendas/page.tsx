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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Download, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Award, 
  Info,
  ChevronRight,
  Filter
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip 
} from "recharts";



export default function RelatorioVendasPage() {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeTab, setActiveTab] = useState("periodo");
  const [loadingPeriodo, setLoadingPeriodo] = useState(true);
  const [loadingVendedor, setLoadingVendedor] = useState(true);
  const [loadingCliente, setLoadingCliente] = useState(true);

  // States for API data
  const [periodoData, setPeriodoData] = useState<any>(null);
  const [vendedorData, setVendedorData] = useState<any[]>([]);
  const [clienteData, setClienteData] = useState<any[]>([]);

  const carregarRelatorios = async (inicio: string, fim: string) => {
    setLoadingPeriodo(true);
    setLoadingVendedor(true);
    setLoadingCliente(true);

    const query = `?dataInicio=${inicio}&dataFim=${fim}`;

    Promise.allSettled([
      fetch(`/api/relatorios/vendas-periodo${query}`).then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(`/api/relatorios/vendas-vendedor${query}`).then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(`/api/relatorios/vendas-cliente${query}`).then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    ]).then(([resPeriodo, resVendedor, resCliente]) => {
      // Periodo
      if (resPeriodo.status === "fulfilled") {
        setPeriodoData(resPeriodo.value);
      } else {
        console.error("Erro ao carregar vendas-periodo");
      }
      setLoadingPeriodo(false);

      // Vendedor
      if (resVendedor.status === "fulfilled") {
        setVendedorData(Array.isArray(resVendedor.value) ? resVendedor.value : []);
      } else {
        console.error("Erro ao carregar vendas-vendedor");
      }
      setLoadingVendedor(false);

      // Cliente
      if (resCliente.status === "fulfilled") {
        setClienteData(Array.isArray(resCliente.value) ? resCliente.value : []);
      } else {
        console.error("Erro ao carregar vendas-cliente");
      }
      setLoadingCliente(false);
    });
  };

  useEffect(() => {
    carregarRelatorios(dataInicio, dataFim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAplicar = (e: React.FormEvent) => {
    e.preventDefault();
    if (dataInicio > dataFim) {
      toast.error("A data de início não pode ser maior que a data de fim.");
      return;
    }
    carregarRelatorios(dataInicio, dataFim);
  };

  const handleExport = () => {
    if (activeTab === "periodo") {
      if (!periodoData || !periodoData.diario) return;
      const headers = ["Periodo/Data", "Faturamento (R$)", "Qtd Pedidos"];
      const rows = periodoData.diario.map((d: any) => [
        d.data,
        d.faturamento,
        d.qtdPedidos
      ]);
      exportToXLSX(`relatorio_vendas_periodo_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "Vendas por Período"
      });
    } else if (activeTab === "vendedor") {
      const headers = ["Vendedor", "E-mail", "Total Vendas (R$)", "Qtd Pedidos", "Comissão Gerada (R$)", "Meta Mensal (R$)", "Atingimento (%)"];
      const rows = vendedorData.map((v: any) => [
        v.nome,
        v.email || "-",
        v.totalVendas,
        v.qtdPedidos,
        v.comissaoGerada,
        v.metaMensal || 0,
        v.percentualMeta !== null ? `${v.percentualMeta}%` : "Meta não configurada"
      ]);
      exportToXLSX(`relatorio_vendas_vendedores_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "Vendas por Vendedor"
      });
    } else if (activeTab === "cliente") {
      const headers = ["Cliente", "CNPJ/CPF", "Total no Período (R$)", "Qtd Pedidos no Período", "Ticket Médio (R$)", "LTV Histórico (R$)"];
      const rows = clienteData.map((c: any) => [
        c.razaoSocial,
        c.cnpjCpf || "-",
        c.totalVendasPeriodo,
        c.qtdPedidosPeriodo,
        c.ticketMedioPeriodo,
        c.ltvHistorico
      ]);
      exportToXLSX(`relatorio_vendas_clientes_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "Vendas por Cliente"
      });
    }
  };

  const faturamentoTotal = periodoData?.resumo?.faturamentoTotal || 0;
  const qtdPedidos = periodoData?.resumo?.qtdPedidos || 0;
  const ticketMedio = periodoData?.resumo?.ticketMedio || 0;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Relatórios</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 font-medium">Vendas</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 text-slate-900">Relatório de Vendas</h1>
          <p className="text-muted-foreground text-sm">
            Análise consolidada comercial por período, vendedores e clientes compradores.
          </p>
        </div>

        {/* Filters and Export */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleAplicar} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
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

          <Button 
            onClick={handleExport} 
            size="sm" 
            variant="outline" 
            className="h-10 gap-1.5 border-slate-200 shadow-sm rounded-xl text-slate-700 font-medium hover:bg-slate-50"
            disabled={loadingPeriodo || loadingVendedor || loadingCliente}
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="periodo" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
          <TabsTrigger value="periodo" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Período
          </TabsTrigger>
          <TabsTrigger value="vendedor" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Por Vendedor
          </TabsTrigger>
          <TabsTrigger value="cliente" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Por Cliente
          </TabsTrigger>
        </TabsList>

        {/* Content: Period */}
        <TabsContent value="periodo" className="space-y-6 outline-none">
          {loadingPeriodo ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Faturamento Total</p>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">
                        R$ {faturamentoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Período selecionado</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Quantidade de Pedidos</p>
                      <div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{qtdPedidos} pedidos</h3>
                      <p className="text-xs text-slate-400 mt-1">Vendas aprovadas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Ticket Médio</p>
                      <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">
                        R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Média por faturamento</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <CardTitle className="text-lg font-semibold text-slate-900">Faturamento no Período</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Visualização histórica agrupada dinamicamente com base no intervalo de filtros aplicado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {periodoData?.diario?.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Nenhuma venda no período selecionado.
                    </div>
                  ) : (
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={periodoData?.diario || []} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="data" 
                            tickLine={false} 
                            axisLine={false} 
                            stroke="#94a3b8" 
                            fontSize={11} 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            stroke="#94a3b8" 
                            fontSize={11} 
                            tickFormatter={(v) => `R$ ${v.toLocaleString("pt-BR")}`} 
                          />
                          <ChartTooltip 
                            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]}
                          />
                          <Bar dataKey="faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Content: Sellers */}
        <TabsContent value="vendedor" className="outline-none">
          {loadingVendedor ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : (
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-5">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Award className="h-5 w-5 text-slate-400" />
                  Performance de Vendedores
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Resumo de faturamento, comissões geradas no período e cumprimento das metas comerciais.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {vendedorData.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Nenhum vendedor registrado ou com vendas no período.
                  </div>
                ) : (
                  <Table className="text-slate-700">
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Vendedor</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Total Vendas</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Qtd Pedidos</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Comissão Gerada</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Meta Mensal</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">% Meta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendedorData.map((v) => {
                        let badgeColor = "bg-slate-100 text-slate-700 hover:bg-slate-100 border-none";
                        let badgeText = "Meta não configurada";

                        if (v.percentualMeta !== null) {
                          badgeText = `${v.percentualMeta}%`;
                          if (v.percentualMeta >= 100) {
                            badgeColor = "bg-green-100 text-green-700 hover:bg-green-100 border-none font-medium";
                          } else {
                            badgeColor = "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-medium";
                          }
                        }

                        return (
                          <TableRow key={v.vendedorId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="py-3 px-4">
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{v.nome}</p>
                                <p className="text-xs text-slate-400">{v.email || "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 font-medium text-slate-900 text-sm">
                              R$ {v.totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-slate-600 text-sm">{v.qtdPedidos}</TableCell>
                            <TableCell className="py-3 px-4 font-semibold text-green-600 text-sm">
                              R$ {v.comissaoGerada.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-slate-500 text-sm">
                              {v.metaMensal ? `R$ ${v.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge className={badgeColor}>{badgeText}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Content: Clients */}
        <TabsContent value="cliente" className="outline-none">
          {loadingCliente ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : (
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-5">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-400" />
                  Vendas por Cliente
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Histórico de compras dos clientes no período selecionado e o volume acumulado histórico de cada um.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {clienteData.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Nenhum cliente com histórico de vendas no sistema.
                  </div>
                ) : (
                  <Table className="text-slate-700">
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Cliente</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">CNPJ / CPF</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Total no Período</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Qtd Pedidos</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Ticket Médio</TableHead>
                        <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 font-semibold text-xs text-slate-500 hover:text-slate-700 transition-colors border-b border-dashed border-slate-400">
                                LTV Histórico
                                <Info className="h-3 w-3 text-slate-400" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-950 text-white border-slate-800 rounded-lg p-2.5 max-w-xs shadow-md">
                                <p className="text-xs">Total histórico de compras do cliente</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clienteData.map((c) => (
                        <TableRow key={c.clienteId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-3 px-4">
                            <span className="font-semibold text-slate-900 text-sm">{c.razaoSocial}</span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-slate-500 text-sm">{c.cnpjCpf || "—"}</TableCell>
                          <TableCell className="py-3 px-4 font-medium text-slate-900 text-sm">
                            R$ {c.totalVendasPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-slate-600 text-sm">{c.qtdPedidosPeriodo}</TableCell>
                          <TableCell className="py-3 px-4 text-slate-600 text-sm">
                            R$ {c.ticketMedioPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 px-4 font-semibold text-blue-600 text-sm">
                            R$ {c.ltvHistorico.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
