"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  TrendingUp, 
  ShoppingCart, 
  AlertCircle, 
  Package, 
  DollarSign, 
  Boxes, 
  BarChart3,
  Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardData = {
  skusAtivos: number;
  itensEstoque: number;
  valorEstoque: number;
  proximosVencer: number;
  vencidos: number;
  faturamentoMes: number;
  qtdVendasMes: number;
  pedidosAbertos: number;
  aguardandoEstoque: number;
  aguardandoFinanceiro: number;
  aguardandoCliente: number;
  autorizadosSeparacao: number;
  margemMedia: number;
  topProdutos: { descricao: string; qtdVendida: number; valorTotal: number }[];
  vendasPorCliente: { razaoSocial: string; totalVendas: number; qtdPedidos: number }[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const d: DashboardData = {
    skusAtivos: 0, itensEstoque: 0, valorEstoque: 0, proximosVencer: 0,
    vencidos: 0, faturamentoMes: 0, qtdVendasMes: 0, pedidosAbertos: 0,
    aguardandoEstoque: 0, aguardandoFinanceiro: 0, aguardandoCliente: 0, autorizadosSeparacao: 0,
    margemMedia: 0, topProdutos: [], vendasPorCliente: [],
    ...(data ?? {}),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
        <p className="text-muted-foreground">Bem-vindo ao centro de comando do MedFlow ERP.</p>
      </div>

      {/* INDICADORES PRINCIPAIS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(d.faturamentoMes ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium">+{d.qtdVendasMes}</span> vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos em Aberto</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.pedidosAbertos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Estoque {d.aguardandoEstoque} / Financeiro {d.aguardandoFinanceiro}
            </p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-slate-200 ${d.proximosVencer > 0 ? "border-l-4 border-l-amber-500" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximos do Vencimento</CardTitle>
            <AlertCircle className={`h-4 w-4 ${d.proximosVencer > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${d.proximosVencer > 0 ? "text-amber-600" : ""}`}>{d.proximosVencer}</div>
            <p className="text-xs text-muted-foreground mt-1">Vencendo nos próximos 30 dias</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SKUs Ativos</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.skusAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos em linha ativa</p>
          </CardContent>
        </Card>
      </div>

      {/* SEGUNDA LINHA - ESTOQUE E FINANCEIRO */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Valor em Estoque</p>
               <p className="text-lg font-bold">R$ {(d.valorEstoque ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
              <Boxes className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total de Itens</p>
               <p className="text-lg font-bold">{(d.itensEstoque ?? 0).toLocaleString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Margem Média</p>
              <p className="text-lg font-bold">{d.margemMedia}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-slate-50/50 ${d.vencidos > 0 ? "bg-red-50" : ""}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${d.vencidos > 0 ? "bg-red-200" : "bg-slate-200"}`}>
              <Calendar className={`h-5 w-5 ${d.vencidos > 0 ? "text-red-700" : "text-slate-600"}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Produtos Vencidos</p>
              <p className={`text-lg font-bold ${d.vencidos > 0 ? "text-red-700" : ""}`}>{d.vencidos}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABELAS DE ANÁLISE */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Top Produtos por Faturamento
            </CardTitle>
            <CardDescription>Produtos com maior volume financeiro no mês atual.</CardDescription>
          </CardHeader>
          <CardContent>
            {d.topProdutos.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm italic">Dados insuficientes para gerar ranking.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.topProdutos.map((p, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-700">{p.descricao}</TableCell>
                      <TableCell className="text-right">{p.qtdVendida}</TableCell>
                      <TableCell className="text-right font-bold">
                        R$ {(p.valorTotal ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" /> Vendas por Cliente
            </CardTitle>
            <CardDescription>Clientes com maior volume de pedidos.</CardDescription>
          </CardHeader>
          <CardContent>
            {d.vendasPorCliente.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm italic">Dados insuficientes para gerar ranking.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Total Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.vendasPorCliente.map((c, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-700">{c.razaoSocial}</TableCell>
                      <TableCell className="text-right">{c.qtdPedidos}</TableCell>
                      <TableCell className="text-right font-bold">
                        R$ {(c.totalVendas ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
