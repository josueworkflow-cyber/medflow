"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

const relatorios = [
  {
    title: "Inteligência de Preço e Margem",
    description: "Análise detalhada de markup, margem de contribuição e lucratividade por produto.",
    url: "/sistema/relatorios/margem",
    icon: TrendingUp,
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Controle de Validade",
    description: "Gestão estratégica de lotes próximos ao vencimento e produtos vencidos (FEFO).",
    url: "/sistema/relatorios/validade",
    icon: Calendar,
    color: "bg-amber-100 text-amber-700",
  },
];

export default function RelatoriosIndexPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Centro de Relatórios</h1>
        <p className="text-muted-foreground">Análises estratégicas e inteligência de dados para sua distribuidora.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {relatorios.map((rel) => (
          <Link key={rel.url} href={rel.url}>
            <Card className="hover:shadow-md transition-all cursor-pointer group border-slate-200">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className={`h-12 w-12 rounded-2xl ${rel.color} flex items-center justify-center`}>
                  <rel.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{rel.title}</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {rel.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
        <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Novos relatórios em breve</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
          Estamos desenvolvendo novos módulos de BI para vendas por região, curva ABC e produtividade.
        </p>
      </div>
    </div>
  );
}
