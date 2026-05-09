"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Clock, ArrowUpRight, ArrowDownRight, Users,
  FileText, Receipt, Package, CheckCircle2,
} from "lucide-react";

type Resumo = {
  aReceber: number; qtdReceber: number; aPagar: number; qtdPagar: number;
  recebidoMes: number; pagoMes: number;
  saldoRealizado: number; saldoPrevisto: number;
  contasVencidas: number; vencendoHoje: number;
  preAprovacao: number; faturamento: number;
  internosAutorizar: number; clientesPendencia: number;
};

export default function FinanceiroDashboardPage() {
  const router = useRouter();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/financeiro/resumo")
      .then((r) => r.json())
      .then(setResumo)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  const r = resumo || {
    aReceber: 0, qtdReceber: 0, aPagar: 0, qtdPagar: 0,
    recebidoMes: 0, pagoMes: 0,
    saldoRealizado: 0, saldoPrevisto: 0,
    contasVencidas: 0, vencendoHoje: 0,
    preAprovacao: 0, faturamento: 0,
    internosAutorizar: 0, clientesPendencia: 0,
  };

  const cards = [
    {
      label: "Recebido no mes", value: r.recebidoMes, prefix: "R$ ",
      icon: ArrowDownRight, color: "emerald", sub: `Saldo: R$ ${r.saldoRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      route: "/sistema/financeiro/contas?tab=RECEBER",
    },
    {
      label: "A receber em aberto", value: r.aReceber, prefix: "R$ ",
      icon: TrendingUp, color: "blue", sub: `${r.qtdReceber} contas`,
      route: "/sistema/financeiro/contas?tab=RECEBER",
    },
    {
      label: "Pago no mes", value: r.pagoMes, prefix: "R$ ",
      icon: ArrowUpRight, color: "rose", sub: `${r.qtdPagar} contas a pagar`,
      route: "/sistema/financeiro/contas?tab=PAGAR",
    },
    {
      label: "A pagar em aberto", value: r.aPagar, prefix: "R$ ",
      icon: TrendingDown, color: "red", sub: `${r.qtdPagar} contas`,
      route: "/sistema/financeiro/contas?tab=PAGAR",
    },
    {
      label: "Saldo realizado", value: r.saldoRealizado, prefix: "R$ ",
      icon: DollarSign, color: r.saldoRealizado >= 0 ? "cyan" : "red",
      route: "/sistema/financeiro/fluxo-caixa",
    },
    {
      label: "Saldo previsto", value: r.saldoPrevisto, prefix: "R$ ",
      icon: TrendingUp, color: r.saldoPrevisto >= 0 ? "indigo" : "red",
      route: "/sistema/financeiro/fluxo-caixa",
    },
    {
      label: "Contas vencidas", value: r.contasVencidas, prefix: "",
      icon: AlertTriangle, color: r.contasVencidas > 0 ? "red" : "slate",
      route: "/sistema/financeiro/contas?tab=RECEBER",
    },
    {
      label: "Vencendo hoje", value: r.vencendoHoje, prefix: "",
      icon: Clock, color: r.vencendoHoje > 0 ? "amber" : "slate",
      route: "/sistema/financeiro/contas?tab=RECEBER",
    },
    {
      label: "Pre-aprovacao", value: r.preAprovacao, prefix: "",
      icon: FileText, color: r.preAprovacao > 0 ? "orange" : "slate",
      route: "/sistema/financeiro/pedidos?filtro=pre_aprovacao",
    },
    {
      label: "Aguardando faturamento", value: r.faturamento, prefix: "",
      icon: Receipt, color: r.faturamento > 0 ? "green" : "slate",
      route: "/sistema/financeiro/pedidos?filtro=faturamento",
    },
    {
      label: "Internos p/ autorizar", value: r.internosAutorizar, prefix: "",
      icon: Package, color: r.internosAutorizar > 0 ? "violet" : "slate",
      route: "/sistema/financeiro/pedidos?filtro=pendente_interno",
    },
    {
      label: "Clientes c/ pendencia", value: r.clientesPendencia, prefix: "",
      icon: Users, color: r.clientesPendencia > 0 ? "red" : "slate",
      route: "/sistema/financeiro/contas?tab=DEVEDORES",
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: "border-l-emerald-500 bg-gradient-to-br from-emerald-50/30 to-white",
    blue: "border-l-blue-500 bg-gradient-to-br from-blue-50/30 to-white",
    rose: "border-l-rose-500 bg-gradient-to-br from-rose-50/30 to-white",
    red: "border-l-red-500 bg-gradient-to-br from-red-50/30 to-white",
    cyan: "border-l-cyan-500 bg-gradient-to-br from-cyan-50/30 to-white",
    indigo: "border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white",
    amber: "border-l-amber-500 bg-gradient-to-br from-amber-50/30 to-white",
    orange: "border-l-orange-500 bg-gradient-to-br from-orange-50/30 to-white",
    green: "border-l-green-500 bg-gradient-to-br from-green-50/30 to-white",
    violet: "border-l-violet-500 bg-gradient-to-br from-violet-50/30 to-white",
    slate: "border-l-slate-300 bg-gradient-to-br from-slate-50/30 to-white",
  };

  const iconColorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    rose: "bg-rose-100 text-rose-600",
    red: "bg-red-100 text-red-600",
    cyan: "bg-cyan-100 text-cyan-600",
    indigo: "bg-indigo-100 text-indigo-600",
    amber: "bg-amber-100 text-amber-600",
    orange: "bg-orange-100 text-orange-600",
    green: "bg-green-100 text-green-600",
    violet: "bg-violet-100 text-violet-600",
    slate: "bg-slate-100 text-slate-400",
  };

  const valueColorMap: Record<string, string> = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    rose: "text-rose-700",
    red: "text-red-700",
    cyan: "text-cyan-700",
    indigo: "text-indigo-700",
    amber: "text-amber-700",
    orange: "text-orange-700",
    green: "text-green-700",
    violet: "text-violet-700",
    slate: "text-slate-400",
  };

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-xs text-slate-500 mt-0.5">Visao geral, alertas e atalhos do modulo financeiro</p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={`border-l-4 ${colorMap[card.color]} cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5`}
            onClick={() => card.route && router.push(card.route)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                  <p className={`text-xl font-bold ${valueColorMap[card.color]}`}>
                    {card.prefix}{typeof card.value === "number" && card.prefix === "R$ "
                      ? card.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                      : card.value}
                  </p>
                  {card.sub && (
                    <p className="text-[10px] text-slate-400">{card.sub}</p>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${iconColorMap[card.color]}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="col-span-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/sistema/financeiro/pedidos")}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Pedidos Financeiros</p>
                <p className="text-xs text-slate-400">
                  {r.preAprovacao} aguardando pre-aprovacao · {r.faturamento} aguardando faturamento · {r.internosAutorizar} internos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/sistema/financeiro/fluxo-caixa")}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Fluxo de Caixa</p>
                <p className="text-xs text-slate-400">Realizado: R$ {(r.recebidoMes - r.pagoMes).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
