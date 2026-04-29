"use client";
import { useEffect, useState } from "react";

type Produto = { id: number; descricao: string; codigoInterno: string | null };
type Fornecedor = { id: number; razaoSocial: string };
type ItemForm = { produtoId: string; quantidade: string; precoUnitario: string };
type Pedido = {
  id: number; numero: string; status: string; valorTotal: number; createdAt: string;
  fornecedor: { razaoSocial: string };
  itens: { produto: { descricao: string }; quantidade: number; precoUnitario: number; subtotal: number }[];
};

const statusLabel: Record<string, string> = {
  RASCUNHO: "📝 Rascunho", ENVIADO: "📤 Enviado", PARCIAL: "📦 Parcial",
  RECEBIDO: "✅ Recebido", CANCELADO: "❌ Cancelado",
};

export default function ComprasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorId, setFornecedorId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([{ produtoId: "", quantidade: "1", precoUnitario: "0" }]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/compras").then((r) => r.json()).then((d) => setPedidos(Array.isArray(d) ? d : []));
    fetch("/api/produto").then((r) => r.json()).then((d) => setProdutos(Array.isArray(d) ? d : []));
    fetch("/api/fornecedores").then((r) => r.json()).then((d) => setFornecedores(Array.isArray(d) ? d : []));
  }, []);

  function addItem() { setItens([...itens, { produtoId: "", quantidade: "1", precoUnitario: "0" }]); }
  function removeItem(i: number) { setItens(itens.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof ItemForm, value: string) {
    const copy = [...itens]; copy[i] = { ...copy[i], [field]: value }; setItens(copy);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErro("");
    try {
      const res = await fetch("/api/compras", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedorId: Number(fornecedorId), observacao,
          itens: itens.map((i) => ({ produtoId: Number(i.produtoId), quantidade: Number(i.quantidade), precoUnitario: Number(i.precoUnitario) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFornecedorId(""); setObservacao(""); setItens([{ produtoId: "", quantidade: "1", precoUnitario: "0" }]);
      fetch("/api/compras").then((r) => r.json()).then(setPedidos);
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
    finally { setSaving(false); }
  }

  const total = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.precoUnitario), 0);
  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Compras</p><h1 className="text-3xl font-semibold">Pedidos de Compra</h1></div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
      <div className="grid gap-6 lg:grid-cols-[480px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Novo pedido de compra</h2>
          <div><label className={label}>Fornecedor *</label>
            <select className={input} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} required>
              <option value="">Selecione...</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><label className="text-xs font-semibold uppercase text-slate-400">Itens</label>
              <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Adicionar item</button>
            </div>
            {itens.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_30px] gap-2 items-end">
                <div><label className={label}>Produto</label>
                  <select className={input} value={item.produtoId} onChange={(e) => updateItem(i, "produtoId", e.target.value)} required>
                    <option value="">Selecione...</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.descricao}</option>)}
                  </select>
                </div>
                <div><label className={label}>Qtd</label><input type="number" min="1" className={input} value={item.quantidade} onChange={(e) => updateItem(i, "quantidade", e.target.value)} /></div>
                <div><label className={label}>Preço</label><input type="number" step="0.01" className={input} value={item.precoUnitario} onChange={(e) => updateItem(i, "precoUnitario", e.target.value)} /></div>
                <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 pb-2">✕</button>
              </div>
            ))}
          </div>
          <div className="text-right text-sm font-semibold">Total: R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          <div><label className={label}>Observação</label><textarea className={input} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Criar pedido"}</button>
        </form>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Pedidos de compra</h2>
          {pedidos.length === 0 ? <p className="text-sm text-slate-500">Nenhum pedido.</p> : (
            <div className="overflow-x-auto"><table className="min-w-full border-collapse text-sm">
              <thead><tr className="border-b text-left text-xs text-slate-500"><th className="px-3 py-2">Nº</th><th className="px-3 py-2">Fornecedor</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Data</th></tr></thead>
              <tbody>{pedidos.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.numero.slice(0, 8)}</td>
                  <td className="px-3 py-2">{p.fornecedor.razaoSocial}</td>
                  <td className="px-3 py-2">{statusLabel[p.status] || p.status}</td>
                  <td className="px-3 py-2">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-slate-500">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </main>
  );
}
