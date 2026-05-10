"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";

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
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Form>(blankForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  function iniciarEdicao(f: Fornecedor) {
    setEditId(f.id);
    setEditForm({
      razaoSocial: f.razaoSocial, nomeFantasia: f.nomeFantasia || "", cnpj: f.cnpj || "",
      email: f.email || "", telefone: f.telefone || "", endereco: "",
      cidade: f.cidade || "", estado: f.estado || "", cep: "",
    });
  }

  async function salvarEdicao() {
    if (!editId) return;
    setSaving(true); setErro("");
    try {
      const res = await fetch(`/api/fornecedores/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
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
      const res = await fetch(`/api/fornecedores/${id}`, { method: "DELETE" });
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
      <div>
        <p className="text-sm text-slate-500">Compras</p>
        <h1 className="text-3xl font-semibold text-slate-900">Fornecedores</h1>
      </div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar fornecedor</h2>
              <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div><label className={label}>Razao social *</label><input className={input} value={editForm.razaoSocial} onChange={(e) => setEditForm({...editForm, razaoSocial: e.target.value})} /></div>
            <div><label className={label}>Nome fantasia</label><input className={input} value={editForm.nomeFantasia} onChange={(e) => setEditForm({...editForm, nomeFantasia: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>CNPJ</label><input className={input} value={editForm.cnpj} onChange={(e) => setEditForm({...editForm, cnpj: e.target.value})} /></div>
              <div><label className={label}>Telefone</label><input className={input} value={editForm.telefone} onChange={(e) => setEditForm({...editForm, telefone: e.target.value})} /></div>
            </div>
            <div><label className={label}>E-mail</label><input type="email" className={input} value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} /></div>
            <div><label className={label}>Endereco</label><input className={input} value={editForm.endereco} onChange={(e) => setEditForm({...editForm, endereco: e.target.value})} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Cidade</label><input className={input} value={editForm.cidade} onChange={(e) => setEditForm({...editForm, cidade: e.target.value})} /></div>
              <div><label className={label}>Estado</label><input className={input} value={editForm.estado} onChange={(e) => setEditForm({...editForm, estado: e.target.value})} maxLength={2} /></div>
              <div><label className={label}>CEP</label><input className={input} value={editForm.cep} onChange={(e) => setEditForm({...editForm, cep: e.target.value})} /></div>
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
          <h2 className="text-lg font-semibold">Novo fornecedor</h2>
          <div><label className={label}>Razao social *</label><input className={input} value={form.razaoSocial} onChange={(e) => setForm({...form, razaoSocial: e.target.value})} required /></div>
          <div><label className={label}>Nome fantasia</label><input className={input} value={form.nomeFantasia} onChange={(e) => setForm({...form, nomeFantasia: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>CNPJ</label><input className={input} value={form.cnpj} onChange={(e) => setForm({...form, cnpj: e.target.value})} placeholder="00.000.000/0000-00" /></div>
            <div><label className={label}>Telefone</label><input className={input} value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} /></div>
          </div>
          <div><label className={label}>E-mail</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
          <div><label className={label}>Endereco</label><input className={input} value={form.endereco} onChange={(e) => setForm({...form, endereco: e.target.value})} /></div>
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
                  <th className="px-3 py-2">Razao Social</th><th className="px-3 py-2">CNPJ</th>
                  <th className="px-3 py-2">Telefone</th><th className="px-3 py-2">Cidade/UF</th>
                  <th className="px-3 py-2">Acoes</th>
                </tr></thead>
                <tbody>{lista.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{f.razaoSocial}</td>
                    <td className="px-3 py-2 text-slate-500">{f.cnpj || "—"}</td>
                    <td className="px-3 py-2">{f.telefone || "—"}</td>
                    <td className="px-3 py-2">{f.cidade ? `${f.cidade}/${f.estado}` : "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => iniciarEdicao(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => { if (confirm(`Excluir fornecedor "${f.razaoSocial}"?`)) excluir(f.id); }} disabled={deletingId === f.id} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
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
