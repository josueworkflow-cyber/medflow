"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock,
  DollarSign,
  Package,
  PackageCheck,
  Receipt,
  RefreshCw,
  Search,
  Send,
  User,
  UserCheck,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PedidoDetailSheet from "@/components/PedidoDetailSheet";

type Pedido = {
  id: number;
  numero: string;
  status: string;
  tipoPedido: "PEDIDO_NORMAL" | "PEDIDO_INTERNO";
  valorTotal: number;
  cliente: { razaoSocial: string };
  vendedor: { nome: string } | null;
  updatedAt: string;
  ultimaAtualizacao?: {
    createdAt: string;
    usuario?: { nome: string } | null;
    observacao?: string;
  } | null;
};

const colunas = [
  {
    id: "CRIADO",
    label: "Criado",
    status: ["PEDIDO_CRIADO"],
    gradient: "from-slate-500 to-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: CircleDot,
    dot: "bg-slate-400",
  },
  {
    id: "ESTOQUE",
    label: "Estoque",
    status: ["AGUARDANDO_ESTOQUE", "ESTOQUE_PARCIAL", "ESTOQUE_INDISPONIVEL", "AGUARDANDO_FORNECEDOR", "ESTOQUE_CONFIRMADO"],
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50/60",
    border: "border-blue-200",
    icon: Package,
    dot: "bg-blue-500",
  },
  {
    id: "FINANCEIRO",
    label: "Financeiro",
    status: ["AGUARDANDO_APROVACAO_FINANCEIRA", "PAGAMENTO_PENDENTE", "CONDICAO_COMERCIAL_PENDENTE", "REPROVADO_FINANCEIRO"],
    gradient: "from-amber-500 to-yellow-600",
    bg: "bg-amber-50/60",
    border: "border-amber-200",
    icon: DollarSign,
    dot: "bg-amber-500",
  },
  {
    id: "CLIENTE",
    label: "Cliente",
    status: ["APROVADO_FINANCEIRO", "AGUARDANDO_CONFIRMACAO_CLIENTE", "PEDIDO_EM_REVISAO"],
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50/60",
    border: "border-violet-200",
    icon: UserCheck,
    dot: "bg-violet-500",
  },
  {
    id: "FATURAMENTO",
    label: "Faturamento",
    status: ["CLIENTE_CONFIRMOU", "AGUARDANDO_FATURAMENTO", "FATURADO", "PEDIDO_INTERNO_AUTORIZADO"],
    gradient: "from-emerald-500 to-green-600",
    bg: "bg-emerald-50/60",
    border: "border-emerald-200",
    icon: Receipt,
    dot: "bg-emerald-500",
  },
  {
    id: "SEPARACAO",
    label: "Separacao",
    status: ["AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO"],
    gradient: "from-indigo-500 to-blue-700",
    bg: "bg-indigo-50/60",
    border: "border-indigo-200",
    icon: Wrench,
    dot: "bg-indigo-500",
  },
  {
    id: "DESPACHO",
    label: "Despacho",
    status: ["SEPARADO", "DESPACHADO"],
    gradient: "from-teal-500 to-cyan-600",
    bg: "bg-teal-50/60",
    border: "border-teal-200",
    icon: Send,
    dot: "bg-teal-500",
  },
  {
    id: "FINALIZADO",
    label: "Finalizado",
    status: ["FINALIZADO", "CANCELADO", "CANCELADO_PELO_CLIENTE"],
    gradient: "from-slate-700 to-slate-900",
    bg: "bg-slate-100",
    border: "border-slate-300",
    icon: CheckCircle2,
    dot: "bg-slate-600",
  },
];

