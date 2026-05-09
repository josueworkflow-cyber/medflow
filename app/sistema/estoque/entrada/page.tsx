"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";

type Produto = {
  id: number;
  codigoInterno?: string | null;
  descricao: string;
};

export default function EntradaEstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    produtoId: "",
    codigoLote: "",
    validade: "",
    quantidade: "",
    custoUnitario: "",
    observacao: "",
  });

  async function carregarProdutos() {
    try {
      const res = await fetch("/api/produto");
      const data = await res.json();
      setProdutos(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erro ao carregar produtos.");
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/estoque/lote/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: Number(form.produtoId),
          codigoLote: form.codigoLote,
          validade: form.validade || null,
          quantidade: Number(form.quantidade),
          custoUnitario: form.custoUnitario ? Number(form.custoUnitario) : null,
          observacao: form.observacao,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar entrada.");

      toast.success("Entrada de estoque registrada com sucesso!");

      setForm({
        produtoId: "", codigoLote: "", validade: "",
        quantidade: "", custoUnitario: "", observacao: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Entrada de Estoque</h1>
        <p className="text-sm text-slate-500">Registre a entrada de novos produtos no estoque físico</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <PackagePlus className="h-5 w-5 text-emerald-600" />
            Detalhes da Entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={salvar} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Produto *</label>
              <Select 
                value={form.produtoId} 
                onValueChange={(v) => setForm({ ...form, produtoId: v })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.codigoInterno ? `${p.codigoInterno} - ` : ""}
                      {p.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Código do Lote *</label>
                <Input
                  required
                  placeholder="Ex: LOTE-001"
                  value={form.codigoLote}
                  onChange={(e) => setForm({ ...form, codigoLote: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Data de Validade</label>
                <Input
                  type="date"
                  value={form.validade}
                  onChange={(e) => setForm({ ...form, validade: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Quantidade *</label>
                <Input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 50"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Custo Unitário (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.custoUnitario}
                  onChange={(e) => setForm({ ...form, custoUnitario: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Observação</label>
              <Textarea
                placeholder="Motivo da entrada, nota fiscal avulsa, etc."
                className="resize-none"
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-semibold">
              {loading ? "Salvando..." : "Registrar Entrada no Estoque"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}