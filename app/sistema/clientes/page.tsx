"use client";
import { useEffect, useState } from "react";

type Cliente = {
  id: number; razaoSocial: string; nomeFantasia: string | null;
  cnpjCpf: string | null; email: string | null; telefone: string | null;
  cidade: string | null; estado: string | null; limiteCredito: number;
};

type Form = {
  razaoSocial: string; nomeFantasia: string; cnpjCpf: string;
  email: string; telefone: string; endereco: string;
  cidade: string; estado: string; cep: string; limiteCredito: string;
};

const blankForm: Form = {
  razaoSocial: "", nomeFantasia: "", cnpjCpf: "", email: "",
  telefone: "", endereco: "", cidade: "", estado: "", cep: "", limiteCredito: "0",
};

export default function ClientesPage() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [form, setForm] = useState<Form>(blankForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = () =>
    fetch("/api/clientes").then((r) => r.json()).then((d) => setLista(Array.isArray(d) ? d : []));

  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErro("");
    try {
      const res = await fetch("/api/clientes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, limiteCredito: Number(form.limiteCredito) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(blankForm); carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  }

  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <main className="p-6 space-y-6">
      <div>
        <p className="text-sm text-slate-500">Vendas</p>
        <h1 className="text-3xl font-semibold text-slate-900">Clientes</h1>
      </div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Novo cliente</h2>
          <div><label className={label}>Razão social *</label><input className={input} value={form.razaoSocial} onChange={(e) => setForm({...form, razaoSocial: e.target.value})} required /></div>
          <div><label className={label}>Nome fantasia</label><input className={input} value={form.nomeFantasia} onChange={(e) => setForm({...form, nomeFantasia: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>CNPJ / CPF</label><input className={input} value={form.cnpjCpf} onChange={(e) => setForm({...form, cnpjCpf: e.target.value})} /></div>
            <div><label className={label}>Telefone</label><input className={input} value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} /></div>
          </div>
          <div><label className={label}>E-mail</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
          <div><label className={label}>Endereço</label><input className={input} value={form.endereco} onChange={(e) => setForm({...form, endereco: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Cidade</label><input className={input} value={form.cidade} onChange={(e) => setForm({...form, cidade: e.target.value})} /></div>
            <div><label className={label}>Estado</label><input className={input} value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})} maxLength={2} /></div>
            <div><label className={label}>CEP</label><input className={input} value={form.cep} onChange={(e) => setForm({...form, cep: e.target.value})} /></div>
          </div>
          <div><label className={label}>Limite de crédito (R$)</label><input type="number" step="0.01" className={input} value={form.limiteCredito} onChange={(e) => setForm({...form, limiteCredito: e.target.value})} /></div>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar cliente"}</button>
        </form>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Clientes cadastrados</h2>
            <span className="text-sm text-slate-500">{lista.length} itens</span>
          </div>
          {lista.length === 0 ? <p className="text-sm text-slate-500">Nenhum cliente cadastrado.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead><tr className="border-b text-left text-xs text-slate-500">
                  <th className="px-3 py-2">Razão Social</th><th className="px-3 py-2">CNPJ/CPF</th>
                  <th className="px-3 py-2">Telefone</th><th className="px-3 py-2">Cidade/UF</th>
                  <th className="px-3 py-2">Limite</th>
                </tr></thead>
                <tbody>{lista.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{c.razaoSocial}</td>
                    <td className="px-3 py-2 text-slate-500">{c.cnpjCpf || "—"}</td>
                    <td className="px-3 py-2">{c.telefone || "—"}</td>
                    <td className="px-3 py-2">{c.cidade ? `${c.cidade}/${c.estado}` : "—"}</td>
                    <td className="px-3 py-2">R$ {c.limiteCredito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
