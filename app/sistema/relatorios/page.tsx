"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Package, 
  PieChart, 
  FileText, 
  ArrowRight,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

const secoes = [
  {
    nome: "Vendas & Comercial",
    relatorios: [
      {
        title: "Relatório de Vendas",
        description: "Análise comercial detalhada por período, vendedor e clientes compradores.",
        url: "/sistema/relatorios/vendas",
        icon: DollarSign,
        color: "bg-green-50 text-green-700",
      },
      {
        title: "Inteligência de Preço e Margem",
        description: "Análise detalhada de markup, margem de contribuição e lucratividade por produto.",
        url: "/sistema/relatorios/margem",
        icon: TrendingUp,
        color: "bg-blue-50 text-blue-700",
      },
    ],
  },
  {
    nome: "Operações & Estoque",
    relatorios: [
      {
        title: "Relatório de Estoque",
        description: "Inteligência operacional: curva ABC de saídas, posição de estoque valorizada e rastreabilidade de lotes.",
        url: "/sistema/relatorios/estoque",
        icon: Package,
        color: "bg-indigo-50 text-indigo-700",
      },
      {
        title: "Controle de Validade",
        description: "Gestão estratégica de lotes próximos ao vencimento e produtos vencidos (FEFO).",
        url: "/sistema/relatorios/validade",
        icon: Calendar,
        color: "bg-amber-50 text-amber-700",
      },
    ],
  },
  {
    nome: "Finanças & Caixa",
    relatorios: [
      {
        title: "Relatório Financeiro",
        description: "Demonstrativo DRE simplificado, acompanhamento de inadimplência ativa e fluxos de recebimento.",
        url: "/sistema/relatorios/financeiro",
        icon: PieChart,
        color: "bg-purple-50 text-purple-700",
      },
    ],
  },
  {
    nome: "Controladoria & Fiscal",
    relatorios: [
      {
        title: "Relatório Fiscal",
        description: "Auditoria e conciliação de emissão de notas fiscais de saída e breakdown de pedidos por tipo de operação.",
        url: "/sistema/relatorios/fiscal",
        icon: FileText,
        color: "bg-rose-50 text-rose-700",
      },
    ],
  },
];

export default function RelatoriosIndexPage() {
  return (
    <div className="space-y-8 p-1">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Sistema</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900 font-medium">Relatórios</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-1 text-slate-900">Centro de Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Análises estratégicas, operacionais, financeiras e fiscais consolidando a inteligência do seu ERP.
        </p>
      </div>

      {/* Sections and Cards */}
      <div className="space-y-8">
        {secoes.map((secao) => (
          <div key={secao.nome} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              {secao.nome}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {secao.relatorios.map((rel) => (
                <Link key={rel.url} href={rel.url}>
                  <Card className="hover:shadow-md transition-all cursor-pointer group border-slate-200 bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
                      <div className={`h-12 w-12 rounded-xl ${rel.color} flex items-center justify-center`}>
                        <rel.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-slate-900 group-hover:text-primary transition-colors">
                          {rel.title}
                        </CardTitle>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs leading-relaxed text-slate-500">
                        {rel.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
