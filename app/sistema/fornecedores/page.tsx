"use client";
import { useEffect, useState } from "react";

type Fornecedor = {
  id: number; razaoSocial: string; nomeFantasia: string | null;
  cnpj: string | null; email: string | null; telefone: string | null;
  cidade: string | null; estado: string | null;
};

type Form = {
  razaoSocial: string; nomeFantasia: string; cnpj: string;
  email: string; telefone: string; endereco: string;
  cidade: string; estado: string; cep: string;
};

const blankForm: Form = {
  razaoSocial: "", nomeFantasia: "", cnpj: "", email: "",
  telefone: "", endereco: "", cidade: "", estado: "", cep: "",
};

export default function FornecedoresPage() {
  const [lista, setLista] = useState<Fornecedor[]>([]);
  const [form, setForm] = useState<Form>(blankForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = () =>
    fetch("/api/fornecedores").then((r) => r.json()).then((d) => setLista(Array.isArray(d) ? d : []));

  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErro("");
    try {
      const res = await fetch("/api/fornecedores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        <p className="text-sm text-slate-500">Compras</p>
        <h1 className="text-3xl font-semibold text-slate-900">Fornecedores</h1>
      </div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Novo fornecedor</h2>
          <div><label className={label}>Razão social *</label><input className={input} value={form.razaoSocial} onChange={(e) => setForm({...form, razaoSocial: e.target.value})} required /></div>
          <div><label className={label}>Nome fantasia</label><input className={input} value={form.nomeFantasia} onChange={(e) => setForm({...form, nomeFantasia: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>CNPJ</label><input className={input} value={form.cnpj} onChange={(e) => setForm({...form, cnpj: e.target.value})} placeholder="00.000.000/0000-00" /></div>
            <div><label className={label}>Telefone</label><input className={input} value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} /></div>
          </div>
          <div><label className={label}>E-mail</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
          <div><label className={label}>Endereço</label><input className={input} value={form.endereco} onChange={(e) => setForm({...form, endereco: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Cidade</label><input className={input} value={form.cidade} onChange={(e) => setForm({...form, cidade: e.target.value})} /></div>
            <div><label className={label}>Estado</label><input className={input} value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})} maxLength={2} /></div>
            <div><label className={label}>CEP</label><input className={input} value={form.cep} onChange={(e) => setForm({...form, cep: e.target.value})} /></div>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar fornecedor"}</button>
        </form>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fornecedores cadastrados</h2>
            <span className="text-sm text-slate-500">{lista.length} itens</span>
          </div>
          {lista.length === 0 ? <p className="text-sm text-slate-500">Nenhum fornecedor cadastrado.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead><tr className="border-b text-left text-xs text-slate-500">
                  <th className="px-3 py-2">Razão Social</th><th className="px-3 py-2">CNPJ</th>
                  <th className="px-3 py-2">Telefone</th><th className="px-3 py-2">Cidade/UF</th>
                </tr></thead>
                <tbody>{lista.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{f.razaoSocial}</td>
                    <td className="px-3 py-2 text-slate-500">{f.cnpj || "—"}</td>
                    <td className="px-3 py-2">{f.telefone || "—"}</td>
                    <td className="px-3 py-2">{f.cidade ? `${f.cidade}/${f.estado}` : "—"}</td>
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
