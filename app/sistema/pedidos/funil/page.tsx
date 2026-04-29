"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Plus, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  FileText, 
  Ban,
  Package,
  DollarSign,
  Search,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Pedido = {
  id: number;
  numero: string;
  status: string;
  tipoPedido: "PEDIDO_NORMAL" | "PEDIDO_INTERNO";
  valorTotal: number;
  cliente: { razaoSocial: string };
};

const colunas = [
  { id: "CRIADO", label: "Criado", status: ["PEDIDO_CRIADO"], color: "bg-slate-500" },
  { id: "RESERVADO", label: "Reservado", status: ["RESERVADO"], color: "bg-blue-500" },
  { id: "FINANCEIRO", label: "Financeiro", status: ["AGUARDANDO_APROVACAO_FINANCEIRA", "APROVADO_FINANCEIRO", "REPROVADO_FINANCEIRO"], color: "bg-amber-500" },
  { id: "SEPARACAO", label: "Separação", status: ["EM_SEPARACAO", "SEPARADO"], color: "bg-indigo-500" },
  { id: "FATURADO", label: "Faturado", status: ["FATURADO"], color: "bg-emerald-500" },
  { id: "TRANSITO", label: "Em Trânsito", status: ["EM_TRANSITO"], color: "bg-purple-500" },
  { id: "ENTREGUE", label: "Entregue", status: ["ENTREGUE"], color: "bg-green-500" },
  { id: "FINALIZADO", label: "Finalizado", status: ["FINALIZADO"], color: "bg-teal-500" },
];

export default function FunilPage() {
  const [pedidosPorStatus, setPedidosPorStatus] = useState<Record<string, Pedido[]>>({});
  const [loading, setLoading] = useState(true);

  const carregarFunil = async () => {
    try {
      const res = await fetch("/api/vendas/funil");
      const data = await res.json();
      setPedidosPorStatus(data);
    } catch (error) {
      toast.error("Erro ao carregar funil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFunil();
  }, []);

  const transicionar = async (pedidoId: number, acao: string, dados?: any) => {
    try {
      const res = await fetch(`/api/vendas/${pedidoId}/transicao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, dados }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Pedido atualizado!");
      carregarFunil();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getAcaoNext = (pedido: Pedido) => {
    switch (pedido.status) {
      case "PEDIDO_CRIADO": return { label: "Reservar", acao: "reservar" };
      case "RESERVADO": return { label: "Financeiro", acao: "enviar_financeiro" };
      case "AGUARDANDO_APROVACAO_FINANCEIRA": return { label: "Aprovar", acao: "aprovar" };
      case "APROVADO_FINANCEIRO": return { label: "Separar", acao: "iniciar_separacao" };
      case "EM_SEPARACAO": return { label: "Finalizar Sep.", acao: "finalizar_separacao" };
      case "SEPARADO": 
        if (pedido.tipoPedido === "PEDIDO_NORMAL") return { label: "Faturar", acao: "faturar" };
        return { label: "Despachar", acao: "despachar" };
      case "FATURADO": return { label: "Despachar", acao: "despachar" };
      case "EM_TRANSITO": return { label: "Entregar", acao: "confirmar_entrega" };
      case "ENTREGUE": return { label: "Finalizar", acao: "finalizar" };
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Funil de Pedidos</h2>
          <p className="text-muted-foreground">
            Acompanhe o fluxo de vendas em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={carregarFunil}>
            Atualizar
          </Button>
          <Button asChild>
            <a href="/sistema/vendas">
              <Plus className="mr-2 h-4 w-4" /> Novo Pedido
            </a>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {colunas.map((col) => (
            <div key={col.id} className="w-72 flex flex-col gap-4 bg-slate-50/50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-slate-700">{col.label}</h3>
                </div>
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-500 font-mono">
                  {col.status.reduce((sum, s) => sum + (pedidosPorStatus[s]?.length || 0), 0)}
                </Badge>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                <AnimatePresence>
                  {col.status.flatMap(s => pedidosPorStatus[s] || []).map((pedido) => {
                    const next = getAcaoNext(pedido);
                    return (
                      <motion.div
                        key={pedido.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">
                            #{pedido.numero.slice(-6)}
                          </span>
                          <Badge variant="outline" className={
                            pedido.tipoPedido === "PEDIDO_NORMAL" 
                            ? "bg-blue-50 text-blue-600 border-blue-100" 
                            : "bg-orange-50 text-orange-600 border-orange-100"
                          }>
                            {pedido.tipoPedido === "PEDIDO_NORMAL" ? "NORMAL" : "INTERNO"}
                          </Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800 text-sm line-clamp-1">{pedido.cliente.razaoSocial}</p>
                          <p className="text-primary font-bold text-lg">
                            R$ {pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          {next ? (
                            <Button 
                              size="sm" 
                              className="w-full h-8 gap-1.5 text-xs font-semibold rounded-lg shadow-none"
                              onClick={() => transicionar(pedido.id, next.acao)}
                            >
                              {next.label} <ArrowRight className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="w-full justify-center h-8 bg-slate-100 text-slate-500 border-none">
                              {pedido.status === 'FINALIZADO' ? 'Concluído' : pedido.status}
                            </Badge>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => transicionar(pedido.id, "cancelar")}>
                                <Ban className="mr-2 h-4 w-4 text-red-500" /> Cancelar Pedido
                              </DropdownMenuItem>
                              {pedido.status === "AGUARDANDO_APROVACAO_FINANCEIRA" && (
                                <DropdownMenuItem onClick={() => transicionar(pedido.id, "reprovar")}>
                                  <Ban className="mr-2 h-4 w-4 text-orange-500" /> Reprovar Financeiro
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
