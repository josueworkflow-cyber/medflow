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
import { 
  Download, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award
} from "lucide-react";



export default function RelatorioEstoquePage() {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeTab, setActiveTab] = useState("curva-abc");
  
  // Independent loading states per tab
  const [loadingAbc, setLoadingAbc] = useState(true);
  const [loadingPosicao, setLoadingPosicao] = useState(true);
  const [loadingRastreio, setLoadingRastreio] = useState(false);

  // States for API data
  const [abcData, setAbcData] = useState<any[]>([]);
  const [posicaoData, setPosicaoData] = useState<any[]>([]);
  const [loteBusca, setLoteBusca] = useState("");
  const [loteData, setLoteData] = useState<any>(null);
  const [rastreioStatus, setRastreioStatus] = useState<"idle" | "error" | "success">("idle");

  const carregarAbc = async (inicio: string, fim: string) => {
    setLoadingAbc(true);
    try {
      const res = await fetch(`/api/relatorios/curva-abc?dataInicio=${inicio}&dataFim=${fim}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setAbcData(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Erro ao carregar relatório Curva ABC");
    } finally {
      setLoadingAbc(false);
    }
  };

  const carregarPosicao = async () => {
    setLoadingPosicao(true);
    try {
      const res = await fetch("/api/relatorios/posicao-estoque");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPosicaoData(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Erro ao carregar posição de estoque");
    } finally {
      setLoadingPosicao(false);
    }
  };

  const buscarLote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loteBusca.trim()) return;

    setLoadingRastreio(true);
    setLoteData(null);
    setRastreioStatus("idle");
    try {
      const res = await fetch(`/api/relatorios/rastreabilidade-lote?numeroLote=${encodeURIComponent(loteBusca.trim())}`);
      if (res.status === 404) {
        setRastreioStatus("error");
        toast.error("Lote não encontrado");
        return;
      }
      if (!res.ok) throw new Error();
      const d = await res.json();
      setLoteData(d);
      setRastreioStatus("success");
    } catch {
      toast.error("Erro ao rastrear lote");
    } finally {
      setLoadingRastreio(false);
    }
  };

  useEffect(() => {
    carregarAbc(dataInicio, dataFim);
    carregarPosicao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAplicarFiltros = (e: React.FormEvent) => {
    e.preventDefault();
    if (dataInicio > dataFim) {
      toast.error("A data de início não pode ser maior que a data de fim.");
      return;
    }
    carregarAbc(dataInicio, dataFim);
  };

  const handleExport = () => {
    if (activeTab === "curva-abc") {
      const headers = ["Produto", "Categoria", "Total Saídas", "% Individual", "% Acumulado", "Classificação"];
      const rows = abcData.map((p: any) => [
        p.descricao,
        p.categoria || "—",
        p.totalSaidas,
        `${p.percentualIndividual}%`,
        `${p.percentualAcumulado}%`,
        p.classificacao
      ]);
      exportToXLSX(`relatorio_curva_abc_${dataInicio}_a_${dataFim}.xlsx`, headers, rows, {
        sheetName: "Curva ABC"
      });
    } else if (activeTab === "posicao-estoque") {
      const headers = ["Código", "Produto", "Categoria", "Disponível", "Reservado", "Bloqueado", "Total", "Mínimo", "Custo Unit.", "Valor Total"];
      const rows = posicaoData.map((p: any) => [
        p.codigoInterno || "-",
        p.descricao,
        p.categoria || "—",
        p.disponivel,
        p.reservado,
        p.bloqueado,
        p.total,
        p.estoqueMinimo,
        p.custoUnitario,
        p.valorTotalEstoque
      ]);
      exportToXLSX(`relatorio_posicao_estoque.xlsx`, headers, rows, {
        sheetName: "Posição de Estoque"
      });
    } else if (activeTab === "rastreabilidade") {
      if (!loteData) {
        toast.error("Nenhum lote carregado para exportação.");
        return;
      }
      const headers = ["Tipo Movimentação", "Data", "Quantidade", "Origem / Pedido", "Cliente / Fornecedor"];
      const rows: any[][] = [];
      
      loteData.entradas.forEach((ent: any) => {
        rows.push([
          "ENTRADA",
          new Date(ent.data).toLocaleDateString("pt-BR"),
          ent.quantidade,
          ent.origem,
          loteData.lote.fornecedor
        ]);
      });

      loteData.saidas.forEach((sai: any) => {
        rows.push([
          "SAIDA",
          new Date(sai.data).toLocaleDateString("pt-BR"),
          sai.quantidade,
          sai.pedidoNumero,
          sai.cliente
        ]);
      });

      exportToXLSX(`rastreabilidade_lote_${loteData.lote.numeroLote}.xlsx`, headers, rows, {
        sheetName: "Rastreabilidade Lote"
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

  // KPIs calculations
  const totalProdutosAbc = abcData.length;
  const classeACount = abcData.filter((p) => p.classificacao === "A").length;
  const classeBCount = abcData.filter((p) => p.classificacao === "B").length;

  const totalProdutosPosicao = posicaoData.length;
  const abaixoMinimoCount = posicaoData.filter((p) => p.abaixoMinimo).length;
  const valorTotalEstoqueSum = posicaoData.reduce((sum, p) => sum + p.valorTotalEstoque, 0);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Relatórios</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 font-medium">Estoque</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 text-slate-900">Relatório de Estoque</h1>
          <p className="text-muted-foreground text-sm">
            Inteligência operacional: curva ABC de saídas, posição de estoque valorizada e rastreabilidade de lotes.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range - Only visible in Curva ABC */}
          {activeTab === "curva-abc" && (
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
              (activeTab === "curva-abc" && loadingAbc) || 
              (activeTab === "posicao-estoque" && loadingPosicao) ||
              (activeTab === "rastreabilidade" && (!loteData || loadingRastreio))
            }
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="curva-abc" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
          <TabsTrigger value="curva-abc" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Curva ABC
          </TabsTrigger>
          <TabsTrigger value="posicao-estoque" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Posição de Estoque
          </TabsTrigger>
          <TabsTrigger value="rastreabilidade" className="rounded-lg px-4 py-2 text-sm font-medium transition-all">
            Rastreabilidade de Lote
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Curva ABC */}
        <TabsContent value="curva-abc" className="space-y-6 outline-none">
          {loadingAbc ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Total de Produtos</p>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Package className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatNumber(totalProdutosAbc)} SKUs</h3>
                      <p className="text-xs text-slate-400 mt-1">Com saídas no período</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Produtos Classe A</p>
                      <div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatNumber(classeACount)} SKUs</h3>
                      <p className="text-xs text-slate-400 mt-1">Até 80% do volume total de saídas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Produtos Classe B</p>
                      <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Award className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatNumber(classeBCount)} SKUs</h3>
                      <p className="text-xs text-slate-400 mt-1">Entre 80% e 95% do volume de saídas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <CardTitle className="text-lg font-semibold text-slate-900">Classificação de Produtos</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Produtos ordenados descendentemente pelo volume absoluto de saídas no período de filtros aplicado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {abcData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <Package className="h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-600">Não há saídas registradas para este período.</p>
                      <p className="text-xs text-slate-400 mt-1">Tente selecionar outro intervalo de datas.</p>
                    </div>
                  ) : (
                    <Table className="text-slate-700">
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Produto</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Categoria</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Total Saídas</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">% Individual</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">% Acumulado</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Classificação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abcData.map((p) => {
                          let badgeColor = "bg-slate-100 text-slate-700 hover:bg-slate-100 border-none font-semibold text-xs px-2.5 py-0.5 rounded";
                          if (p.classificacao === "A") {
                            badgeColor = "bg-green-100 text-green-700 hover:bg-green-100 border-none font-semibold text-xs px-2.5 py-0.5 rounded";
                          } else if (p.classificacao === "B") {
                            badgeColor = "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-semibold text-xs px-2.5 py-0.5 rounded";
                          }

                          return (
                            <TableRow key={p.produtoId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <TableCell className="py-3 px-4 font-semibold text-slate-900 text-sm">{p.descricao}</TableCell>
                              <TableCell className="py-3 px-4 text-slate-500 text-sm">{p.categoria}</TableCell>
                              <TableCell className="py-3 px-4 font-semibold text-slate-800 text-sm">{formatNumber(p.totalSaidas)}</TableCell>
                              <TableCell className="py-3 px-4 text-slate-600 text-sm">{p.percentualIndividual}%</TableCell>
                              <TableCell className="py-3 px-4 text-slate-600 text-sm">{p.percentualAcumulado}%</TableCell>
                              <TableCell className="py-3 px-4">
                                <Badge className={badgeColor}>{p.classificacao}</Badge>
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

        {/* Tab Content: Posição de Estoque */}
        <TabsContent value="posicao-estoque" className="space-y-6 outline-none">
          {loadingPosicao ? (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Total de Produtos</p>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Package className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">{formatNumber(totalProdutosPosicao)} produtos</h3>
                      <p className="text-xs text-slate-400 mt-1">Registrados e ativos</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white ${abaixoMinimoCount > 0 ? "border-red-200 bg-red-50/10" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Produtos Abaixo do Mínimo</p>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${abaixoMinimoCount > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className={`text-2xl font-bold ${abaixoMinimoCount > 0 ? "text-red-700" : "text-slate-900"}`}>
                        {formatNumber(abaixoMinimoCount)} produtos
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Ação recomendada: comprar</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">Valor Total em Estoque</p>
                      <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {formatCurrency(valorTotalEstoqueSum)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Valorizado a preço de custo</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 pb-5 flex flex-row items-center justify-between space-y-0 flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">Fotografia do Estoque Físico/Financeiro</CardTitle>
                    <CardDescription className="text-xs text-slate-400 mt-1">
                      Saldo atual de estoque total, disponível, reservado e bloqueado, com destaque para produtos abaixo do limite mínimo.
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={carregarPosicao} 
                    variant="outline" 
                    size="sm" 
                    className="h-9 gap-1.5 border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 bg-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Atualizar
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {posicaoData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Nenhum produto cadastrado com estoque ou mínimo configurado.
                    </div>
                  ) : (
                    <Table className="text-slate-700">
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Código</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Produto</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Categoria</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Disponível</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Reservado</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Bloqueado</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Total</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Mínimo</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Custo Unit.</TableHead>
                          <TableHead className="py-3.5 px-4 font-semibold text-xs text-slate-500">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posicaoData.map((p) => {
                          const rowClass = p.abaixoMinimo 
                            ? "bg-red-50 hover:bg-red-100/70 border-b border-slate-100 transition-colors" 
                            : "border-b border-slate-100 hover:bg-slate-50/50 transition-colors";

                          return (
                            <TableRow key={p.produtoId} className={rowClass}>
                              <TableCell className="py-3.5 px-4 font-medium text-slate-500 text-xs">{p.codigoInterno}</TableCell>
                              <TableCell className="py-3.5 px-4">
                                <div>
                                  <p className="font-semibold text-slate-900 text-sm">{p.descricao}</p>
                                  {p.abaixoMinimo && (
                                    <span className="text-[10px] font-semibold text-red-600 flex items-center gap-1 mt-0.5">
                                      ⚠️ Crítico: abaixo do estoque mínimo
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-500 text-sm">{p.categoria}</TableCell>
                              <TableCell className="py-3.5 px-4 font-medium text-slate-800 text-sm">{formatNumber(p.disponivel)}</TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-500 text-sm">{formatNumber(p.reservado)}</TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-500 text-sm">{formatNumber(p.bloqueado)}</TableCell>
                              <TableCell className="py-3.5 px-4 font-semibold text-slate-800 text-sm">{formatNumber(p.total)}</TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-600 text-sm">{formatNumber(p.estoqueMinimo)}</TableCell>
                              <TableCell className="py-3.5 px-4 text-slate-500 text-sm">
                                {formatCurrency(p.custoUnitario)}
                              </TableCell>
                              <TableCell className="py-3.5 px-4 font-semibold text-slate-900 text-sm">
                                {formatCurrency(p.valorTotalEstoque)}
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

        {/* Tab Content: Rastreabilidade de Lote */}
        <TabsContent value="rastreabilidade" className="space-y-6 outline-none">
          {/* Search Form */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-6">
              <form onSubmit={buscarLote} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3 top-3" />
                  <Input 
                    type="text"
                    value={loteBusca}
                    onChange={(e) => setLoteBusca(e.target.value)}
                    placeholder="Digite o número do lote para rastrear (ex: LOT-2025-001)..."
                    className="pl-10 h-10 border-slate-200 rounded-xl text-sm focus-visible:ring-blue-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loadingRastreio || !loteBusca.trim()}
                  className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm gap-1.5"
                >
                  {loadingRastreio ? "Buscando..." : "Buscar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {loadingRastreio && (
            <div className="text-center py-12 text-slate-500">Carregando dados...</div>
          )}

          {/* Idle State */}
          {!loadingRastreio && rastreioStatus === "idle" && (
            <Card className="border-dashed border-slate-200 border-2 bg-slate-50/50 p-12 text-center rounded-2xl">
              <Search className="h-10 w-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-700">Digite o número do lote para rastrear</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2">
                Insira o código do lote no campo de busca para visualizar o ciclo de vida completo de compras e saídas.
              </p>
            </Card>
          )}

          {/* Error State: 404 */}
          {!loadingRastreio && rastreioStatus === "error" && (
            <Card className="border-dashed border-red-200 border-2 bg-red-50/10 p-12 text-center rounded-2xl">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-red-700">Lote não encontrado</h3>
              <p className="text-xs text-red-500 max-w-xs mx-auto mt-2">
                Nenhum lote foi encontrado com o número digitado. Verifique os caracteres e tente novamente.
              </p>
            </Card>
          )}

          {/* Success State */}
          {!loadingRastreio && rastreioStatus === "success" && loteData && (
            <div className="space-y-6">
              {/* Lote Info Card */}
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none font-semibold text-xs px-2.5 py-0.5 rounded mb-1.5">
                        Lote Ativo
                      </Badge>
                      <CardTitle className="text-xl font-bold text-slate-900">
                        Lote: {loteData.lote.numeroLote}
                      </CardTitle>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs text-slate-400">Saldo Atual</p>
                      <p className="text-2xl font-bold text-slate-900">{formatNumber(loteData.saldoAtual)} unidades</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Produto</p>
                    <p className="font-semibold text-slate-800 text-sm mt-1">{loteData.lote.produto}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Fornecedor de Origem</p>
                    <p className="font-semibold text-slate-800 text-sm mt-1">{loteData.lote.fornecedor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Data de Validade</p>
                    <p className="font-semibold text-slate-800 text-sm mt-1">
                      {loteData.lote.validade 
                        ? new Date(loteData.lote.validade).toLocaleDateString("pt-BR") 
                        : "Não informada"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Tables */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Entradas Table */}
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                      Histórico de Entradas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loteData.entradas.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Nenhuma entrada registrada para este lote.
                      </div>
                    ) : (
                      <Table className="text-slate-600">
                        <TableHeader className="bg-slate-50/30">
                          <TableRow className="border-b border-slate-200">
                            <TableHead className="py-2.5 px-4 text-xs">Data</TableHead>
                            <TableHead className="py-2.5 px-4 text-xs">Quantidade</TableHead>
                            <TableHead className="py-2.5 px-4 text-xs">Origem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loteData.entradas.map((ent: any, idx: number) => (
                            <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="py-3 px-4 text-xs">
                                {new Date(ent.data).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="py-3 px-4 font-semibold text-green-700 text-xs">
                                +{formatNumber(ent.quantidade)}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-xs text-slate-500">{ent.origem}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Saídas Table */}
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                      <ArrowDownRight className="h-5 w-5 text-red-500" />
                      Histórico de Consumos (Saídas)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loteData.saidas.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Nenhuma saída registrada para este lote.
                      </div>
                    ) : (
                      <Table className="text-slate-600">
                        <TableHeader className="bg-slate-50/30">
                          <TableRow className="border-b border-slate-200">
                            <TableHead className="py-2.5 px-4 text-xs">Data</TableHead>
                            <TableHead className="py-2.5 px-4 text-xs">Quantidade</TableHead>
                            <TableHead className="py-2.5 px-4 text-xs">Pedido</TableHead>
                            <TableHead className="py-2.5 px-4 text-xs">Cliente</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loteData.saidas.map((sai: any, idx: number) => (
                            <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="py-3 px-4 text-xs">
                                {new Date(sai.data).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="py-3 px-4 font-semibold text-red-600 text-xs">
                                -{formatNumber(sai.quantidade)}
                              </TableCell>
                              <TableCell className="py-3 px-4 font-medium text-slate-800 text-xs">{sai.pedidoNumero}</TableCell>
                              <TableCell className="py-3 px-4 text-xs text-slate-500">{sai.cliente}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
