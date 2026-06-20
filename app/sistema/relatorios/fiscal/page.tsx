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
  FileText,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Percent
} from "lucide-react";



// Helper to translate document status to CSS badge classes
function getStatusBadgeClass(status: string) {
  switch (status) {
    case "AUTORIZADA":
      return "bg-green-100 text-green-700 hover:bg-green-100 border-none font-semibold text-xs px-2 py-0.5 rounded";
    case "CANCELADA":
      return "bg-red-100 text-red-700 hover:bg-red-100 border-none font-semibold text-xs px-2 py-0.5 rounded";
    case "REJEITADA":
      return "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-semibold text-xs px-2 py-0.5 rounded";
    case "PENDENTE":
    default:
      return "bg-slate-100 text-slate-700 hover:bg-slate-100 border-none font-semibold text-xs px-2 py-0.5 rounded";
  }
}

export default function RelatorioFiscalPage() {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeTab, setActiveTab] = useState("documentos");
  const [empresaFiscalId, setEmpresaFiscalId] = useState("");
  const [empresas, setEmpresas] = useState<any[]>([]);

  // Independent loading states per tab
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // States for API data
  const [docsData, setDocsData] = useState<any>(null);
  const [pedidosData, setPedidosData] = useState<any>(null);

  // Fetch list of companies for Select filter
  const carregarEmpresas = async () => {
    try {
      const res = await fetch("/api/fiscal/empresas");
      if (res.ok) {
        const data = await res.json();
        setEmpresas(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erro ao carregar empresas fiscais", e);
    }
  };

  const carregarDocumentos = async (inicio: string, fim: string, empresaId: string) => {
    setLoadingDocs(true);
    try {
      const query = `?dataInicio=${inicio}&dataFim=${fim}${empresaId ? `&empresaFiscalId=${empresaId}` : ""}`;
      const res = await fetch(`/api/relatorios/documentos-fiscais${query}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDocsData(d);
    } catch {
      toast.error("Erro ao carregar documentos fiscais");
    } finally {
      setLoadingDocs(false);
    }
  };

  const carregarPedidos = async (inicio: string, fim: string) => {
    setLoadingPedidos(true);
    try {
      const res = await fetch(`/api/relatorios/pedidos-tipo?dataInicio=${inicio}&dataFim=${fim}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPedidosData(d);
    } catch {
      toast.error("Erro ao carregar pedidos por tipo");
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    carregarEmpresas();
    carregarDocumentos(dataInicio, dataFim, empresaFiscalId);
    carregarPedidos(dataInicio, dataFim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAplicarFiltros = (e: React.FormEvent) => {
    e.preventDefault();
    if (dataInicio > dataFim) {
      toast.error("A data de início não pode ser maior que a data de fim.");
      return;
    }
    if (activeTab === "documentos") {
      carregarDocumentos(dataInicio, dataFim, empresaFiscalId);
    } else if (activeTab === "pedidos-tipo") {
      carregarPedidos(dataInicio, dataFim);
    }
  };

  const handleExport = () => {
    if (activeTab === "documentos") {
      if (!docsData || !docsData.documentos) return;
      const headers = ["Tipo", "Número", "Status", "Data Emissão", "Empresa", "Cliente", "Pedido", "Valor Total (R$)"];
      const rows = docsData.documentos.map((d: any) => [
        d.tipo === "NFE_SAIDA" ? "NF-e Saída" : "NFS-e",
        d.numero,
        d.status,
        new Date(d.dataEmissao).toLocaleDateString("pt-BR"),
        d.empresa,
        d.cliente,
        d.pedidoNumero,
        d.valorTotal
      ]);
      exportToXLSX(`relatorio_documentos_fiscais_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "Documentos Fiscais"
      });
    } else if (activeTab === "pedidos-tipo") {
      if (!pedidosData) return;
      const headers = ["Tipo do Pedido", "Quantidade", "Valor Total (R$)", "Percentual (%)"];
      const rows = [
        ["Venda Normal", pedidosData.normal.qtd, pedidosData.normal.valorTotal, `${pedidosData.normal.percentual}%`],
        ["Uso Interno", pedidosData.interno.qtd, pedidosData.interno.valorTotal, `${pedidosData.interno.percentual}%`],
        ["Total", pedidosData.total.qtd, pedidosData.total.valorTotal, "100%"]
      ];
      exportToXLSX(`relatorio_pedidos_tipo_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "Pedidos por Tipo",
        totalRowIndexes: [2]
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

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Relatórios</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 font-medium">Fiscal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 text-slate-900">Relatório Fiscal</h1>
          <p className="text-muted-foreground text-sm">
            Auditoria e acompanhamento de emissão de notas fiscais de saída e breakdown de pedidos.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleAplicarFiltros} className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
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
            {activeTab === "documentos" && (
              <>
                <span className="text-slate-300 w-[1px] h-4 hidden sm:inline"></span>
                <select
                  value={empresaFiscalId}
                  onChange={(e) => setEmpresaFiscalId(e.target.value)}
                  className="h-8 border-none bg-transparent focus-visible:ring-0 text-xs text-slate-700 outline-none pr-6 cursor-pointer"
                >
                  <option value="">Todas as Empresas</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nomeFantasia || emp.razaoSocial}
                    </option>
                  ))}
                </select>
              </>
            )}
            <Button type="submit" size="sm" variant="ghost" className="h-8 gap-1 hover:bg-slate-100 rounded-lg text-slate-700 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Aplicar
            </Button>
          </form>

          <Button 
            onClick={handleExport} 
            size="sm" 
            variant="outline" 
            className="h-10 gap-1.5 border-slate-200 shadow-sm rounded-xl text-slate-700 font-medium hover:bg-slate-50 bg-white"
            disabled={
              (activeTab === "documentos" && loadingDocs) || 
              (activeTab === "pedidos-tipo" && loadingPedidos)
            }
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documentos" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
          <TabsTrigger value="documentos" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Documentos Fiscais
          </TabsTrigger>
          <TabsTrigger value="pedidos-tipo" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Pedidos por Tipo
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Documentos Fiscais */}
        <TabsContent value="documentos" className="space-y-6 outline-none">
          {loadingDocs ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : !docsData ? (
            <div className="text-center py-12 text-slate-500">Nenhum documento gerado no período.</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500">Total Documentos</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{formatNumber(docsData.resumo.totalDocumentos)}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Emitidos no período</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500">Total Autorizados</p>
                    <h3 className="text-xl font-bold text-green-600 mt-2">{formatNumber(docsData.resumo.totalAutorizados)}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Validados com sucesso</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500">Total Rejeitados</p>
                    <h3 className="text-xl font-bold text-amber-600 mt-2">{formatNumber(docsData.resumo.totalRejeitados)}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Com erros tributários/cadastrais</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500">Total Cancelados</p>
                    <h3 className="text-xl font-bold text-red-600 mt-2">{formatNumber(docsData.resumo.totalCancelados)}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Baixados voluntariamente</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500">Valor Total</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{formatCurrency(docsData.resumo.valorTotal)}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Acumulado faturado fiscal</p>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <CardTitle className="text-lg font-semibold text-slate-900">Listagem de Documentos Fiscais</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Detalhe fiscal das notas eletrônicas (NF-e/NFS-e) geradas no intervalo selecionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {docsData.documentos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <FileText className="h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-600">Nenhum documento fiscal encontrado.</p>
                      <p className="text-xs text-slate-400 mt-1">Tente selecionar outro intervalo ou empresa.</p>
                    </div>
                  ) : (
                    <Table className="text-slate-700">
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Tipo</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Número</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Status</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Data Emissão</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Empresa</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Cliente</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Pedido</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500 text-right">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {docsData.documentos.map((d: any) => (
                          <TableRow key={d.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="py-3 px-4 text-xs font-semibold text-slate-900">{d.tipo === "NFE_SAIDA" ? "NF-e Saída" : "NFS-e"}</TableCell>
                            <TableCell className="py-3 px-4 text-xs text-slate-600">{d.numero}</TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge className={getStatusBadgeClass(d.status)}>{d.status}</Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-xs text-slate-500">{new Date(d.dataEmissao).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="py-3 px-4 text-xs text-slate-600 font-medium">{d.empresa}</TableCell>
                            <TableCell className="py-3 px-4 text-xs text-slate-600">{d.cliente}</TableCell>
                            <TableCell className="py-3 px-4 text-xs font-medium text-slate-800">{d.pedidoNumero}</TableCell>
                            <TableCell className="py-3 px-4 text-right text-xs font-bold text-slate-900">{formatCurrency(d.valorTotal)}</TableCell>
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

        {/* Tab Content: Pedidos por Tipo */}
        <TabsContent value="pedidos-tipo" className="space-y-6 outline-none">
          {loadingPedidos ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : !pedidosData ? (
            <div className="text-center py-12 text-slate-500">Sem dados de pedidos no período.</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Total de Pedidos Aprovados</p>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatNumber(pedidosData.total.qtd)} pedidos</h3>
                      <p className="text-xs text-slate-400 mt-1">Acumulado no intervalo de datas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Valor Total dos Pedidos</p>
                      <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(pedidosData.total.valorTotal)}</h3>
                      <p className="text-xs text-slate-400 mt-1">Valor faturado comercial correspondente</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <CardTitle className="text-lg font-semibold text-slate-900">Detalhamento por Tipo de Operação</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Breakdown comparativo entre pedidos comerciais normais de venda e pedidos internos de movimentação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {pedidosData.total.qtd === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Nenhum pedido faturado ou aprovado no período selecionado.
                    </div>
                  ) : (
                    <Table className="text-slate-700">
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Tipo de Pedido</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Quantidade</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Valor Total</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500 w-[240px]">% do Total (em Qtd)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Normal Row */}
                        <TableRow className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-3.5 px-4 font-semibold text-slate-900 text-sm">Comercial (Normal)</TableCell>
                          <TableCell className="py-3.5 px-4 text-slate-600 text-sm">{formatNumber(pedidosData.normal.qtd)}</TableCell>
                          <TableCell className="py-3.5 px-4 font-medium text-slate-800 text-sm">{formatCurrency(pedidosData.normal.valorTotal)}</TableCell>
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-900 font-semibold text-xs w-10">{pedidosData.normal.percentual}%</span>
                              <Progress value={pedidosData.normal.percentual} className="h-2 w-28 bg-slate-100" />
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Interno Row */}
                        <TableRow className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-3.5 px-4 font-semibold text-slate-900 text-sm">Uso Interno</TableCell>
                          <TableCell className="py-3.5 px-4 text-slate-600 text-sm">{formatNumber(pedidosData.interno.qtd)}</TableCell>
                          <TableCell className="py-3.5 px-4 font-medium text-slate-800 text-sm">{formatCurrency(pedidosData.interno.valorTotal)}</TableCell>
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-900 font-semibold text-xs w-10">{pedidosData.interno.percentual}%</span>
                              <Progress value={pedidosData.interno.percentual} className="h-2 w-28 bg-slate-100" />
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Total Row */}
                        <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 font-semibold">
                          <TableCell className="py-3.5 px-4 text-slate-900 text-sm">Total Geral</TableCell>
                          <TableCell className="py-3.5 px-4 text-slate-800 text-sm">{formatNumber(pedidosData.total.qtd)}</TableCell>
                          <TableCell className="py-3.5 px-4 text-slate-900 text-sm">{formatCurrency(pedidosData.total.valorTotal)}</TableCell>
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-900 font-semibold text-xs w-10">100%</span>
                              <Progress value={100} className="h-2 w-28 bg-slate-100" />
                            </div>
                          </TableCell>
                        </TableRow>
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
