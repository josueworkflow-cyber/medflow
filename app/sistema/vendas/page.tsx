"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Ban,
  FileText,
  Plus,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Produto = { id: number; descricao: string; precoVendaBase: number };
type Cliente = { id: number; razaoSocial: string };
type Vendedor = { id: number; nome: string };
type ItemForm = { produtoId: string; quantidade: string; precoUnitario: string; desconto: string };
type Pedido = {
  id: number;
  numero: string;
  status: string;
  tipoPedido: "PEDIDO_NORMAL" | "PEDIDO_INTERNO";
  valorTotal: number;
  desconto: number;
  createdAt: string;
  cliente: { razaoSocial: string };
  vendedor: { nome: string } | null;
};

const formasPagamento = [
  { value: "PIX", label: "PIX" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CARTAO_CREDITO", label: "Cartao de Credito" },
  { value: "CARTAO_DEBITO", label: "Cartao de Debito" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "A_PRAZO", label: "A Prazo" },
  { value: "CHEQUE", label: "Cheque" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  PEDIDO_CRIADO: { label: "Criado", color: "bg-slate-100 text-slate-700" },
  AGUARDANDO_ESTOQUE: { label: "Aguard. Estoque", color: "bg-blue-100 text-blue-700" },
  ESTOQUE_CONFIRMADO: { label: "Estoque OK", color: "bg-blue-100 text-blue-700" },
  ESTOQUE_PARCIAL: { label: "Estoque Parcial", color: "bg-amber-100 text-amber-700" },
  ESTOQUE_INDISPONIVEL: { label: "Sem Estoque", color: "bg-red-100 text-red-700" },
  AGUARDANDO_FORNECEDOR: { label: "Fornecedor", color: "bg-orange-100 text-orange-700" },
  AGUARDANDO_APROVACAO_FINANCEIRA: { label: "Financ. Pendente", color: "bg-amber-100 text-amber-700" },
  APROVADO_FINANCEIRO: { label: "Pre-aprovado", color: "bg-emerald-100 text-emerald-700" },
  REPROVADO_FINANCEIRO: { label: "Financ. Repro.", color: "bg-red-100 text-red-700" },
  PAGAMENTO_PENDENTE: { label: "Pgto. Pendente", color: "bg-orange-100 text-orange-700" },
  CONDICAO_COMERCIAL_PENDENTE: { label: "Cond. Pendente", color: "bg-orange-100 text-orange-700" },
  AGUARDANDO_CONFIRMACAO_CLIENTE: { label: "Aguard. Cliente", color: "bg-violet-100 text-violet-700" },
  CLIENTE_CONFIRMOU: { label: "Cliente OK", color: "bg-green-100 text-green-700" },
  PEDIDO_EM_REVISAO: { label: "Em Revisao", color: "bg-orange-100 text-orange-700" },
  AGUARDANDO_FATURAMENTO: { label: "Aguard. Faturamento", color: "bg-cyan-100 text-cyan-700" },
  FATURADO: { label: "Faturado", color: "bg-green-100 text-green-700" },
  PEDIDO_INTERNO_AUTORIZADO: { label: "Autorizado", color: "bg-green-100 text-green-700" },
  AUTORIZADO_PARA_SEPARACAO: { label: "Sep. Autorizada", color: "bg-indigo-100 text-indigo-700" },
  EM_SEPARACAO: { label: "Em Separacao", color: "bg-indigo-100 text-indigo-700" },
  SEPARADO: { label: "Separado", color: "bg-violet-100 text-violet-700" },
  DESPACHADO: { label: "Despachado", color: "bg-emerald-100 text-emerald-700" },
  FINALIZADO: { label: "Finalizado", color: "bg-slate-200 text-slate-800" },
  CANCELADO: { label: "Cancelado", color: "bg-red-50 text-red-600" },
  CANCELADO_PELO_CLIENTE: { label: "Canc. Cliente", color: "bg-red-50 text-red-600" },
};

export default function VendasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [tipoPedido, setTipoPedido] = useState<"PEDIDO_NORMAL" | "PEDIDO_INTERNO">("PEDIDO_NORMAL");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [prazoPagamento, setPrazoPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([
    { produtoId: "", quantidade: "1", precoUnitario: "0", desconto: "0" },
  ]);
  const [saving, setSaving] = useState(false);

  const carregarPedidos = () =>
    fetch("/api/vendas")
      .then((r) => r.json())
      .then((d) => setPedidos(Array.isArray(d) ? d : []));

  useEffect(() => {
    carregarPedidos();
    fetch("/api/produto").then((r) => r.json()).then((d) => setProdutos(Array.isArray(d) ? d : []));
    fetch("/api/clientes").then((r) => r.json()).then((d) => setClientes(Array.isArray(d) ? d : []));
    fetch("/api/vendedores").then((r) => r.json()).then((d) => setVendedores(Array.isArray(d) ? d : []));
  }, []);

  function addItem() {
    setItens([...itens, { produtoId: "", quantidade: "1", precoUnitario: "0", desconto: "0" }]);
  }

  function removeItem(i: number) {
    if (itens.length > 1) setItens(itens.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof ItemForm, value: string) {
    const copy = [...itens];
    copy[i] = { ...copy[i], [field]: value };
    if (field === "produtoId") {
      const prod = produtos.find((p) => p.id === Number(value));
      if (prod) copy[i].precoUnitario = String(prod.precoVendaBase);
    }
    setItens(copy);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) return toast.error("Selecione um cliente");
    if (itens.some((i) => !i.produtoId)) return toast.error("Todos os itens devem ter um produto");

    setSaving(true);
    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: Number(clienteId),
          vendedorId: vendedorId ? Number(vendedorId) : null,
          tipoPedido,
          formaPagamento: formaPagamento || null,
          prazoPagamento: prazoPagamento || null,
          observacao,
          itens: itens.map((i) => ({
            produtoId: Number(i.produtoId),
            quantidade: Number(i.quantidade),
            precoUnitario: Number(i.precoUnitario),
            desconto: Number(i.desconto),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Pedido criado com sucesso!");
      setClienteId("");
      setVendedorId("");
      setFormaPagamento("");
      setPrazoPagamento("");
      setObservacao("");
      setItens([{ produtoId: "", quantidade: "1", precoUnitario: "0", desconto: "0" }]);
      carregarPedidos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function transicionar(pedidoId: number, acao: string) {
    try {
      const res = await fetch(`/api/vendas/${pedidoId}/transicao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Pedido atualizado.");
      carregarPedidos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar pedido.");
    }
  }

  const total = itens.reduce(
    (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario) - Number(i.desconto),
    0
  );

  const aguardandoCliente = pedidos.filter((p) => p.status === "AGUARDANDO_CONFIRMACAO_CLIENTE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Venda</h1>
          <p className="text-muted-foreground">Crie pedidos e acompanhe o retorno comercial.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
          <a href="/sistema/pedidos/funil">
            <ArrowRight className="h-4 w-4" /> Ir para o Funil
          </a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[450px_1fr]">
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Novo Pedido
              </CardTitle>
              <Badge variant="outline" className={tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50" : "bg-orange-50"}>
                {tipoPedido === "PEDIDO_NORMAL" ? "NORMAL" : "INTERNO"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={salvar} className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Pedido</label>
                  <Select value={tipoPedido} onValueChange={(v: any) => setTipoPedido(v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEDIDO_NORMAL">Pedido Normal (NF)</SelectItem>
                      <SelectItem value="PEDIDO_INTERNO">Pedido Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.razaoSocial}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendedor</label>
                  <Select value={vendedorId} onValueChange={setVendedorId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o vendedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione (opcional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formasPagamento.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formaPagamento === "A_PRAZO" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prazo (dias)</label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={prazoPagamento}
                      onChange={(e) => setPrazoPagamento(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              {tipoPedido === "PEDIDO_INTERNO" && (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-700 flex items-center gap-2">
                  <Ban className="h-4 w-4" /> Pedido interno
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produtos</label>
                  <Button type="button" variant="ghost" size="sm" onClick={addItem}
                    className="h-8 text-primary hover:text-primary hover:bg-primary/5">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>

                <div className="space-y-3">
                  {itens.map((item, i) => (
                    <div key={i} className="group relative grid grid-cols-[1fr_80px] gap-2 items-start bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-300">
                      <div className="space-y-3">
                        <Select value={item.produtoId} onValueChange={(v) => updateItem(i, "produtoId", v)}>
                          <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="Produto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.descricao}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-3 gap-2">
                          <Input type="number" placeholder="Qtd" value={item.quantidade}
                            onChange={(e) => updateItem(i, "quantidade", e.target.value)}
                            className="bg-white" />
                          <Input type="number" placeholder="Preco" value={item.precoUnitario}
                            onChange={(e) => updateItem(i, "precoUnitario", e.target.value)}
                            className="bg-white" />
                          <Input type="number" placeholder="Desc" value={item.desconto}
                            onChange={(e) => updateItem(i, "desconto", e.target.value)}
                            className="bg-white" />
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors mt-0.5">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <span className="text-sm font-medium text-slate-600">Total do Pedido</span>
                <span className="text-xl font-bold text-primary">
                  R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observacoes</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 rounded-xl">
                {saving ? "Processando..." : "Finalizar Pedido de Venda"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {aguardandoCliente.length > 0 && (
            <Card className="shadow-md border-violet-200">
              <CardHeader className="bg-violet-50/50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-violet-600" /> Aguardando Confirmacao do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {aguardandoCliente.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-violet-200 bg-violet-50/30">
                    <div>
                      <p className="font-semibold text-slate-800">#{p.numero.slice(-8)} - {p.cliente.razaoSocial}</p>
                      <p className="text-sm text-slate-500">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                        onClick={() => transicionar(p.id, "cliente_confirmou")}>
                        Confirmou
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={() => transicionar(p.id, "pedido_em_revisao")}>
                        Revisao
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => transicionar(p.id, "cliente_recusou")}>
                        Recusou
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-md border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Historico de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {pedidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                  <FileText className="h-12 w-12 opacity-20" />
                  <p>Nenhum pedido registrado ainda.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[100px]">Numero</TableHead>
                        <TableHead>Cliente / Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidos.map((p) => {
                        const config = statusConfig[p.status] || { label: p.status, color: "bg-slate-100" };
                        return (
                          <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-mono text-[11px] font-bold text-slate-500 uppercase">
                              #{p.numero.slice(-8)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-slate-700">{p.cliente.razaoSocial}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-[9px] h-4 px-1 ${p.tipoPedido === "PEDIDO_NORMAL" ? "border-blue-200 text-blue-600" : "border-orange-200 text-orange-600"}`}>
                                    {p.tipoPedido === "PEDIDO_NORMAL" ? "NORMAL" : "INTERNO"}
                                  </Badge>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <User className="h-2.5 w-2.5" /> {p.vendedor?.nome || "Venda Direta"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={`font-medium shadow-none whitespace-nowrap ${config.color}`}>
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-900">
                              R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