const statusLabel: Record<string, string> = {
  PEDIDO_CRIADO: "Criado",
  AGUARDANDO_ESTOQUE: "Aguard. Estoque",
  ESTOQUE_CONFIRMADO: "Estoque OK",
  ESTOQUE_PARCIAL: "Parcial",
  ESTOQUE_INDISPONIVEL: "Indisponivel",
  AGUARDANDO_FORNECEDOR: "Fornecedor",
  AGUARDANDO_APROVACAO_FINANCEIRA: "Aguard. Aprovacao",
  APROVADO_FINANCEIRO: "Pre-aprovado",
  REPROVADO_FINANCEIRO: "Reprovado",
  PAGAMENTO_PENDENTE: "Pgto. Pendente",
  CONDICAO_COMERCIAL_PENDENTE: "Cond. Pendente",
  AGUARDANDO_CONFIRMACAO_CLIENTE: "Aguard. Cliente",
  CLIENTE_CONFIRMOU: "Confirmado",
  PEDIDO_EM_REVISAO: "Em Revisao",
  AGUARDANDO_FATURAMENTO: "Aguard. Faturamento",
  FATURADO: "Faturado",
  PEDIDO_INTERNO_AUTORIZADO: "Autorizado",
  AUTORIZADO_PARA_SEPARACAO: "Sep. Autorizada",
  EM_SEPARACAO: "Em Separacao",
  SEPARADO: "Separado",
  DESPACHADO: "Despachado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  CANCELADO_PELO_CLIENTE: "Canc. Cliente",
};

function getTempoNoStatus(updatedAt: string) {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const dias = Math.floor(horas / 24);

  if (dias > 0) return { text: `ha ${dias}d`, color: dias > 3 ? "text-red-500" : dias > 1 ? "text-amber-500" : "text-emerald-500" };
  if (horas > 0) return { text: `ha ${horas}h`, color: "text-emerald-500" };
  return { text: "agora", color: "text-emerald-500" };
}

