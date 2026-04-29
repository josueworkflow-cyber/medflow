"use client";

import { useEffect, useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  FileText, 
  ShoppingCart, 
  User, 
  Calendar,
  DollarSign,
  ArrowRight,
  Ban
} from "lucide-react";


type Produto = { id: number; descricao: string; precoVendaBase: number };
type Cliente = { id: number; razaoSocial: string };
type Vendedor = { id: number; nome: string };
type EmpresaFiscal = { id: number; razaoSocial: string };
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
  empresaFiscal: { nomeFantasia: string } | null;
  itens: { produto: { descricao: string }; quantidade: number; precoUnitario: number; subtotal: number }[];
};

const statusConfig: Record<string, { label: string; color: string }> = {
  PEDIDO_CRIADO: { label: "Criado", color: "bg-slate-100 text-slate-700" },
  RESERVADO: { label: "Reservado", color: "bg-blue-100 text-blue-700" },
  AGUARDANDO_APROVACAO_FINANCEIRA: { label: "Financ. Pendente", color: "bg-amber-100 text-amber-700" },
  APROVADO_FINANCEIRO: { label: "Financ. Apro.", color: "bg-emerald-100 text-emerald-700" },
  REPROVADO_FINANCEIRO: { label: "Financ. Repro.", color: "bg-red-100 text-red-700" },
  EM_SEPARACAO: { label: "Em Separação", color: "bg-indigo-100 text-indigo-700" },
  SEPARADO: { label: "Separado", color: "bg-violet-100 text-violet-700" },
  FATURADO: { label: "Faturado", color: "bg-green-100 text-green-700" },
  EM_TRANSITO: { label: "Em Trânsito", color: "bg-purple-100 text-purple-700" },
  ENTREGUE: { label: "Entregue", color: "bg-teal-100 text-teal-700" },
  FINALIZADO: { label: "Finalizado", color: "bg-slate-200 text-slate-800" },
  CANCELADO: { label: "Cancelado", color: "bg-red-50 text-red-600" },
};

export default function VendasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [empresasFiscais, setEmpresasFiscais] = useState<EmpresaFiscal[]>([]);
  
  const [clienteId, setClienteId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [tipoPedido, setTipoPedido] = useState<"PEDIDO_NORMAL" | "PEDIDO_INTERNO">("PEDIDO_NORMAL");
  const [empresaFiscalId, setEmpresaFiscalId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([
    { produtoId: "", quantidade: "1", precoUnitario: "0", desconto: "0" },
  ]);
  const [saving, setSaving] = useState(false);

  const carregarPedidos = () => fetch("/api/vendas").then((r) => r.json()).then((d) => setPedidos(Array.isArray(d) ? d : []));

  useEffect(() => {
    carregarPedidos();
    fetch("/api/produto").then((r) => r.json()).then((d) => setProdutos(Array.isArray(d) ? d : []));
    fetch("/api/clientes").then((r) => r.json()).then((d) => setClientes(Array.isArray(d) ? d : []));
    fetch("/api/vendedores").then((r) => r.json()).then((d) => setVendedores(Array.isArray(d) ? d : []));
    fetch("/api/fiscal/empresas").then((r) => r.json()).then((d) => setEmpresasFiscais(Array.isArray(d) ? d : []));
  }, []);

  function addItem() {
    setItens([...itens, { produtoId: "", quantidade: "1", precoUnitario: "0", desconto: "0" }]);
  }

  function removeItem(i: number) {
    if (itens.length > 1) {
      setItens(itens.filter((_, idx) => idx !== i));
    }
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
    if (tipoPedido === "PEDIDO_NORMAL" && !empresaFiscalId) return toast.error("Selecione a empresa fiscal");
    if (itens.some(i => !i.produtoId)) return toast.error("Todos os itens devem ter um produto");

    setSaving(true);
    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: Number(clienteId),
          vendedorId: vendedorId ? Number(vendedorId) : null,
          tipoPedido,
          empresaFiscalId: empresaFiscalId ? Number(empresaFiscalId) : null,
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
      setEmpresaFiscalId("");
      setObservacao("");
      setItens([{ produtoId: "", quantidade: "1", precoUnitario: "0", desconto: "0" }]);
      carregarPedidos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar pedido.");
    } finally {
      setSaving(false);
    }
  }

  const total = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.precoUnitario) - Number(i.desconto), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Venda</h1>
          <p className="text-muted-foreground">Gerencie suas vendas e o fluxo de faturamento.</p>
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
                      <SelectItem value="PEDIDO_NORMAL">Pedido Normal (Faturamento/NF)</SelectItem>
                      <SelectItem value="PEDIDO_INTERNO">Pedido Interno (Sem NF)</SelectItem>
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

                {tipoPedido === "PEDIDO_NORMAL" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa Fiscal</label>
                    <Select value={empresaFiscalId} onValueChange={setEmpresaFiscalId}>
                      <SelectTrigger className="rounded-xl border-blue-200 bg-blue-50/30">
                        <SelectValue placeholder="Selecione a empresa fiscal..." />
                      </SelectTrigger>
                      <SelectContent>
                        {empresasFiscais.map((e) => (
                          <SelectItem key={e.id} value={e.id.toString()}>{e.razaoSocial}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
              </div>

              {tipoPedido === "PEDIDO_INTERNO" && (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-700 flex items-center gap-2">
                  <Ban className="h-4 w-4" /> Este pedido não gera nota fiscal, mas movimenta estoque.
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produtos</label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={addItem}
                    className="h-8 text-primary hover:text-primary hover:bg-primary/5"
                  >
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
                          <Input 
                            type="number" 
                            placeholder="Qtd"
                            value={item.quantidade} 
                            onChange={(e) => updateItem(i, "quantidade", e.target.value)}
                            className="bg-white"
                          />
                          <Input 
                            type="number" 
                            placeholder="Preço"
                            value={item.precoUnitario} 
                            onChange={(e) => updateItem(i, "precoUnitario", e.target.value)}
                            className="bg-white"
                          />
                          <Input 
                            type="number" 
                            placeholder="Desc"
                            value={item.desconto} 
                            onChange={(e) => updateItem(i, "desconto", e.target.value)}
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors mt-0.5"
                      >
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
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observações</label>
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

        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> Histórico de Vendas
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
                      <TableHead className="w-[100px]">Número</TableHead>
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
                                <Badge variant="outline" className={`text-[9px] h-4 px-1 ${p.tipoPedido === 'PEDIDO_NORMAL' ? 'border-blue-200 text-blue-600' : 'border-orange-200 text-orange-600'}`}>
                                  {p.tipoPedido === 'PEDIDO_NORMAL' ? 'NORMAL' : 'INTERNO'}
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
  );
}

