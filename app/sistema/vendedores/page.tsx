"use client";
import { useEffect, useState } from "react";

type Vendedor = {
  id: number; nome: string; email: string | null;
  telefone: string | null; comissao: number; metaMensal: number;
};

export default function VendedoresPage() {
  const [lista, setLista] = useState<Vendedor[]>([]);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", comissao: "0", metaMensal: "0" });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

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
      setForm({ nome: "", email: "", telefone: "", comissao: "0", metaMensal: "0" }); carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
    finally { setSaving(false); }
  }

  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Vendas</p><h1 className="text-3xl font-semibold">Vendedores</h1></div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Novo vendedor</h2>
          <div><label className={label}>Nome *</label><input className={input} value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>E-mail</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
            <div><label className={label}>Telefone</label><input className={input} value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Comissão (%)</label><input type="number" step="0.1" className={input} value={form.comissao} onChange={(e) => setForm({...form, comissao: e.target.value})} /></div>
            <div><label className={label}>Meta mensal (R$)</label><input type="number" step="0.01" className={input} value={form.metaMensal} onChange={(e) => setForm({...form, metaMensal: e.target.value})} /></div>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar vendedor"}</button>
        </form>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Vendedores cadastrados</h2><span className="text-sm text-slate-500">{lista.length}</span></div>
          {lista.length === 0 ? <p className="text-sm text-slate-500">Nenhum vendedor cadastrado.</p> : (
            <div className="overflow-x-auto"><table className="min-w-full border-collapse text-sm">
              <thead><tr className="border-b text-left text-xs text-slate-500"><th className="px-3 py-2">Nome</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Comissão</th><th className="px-3 py-2">Meta</th></tr></thead>
              <tbody>{lista.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">{v.nome}</td><td className="px-3 py-2 text-slate-500">{v.email || "—"}</td>
                  <td className="px-3 py-2">{v.comissao}%</td>
                  <td className="px-3 py-2">R$ {v.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </section>
    </main>
  );
}