export default function FunilPage() {
  const [pedidosPorStatus, setPedidosPorStatus] = useState<Record<string, Pedido[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalGeral, setTotalGeral] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [pedidoSelecionado, setPedidoSelecionado] = useState<number | null>(null);
  const [sheetAberto, setSheetAberto] = useState(false);

  const carregarFunil = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendas/funil");
      const data = await res.json();
      setPedidosPorStatus(data);

      let total = 0;
      let count = 0;
      Object.values(data).forEach((pedidos: any) => {
        pedidos.forEach((p: any) => {
          total += p.valorTotal;
          count++;
        });
      });
      setTotalGeral(total);
      setTotalPedidos(count);
    } catch {
      toast.error("Erro ao carregar funil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFunil();
  }, []);

  const filtrarPedidos = (pedidos: Pedido[]) => {
    let filtered = pedidos;
    if (busca) {
      const term = busca.toLowerCase();
      filtered = filtered.filter((p) =>
        p.numero.toLowerCase().includes(term) ||
        p.cliente.razaoSocial.toLowerCase().includes(term)
      );
    }
    if (filtro === "hoje") {
      const hoje = new Date().toDateString();
      filtered = filtered.filter((p) => new Date(p.updatedAt).toDateString() === hoje);
    } else if (filtro === "semana") {
      const semana = Date.now() - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((p) => new Date(p.updatedAt).getTime() > semana);
    } else if (filtro === "atrasados") {
      filtered = filtered.filter((p) => {
        const diff = Date.now() - new Date(p.updatedAt).getTime();
        return diff > 3 * 24 * 60 * 60 * 1000;
      });
    }
    return filtered;
  };

  const colunasComDados = colunas.map((col) => ({
    ...col,
    pedidos: filtrarPedidos(col.status.flatMap((s) => pedidosPorStatus[s] || [])),
    valor: col.status.flatMap((s) => pedidosPorStatus[s] || []).reduce((sum, p) => sum + p.valorTotal, 0),
  }));

  return (
    <>
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Pipeline de Pedidos</h1>
          <p className="text-muted-foreground">Acompanhamento visual do fluxo comercial e operacional</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary/5">
          <a href="/sistema/vendas">
            <ArrowRight className="h-4 w-4" /> Voltar para Vendas
          </a>
        </Button>
      </div>

      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className={cn("h-5 w-5 text-primary", loading && "animate-spin")} /> Visao Geral do Pipeline
            </CardTitle>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Pedidos</span>
                <span className="text-lg font-bold text-slate-900">{totalPedidos}</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Pipeline</span>
                <span className="text-lg font-bold text-emerald-600">
                  R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={carregarFunil} disabled={loading} className="h-8 w-8">
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar pedido ou cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 h-9 bg-white border-slate-200"
              />
            </div>
            <div className="flex gap-1">
              {[
                { key: "todos", label: "Todos" },
                { key: "hoje", label: "Hoje" },
                { key: "semana", label: "Esta semana" },
                { key: "atrasados", label: "Atrasados" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={filtro === f.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltro(f.key)}
                  className="h-8 text-xs"
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5 pb-2">
            {colunasComDados.map((col, colIdx) => {
              const Icon = col.icon;
              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex-1 min-w-0 max-w-[200px] flex flex-col rounded-xl border overflow-hidden bg-white shadow-sm",
                    col.border
                  )}
                >
                  <div className={cn("p-2 bg-gradient-to-r text-white", col.gradient)}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="p-0.5 bg-white/20 rounded backdrop-blur-sm">
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="font-bold text-[10px] uppercase tracking-wide">{col.label}</span>
                      <Badge className="ml-auto bg-white/20 text-white border-0 text-[9px] h-4 px-1 backdrop-blur-sm">
                        {col.pedidos.length}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-white/70">
                      R$ {col.valor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className={cn("flex-1 overflow-y-auto p-1.5 space-y-1.5", col.bg)}>
                    <AnimatePresence>
                      {col.pedidos.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center py-6 text-slate-300"
                        >
                          <PackageCheck className="h-6 w-6 mb-1 opacity-40" />
                          <span className="text-[10px]">Nenhum pedido</span>
                        </motion.div>
                      ) : (
                        col.pedidos.map((pedido, i) => {
                          const tempo = getTempoNoStatus(pedido.updatedAt);
                          const totalSteps = 7;

                          return (
                            <motion.div
                              key={pedido.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: i * 0.03 }}
                              className="group relative bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-2 cursor-pointer"
                              onClick={() => {
                                setPedidoSelecionado(pedido.id);
                                setSheetAberto(true);
                              }}
                            >
                              <div className="absolute left-1 top-3 bottom-3 w-1 flex flex-col gap-0.5">
                                {Array.from({ length: totalSteps }).map((_, si) => (
                                  <div
                                    key={si}
                                    className={cn(
                                      "flex-1 rounded-full transition-all",
                                      si <= colIdx ? col.dot : "bg-slate-200"
                                    )}
                                  />
                                ))}
                              </div>

                              <div className="ml-2.5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[7px] font-mono font-bold text-slate-400 uppercase">
                                    #{pedido.numero.slice(-6)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[7px] font-bold px-1 py-0 h-3.5",
                                      pedido.tipoPedido === "PEDIDO_NORMAL"
                                        ? "bg-blue-50 text-blue-600 border-blue-200"
                                        : "bg-orange-50 text-orange-600 border-orange-200"
                                    )}
                                  >
                                    {pedido.tipoPedido === "PEDIDO_NORMAL" ? "NF" : "INT"}
                                  </Badge>
                                </div>

                                <p className="font-semibold text-slate-800 text-[9px] line-clamp-1 mb-1">
                                  {pedido.cliente.razaoSocial}
                                </p>

                                <Badge className={cn("text-[7px] h-3.5 mb-1 font-medium", col.bg, "text-slate-600 border border-slate-200")}>
                                  {statusLabel[pedido.status] || pedido.status}
                                </Badge>

                                <div className="text-xs font-bold text-slate-800 mb-1.5">
                                  R$ {pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                  <div className="flex items-center gap-1 text-[8px] text-slate-400">
                                    <User className="h-2.5 w-2.5" />
                                    <span className="truncate max-w-[70px]">
                                      {pedido.ultimaAtualizacao?.usuario?.nome || pedido.vendedor?.nome || "Sistema"}
                                    </span>
                                  </div>
                                  <div className={cn("flex items-center gap-0.5 text-[8px] font-medium", tempo.color)}>
                                    <Clock className="h-2.5 w-2.5" />
                                    {tempo.text}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
    <PedidoDetailSheet
      pedidoId={pedidoSelecionado}
      open={sheetAberto}
      onOpenChange={setSheetAberto}
    />
    </>
  );
}
