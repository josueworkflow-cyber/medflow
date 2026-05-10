"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";

type Vendedor = {
  id: number; nome: string; email: string | null;
  telefone: string | null; comissao: number; metaMensal: number;
};

const blankForm = { nome: "", email: "", telefone: "", comissao: "0", metaMensal: "0" };

export default function VendedoresPage() {
  const [lista, setLista] = useState<Vendedor[]>([]);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(blankForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const carregar = () => fetch("/api/vendedores").then((r) => r.json()).then((d) => setLista(Array.isArray(d) ? d : []));
  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErro("");
    try {
      const res = await fetch("/api/vendedores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, comissao: Number(form.comissao), metaMensal: Number(form.metaMensal) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(blankForm); carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
    finally { setSaving(false); }
  }

  function iniciarEdicao(v: Vendedor) {
    setEditId(v.id);
    setEditForm({
      nome: v.nome, email: v.email || "", telefone: v.telefone || "",
      comissao: String(v.comissao), metaMensal: String(v.metaMensal),
    });
  }

  async function salvarEdicao() {
    if (!editId) return;
    setSaving(true); setErro("");
    try {
      const res = await fetch(`/api/vendedores/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, comissao: Number(editForm.comissao), metaMensal: Number(editForm.metaMensal) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditId(null); carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao atualizar."); }
    finally { setSaving(false); }
  }

  async function excluir(id: number) {
    setDeletingId(id); setErro("");
    try {
      const res = await fetch(`/api/vendedores/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao excluir."); }
    finally { setDeletingId(null); }
  }

  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Vendas</p><h1 className="text-3xl font-semibold">Vendedores</h1></div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar vendedor</h2>
              <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div><label className={label}>Nome *</label><input className={input} value={editForm.nome} onChange={(e) => setEditForm({...editForm, nome: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>E-mail</label><input type="email" className={input} value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} /></div>
              <div><label className={label}>Telefone</label><input className={input} value={editForm.telefone} onChange={(e) => setEditForm({...editForm, telefone: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Comissao (%)</label><input type="number" step="0.1" className={input} value={editForm.comissao} onChange={(e) => setEditForm({...editForm, comissao: e.target.value})} /></div>
              <div><label className={label}>Meta mensal (R$)</label><input type="number" step="0.01" className={input} value={editForm.metaMensal} onChange={(e) => setEditForm({...editForm, metaMensal: e.target.value})} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={salvarEdicao} disabled={saving} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar alteracoes"}</button>
              <button onClick={() => setEditId(null)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Novo vendedor</h2>
          <div><label className={label}>Nome *</label><input className={input} value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>E-mail</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
            <div><label className={label}>Telefone</label><input className={input} value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Comissao (%)</label><input type="number" step="0.1" className={input} value={form.comissao} onChange={(e) => setForm({...form, comissao: e.target.value})} /></div>
            <div><label className={label}>Meta mensal (R$)</label><input type="number" step="0.01" className={input} value={form.metaMensal} onChange={(e) => setForm({...form, metaMensal: e.target.value})} /></div>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar vendedor"}</button>
        </form>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Vendedores cadastrados</h2><span className="text-sm text-slate-500">{lista.length}</span></div>
          {lista.length === 0 ? <p className="text-sm text-slate-500">Nenhum vendedor cadastrado.</p> : (
            <div className="overflow-x-auto"><table className="min-w-full border-collapse text-sm">
              <thead><tr className="border-b text-left text-xs text-slate-500"><th className="px-3 py-2">Nome</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Comissao</th><th className="px-3 py-2">Meta</th><th className="px-3 py-2">Acoes</th></tr></thead>
              <tbody>{lista.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">{v.nome}</td><td className="px-3 py-2 text-slate-500">{v.email || "—"}</td>
                  <td className="px-3 py-2">{v.comissao}%</td>
                  <td className="px-3 py-2">R$ {v.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => iniciarEdicao(v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm(`Excluir vendedor "${v.nome}"?`)) excluir(v.id); }} disabled={deletingId === v.id} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </section>
    </main>
  );
}
