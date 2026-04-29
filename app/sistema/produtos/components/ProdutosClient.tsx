"use client";

import { useState } from "react";
import useSWR from "swr";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Trash2, 
  Package, 
  ShieldCheck, 
  DollarSign
} from "lucide-react";
import { ProdutoListItem } from "@/lib/services/produtos.service";
import { CategoriaListItem } from "@/lib/services/categorias.service";

type FormData = {
  codigoInterno: string;
  codigoBarras: string;
  descricao: string;
  categoria: string;
  fabricante: string;
  unidadeVenda: string;
  unidadeCompra: string;
  fatorConversao: string;
  registroAnvisa: string;
  temperaturaArmazenamento: string;
  controlaValidade: boolean;
  controlaLote: boolean;
  estoqueMinimo: string;
  precoCustoBase: string;
  precoVendaBase: string;
};

const initialForm: FormData = {
  codigoInterno: "",
  codigoBarras: "",
  descricao: "",
  categoria: "",
  fabricante: "",
  unidadeVenda: "UN",
  unidadeCompra: "CX",
  fatorConversao: "1",
  registroAnvisa: "",
  temperaturaArmazenamento: "Temperatura ambiente (15–30°C)",
  controlaValidade: true,
  controlaLote: true,
  estoqueMinimo: "0",
  precoCustoBase: "0",
  precoVendaBase: "0",
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ProdutosClientProps {
  initialData: ProdutoListItem[];
  categorias: CategoriaListItem[];
}

export function ProdutosClient({ initialData, categorias }: ProdutosClientProps) {
  const { data: produtos, mutate } = useSWR<ProdutoListItem[]>("/api/produto", fetcher, {
    fallbackData: initialData,
  });

  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);

  const markup =
    Number(form.precoCustoBase) > 0
      ? (
          ((Number(form.precoVendaBase) - Number(form.precoCustoBase)) /
            Number(form.precoCustoBase)) *
          100
        ).toFixed(1)
      : "0.0";

  function campo<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao) return toast.error("Descrição é obrigatória");

    try {
      setSaving(true);
      const res = await fetch("/api/produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fatorConversao: Number(form.fatorConversao),
          estoqueMinimo: Number(form.estoqueMinimo),
          precoCustoBase: Number(form.precoCustoBase),
          precoVendaBase: Number(form.precoVendaBase),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Produto cadastrado com sucesso!");
      setForm(initialForm);
      mutate(); // Revalida SWR
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm("Deseja realmente excluir este produto?")) return;

    try {
      const res = await fetch(`/api/produto/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("Produto removido.");
      mutate(); // Revalida SWR
    } catch (err) {
      toast.error("Não foi possível excluir o produto.");
    }
  }

  // Fallback seguro caso o data ainda esteja carregando no SWR (não deveria pelo fallbackData)
  const produtosList = Array.isArray(produtos) ? produtos : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[450px_1fr]">
      <form onSubmit={salvar} className="space-y-6">
        {/* IDENTIFICAÇÃO */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Identificação Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Código</label>
                <Input value={form.codigoInterno} onChange={(e) => campo("codigoInterno", e.target.value)} placeholder="MED-001" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">EAN / Barras</label>
                <Input value={form.codigoBarras} onChange={(e) => campo("codigoBarras", e.target.value)} placeholder="789..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Descrição do Produto</label>
              <Input value={form.descricao} onChange={(e) => campo("descricao", e.target.value)} placeholder="Ex: Amoxicilina 500mg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Categoria</label>
                <Select value={form.categoria} onValueChange={(v) => campo("categoria", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Fabricante</label>
                <Input value={form.fabricante} onChange={(e) => campo("fabricante", e.target.value)} placeholder="EMS Pharma" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* REGRAS SANITÁRIAS */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Regras e Vigilância
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Registro ANVISA</label>
              <Input value={form.registroAnvisa} onChange={(e) => campo("registroAnvisa", e.target.value)} placeholder="1.0123..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Armazenamento</label>
              <Select value={form.temperaturaArmazenamento} onValueChange={(v) => campo("temperaturaArmazenamento", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Temperatura ambiente (15-30C)">Ambiente (15-30 C)</SelectItem>
                  <SelectItem value="Refrigerado (2-8C)">Refrigerado (2-8 C)</SelectItem>
                  <SelectItem value="Congelado (abaixo de -15C)">Congelado (menor que -15 C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.controlaValidade} onChange={e => campo("controlaValidade", e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                Validade
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.controlaLote} onChange={e => campo("controlaLote", e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                Lote
              </label>
            </div>
          </CardContent>
        </Card>

        {/* FINANCEIRO */}
        <Card className="shadow-md border-slate-200 bg-primary/5">
          <CardHeader className="border-b pb-4 bg-primary/10">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Preços e Margem
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Custo Base (R$)</label>
              <Input type="number" step="0.01" value={form.precoCustoBase} onChange={e => campo("precoCustoBase", e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Venda Base (R$)</label>
              <Input type="number" step="0.01" value={form.precoVendaBase} onChange={e => campo("precoVendaBase", e.target.value)} className="bg-white font-bold text-primary" />
            </div>
            <div className="col-span-2 flex items-center justify-between p-3 bg-white rounded-lg border border-primary/20">
              <span className="text-sm font-medium text-slate-500">Markup Calculado</span>
              <Badge className="bg-primary hover:bg-primary font-bold">{markup}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20 rounded-xl">
          {saving ? "Salvando..." : "Cadastrar Produto"}
        </Button>
      </form>

      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Produtos Cadastrados</CardTitle>
            <CardDescription>{produtosList.length} itens ativos no sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosList.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">Nenhum produto cadastrado.</TableCell></TableRow>
                ) : produtosList.map((p) => (
                  <TableRow key={p.id} className="group transition-colors hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{p.descricao}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">#{p.codigoInterno || p.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50 border-slate-200">
                        {p.categoria || "Geral"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium">{p.unidadeVenda}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      R$ {p.precoVendaBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => excluir(p.id)}
                        className="h-8 w-8 text-slate-300 group-hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
