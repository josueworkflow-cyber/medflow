"use client";
 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart3, 
  Percent, 
  RefreshCw, 
  Calendar, 
  ArrowRight, 
  DollarSign, 
  Package, 
  PieChart, 
  FileText, 
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
        borderLeft: "border-l-4 border-l-green-500"
      },
      {
        title: "Relatório de Margem",
        description: "Monitore a lucratividade, markup, margem de venda e lucro unitário médio dos produtos ativos.",
        url: "/sistema/relatorios/margem",
        icon: Percent,
        color: "bg-blue-50 text-blue-700",
        borderLeft: "border-l-4 border-l-blue-500"
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
        borderLeft: "border-l-4 border-l-indigo-500"
      },
      {
        title: "Giro de Estoque",
        description: "Monitore a velocidade de saída de itens, cobertura média em dias de estoque e alertas de excesso ou escassez.",
        url: "/sistema/relatorios/giro",
        icon: RefreshCw,
        color: "bg-emerald-50 text-emerald-700",
        borderLeft: "border-l-4 border-l-emerald-500"
      },
      {
        title: "Controle de Validade",
        description: "Monitore lotes próximos do vencimento e lotes já vencidos para ações corretivas sanitárias e financeiras imediatas.",
        url: "/sistema/relatorios/validade",
        icon: Calendar,
        color: "bg-red-50 text-red-700",
        borderLeft: "border-l-4 border-l-red-500"
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
        borderLeft: "border-l-4 border-l-purple-500"
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
        borderLeft: "border-l-4 border-l-rose-500"
      },
    ],
  },
];

export default function RelatoriosIndexPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Sistema</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900 font-medium">Relatórios</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-slate-700" />
          Centro de Relatórios
        </h1>
        <p className="text-sm text-slate-500 mt-1">
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {secao.relatorios.map((rel) => {
                const Icon = rel.icon;
                return (
                  <Link key={rel.url} href={rel.url} className="block group">
                    <Card className={`h-full shadow-sm border-slate-200 flex flex-col justify-between hover:shadow-md transition-all ${rel.borderLeft} bg-white`}>
                      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {rel.title}
                          </CardTitle>
                        </div>
                        <div className={`p-2.5 rounded-xl ${rel.color} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                        <CardDescription className="text-xs text-slate-500 leading-relaxed">
                          {rel.description}
                        </CardDescription>
                        <div className="pt-2 flex items-center text-xs font-bold text-slate-900 group-hover:underline gap-1 mt-auto">
                          Acessar Relatório <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
