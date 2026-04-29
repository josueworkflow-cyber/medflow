"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ClipboardCheck, AlertTriangle, FileWarning, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EstoqueCards() {
  const { data, error, isLoading } = useSWR("/api/estoque/resumo", fetcher);

  if (error) return <div>Erro ao carregar resumo</div>;

  const cards = [
    {
      title: "Físico Total",
      value: data?.fisicoTotal,
      icon: Package,
      color: "text-blue-500",
      description: "Itens em estoque",
    },
    {
      title: "Reservados",
      value: data?.reservados,
      icon: ClipboardCheck,
      color: "text-amber-500",
      description: "Aguardando faturamento",
    },
    {
      title: "Vencendo (30d)",
      value: data?.vencendo,
      icon: AlertTriangle,
      color: "text-red-500",
      description: "Lotes próximos do vencimento",
    },
    {
      title: "Sem Alocação Fiscal",
      value: data?.semAlocacaoFiscal,
      icon: FileWarning,
      color: "text-purple-500",
      description: "Saídas operacionais sem NF",
    },
    {
      title: "Faturado (Mês)",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data?.faturadoNoMes || 0),
      icon: TrendingUp,
      color: "text-emerald-500",
      description: "Total em movimentações fiscais",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
