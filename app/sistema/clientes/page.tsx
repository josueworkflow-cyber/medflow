"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";

type Cliente = {
  id: number; razaoSocial: string; nomeFantasia: string | null;
  cnpjCpf: string | null; email: string | null; telefone: string | null;
  cidade: string | null; estado: string | null; limiteCredito: number;
  logradouro: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cep: string | null; codigoMunicipio: string | null;
  inscricaoEstadual: string | null; inscricaoMunicipal: string | null;
  contribuinteICMS: boolean; consumidorFinal: boolean;
};

type Form = {
  razaoSocial: string; nomeFantasia: string; cnpjCpf: string;
  email: string; telefone: string;
  logradouro: string; numero: string; complemento: string; bairro: string;
  municipio: string; codigoMunicipio: string; uf: string; cep: string;
  inscricaoEstadual: string; inscricaoMunicipal: string;
  contribuinteICMS: boolean; consumidorFinal: boolean;
  limiteCredito: string;
};

const blankForm: Form = {
  razaoSocial: "", nomeFantasia: "", cnpjCpf: "", email: "",
  telefone: "", logradouro: "", numero: "", complemento: "", bairro: "",
  municipio: "", codigoMunicipio: "", uf: "", cep: "",
  inscricaoEstadual: "", inscricaoMunicipal: "",
  contribuinteICMS: false, consumidorFinal: false,
  limiteCredito: "0",
};

export default function ClientesPage() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [form, setForm] = useState<Form>(blankForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Form>(blankForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const carregar = () =>
    fetch("/api/clientes").then((r) => r.json()).then((d) => setLista(Array.isArray(d) ? d : []));

  useEffect(() => { carregar(); }, []);

  async function buscarCep(target: "create" | "edit") {
    const current = target === "create" ? form : editForm;
    const cep = current.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setErro("Informe um CEP com 8 dígitos para buscar.");
      return;
    }

    setErro("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error("CEP não encontrado.");

      const update = {
        cep,
        logradouro: data.logradouro || current.logradouro,
        bairro: data.bairro || current.bairro,
        municipio: data.localidade || current.municipio,
        codigoMunicipio: data.ibge || current.codigoMunicipio,
        uf: data.uf || current.uf,
      };

      if (target === "create") setForm((prev) => ({ ...prev, ...update }));
      else setEditForm((prev) => ({ ...prev, ...update }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao consultar CEP.");
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErro("");
    try {
      const res = await fetch("/api/clientes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cidade: form.municipio,
          estado: form.uf,
          limiteCredito: Number(form.limiteCredito),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(blankForm); carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  }

  function iniciarEdicao(c: Cliente) {
    setEditId(c.id);
    setEditForm({
      razaoSocial: c.razaoSocial, nomeFantasia: c.nomeFantasia || "", cnpjCpf: c.cnpjCpf || "",
      email: c.email || "", telefone: c.telefone || "",
      logradouro: c.logradouro || "", numero: c.numero || "", complemento: c.complemento || "",
      bairro: c.bairro || "", municipio: c.cidade || "", uf: c.estado || "",
      cep: c.cep || "", codigoMunicipio: c.codigoMunicipio || "",
      inscricaoEstadual: c.inscricaoEstadual || "", inscricaoMunicipal: c.inscricaoMunicipal || "",
      contribuinteICMS: c.contribuinteICMS || false,
      consumidorFinal: c.consumidorFinal || false,
      limiteCredito: String(c.limiteCredito),
    });
  }

  async function salvarEdicao() {
    if (!editId) return;
    setSaving(true); setErro("");
    try {
      const res = await fetch(`/api/clientes/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          cidade: editForm.municipio,
          estado: editForm.uf,
          limiteCredito: Number(editForm.limiteCredito),
        }),
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
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
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
        <p className="text-sm text-slate-500">Vendas</p>
        <h1 className="text-3xl font-semibold text-slate-900">Clientes</h1>
      </div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar cliente</h2>
              <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div><label className={label}>Razao social *</label><input className={input} value={editForm.razaoSocial} onChange={(e) => setEditForm({...editForm, razaoSocial: e.target.value})} /></div>
            <div><label className={label}>Nome fantasia</label><input className={input} value={editForm.nomeFantasia} onChange={(e) => setEditForm({...editForm, nomeFantasia: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>CNPJ / CPF</label><input className={input} value={editForm.cnpjCpf} onChange={(e) => setEditForm({...editForm, cnpjCpf: e.target.value})} /></div>
              <div><label className={label}>Telefone</label><input className={input} value={editForm.telefone} onChange={(e) => setEditForm({...editForm, telefone: e.target.value})} /></div>
            </div>
            <div><label className={label}>E-mail</label><input type="email" className={input} value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} /></div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div><label className={label}>CEP</label><input className={input} value={editForm.cep} onChange={(e) => setEditForm({...editForm, cep: e.target.value})} /></div>
              <button type="button" onClick={() => buscarCep("edit")} className="self-end rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Buscar CEP</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className={label}>Logradouro</label><input className={input} value={editForm.logradouro} onChange={(e) => setEditForm({...editForm, logradouro: e.target.value})} /></div>
              <div><label className={label}>Número</label><input className={input} value={editForm.numero} onChange={(e) => setEditForm({...editForm, numero: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Complemento</label><input className={input} value={editForm.complemento} onChange={(e) => setEditForm({...editForm, complemento: e.target.value})} /></div>
              <div><label className={label}>Bairro</label><input className={input} value={editForm.bairro} onChange={(e) => setEditForm({...editForm, bairro: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Município</label><input className={input} value={editForm.municipio} onChange={(e) => setEditForm({...editForm, municipio: e.target.value})} /></div>
              <div><label className={label}>UF</label><input className={input} value={editForm.uf} onChange={(e) => setEditForm({...editForm, uf: e.target.value.toUpperCase()})} maxLength={2} /></div>
              <div><label className={label}>Código IBGE</label><input className={input} value={editForm.codigoMunicipio} onChange={(e) => setEditForm({...editForm, codigoMunicipio: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Inscrição estadual</label><input className={input} value={editForm.inscricaoEstadual} onChange={(e) => setEditForm({...editForm, inscricaoEstadual: e.target.value})} /></div>
              <div><label className={label}>Inscrição municipal</label><input className={input} value={editForm.inscricaoMunicipal} onChange={(e) => setEditForm({...editForm, inscricaoMunicipal: e.target.value})} /></div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={editForm.contribuinteICMS} onChange={(e) => setEditForm({...editForm, contribuinteICMS: e.target.checked})} /> Contribuinte ICMS</label>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={editForm.consumidorFinal} onChange={(e) => setEditForm({...editForm, consumidorFinal: e.target.checked})} /> Consumidor final</label>
            </div>
            <div><label className={label}>Limite de credito (R$)</label><input type="number" step="0.01" className={input} value={editForm.limiteCredito} onChange={(e) => setEditForm({...editForm, limiteCredito: e.target.value})} /></div>
            <div className="flex gap-3 pt-2">
              <button onClick={salvarEdicao} disabled={saving} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar alteracoes"}</button>
              <button onClick={() => setEditId(null)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Novo cliente</h2>
          <div><label className={label}>Razao social *</label><input className={input} value={form.razaoSocial} onChange={(e) => setForm({...form, razaoSocial: e.target.value})} required /></div>
          <div><label className={label}>Nome fantasia</label><input className={input} value={form.nomeFantasia} onChange={(e) => setForm({...form, nomeFantasia: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>CNPJ / CPF</label><input className={input} value={form.cnpjCpf} onChange={(e) => setForm({...form, cnpjCpf: e.target.value})} /></div>
            <div><label className={label}>Telefone</label><input className={input} value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} /></div>
          </div>
          <div><label className={label}>E-mail</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div><label className={label}>CEP</label><input className={input} value={form.cep} onChange={(e) => setForm({...form, cep: e.target.value})} /></div>
            <button type="button" onClick={() => buscarCep("create")} className="self-end rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Buscar CEP</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className={label}>Logradouro</label><input className={input} value={form.logradouro} onChange={(e) => setForm({...form, logradouro: e.target.value})} /></div>
            <div><label className={label}>Número</label><input className={input} value={form.numero} onChange={(e) => setForm({...form, numero: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Complemento</label><input className={input} value={form.complemento} onChange={(e) => setForm({...form, complemento: e.target.value})} /></div>
            <div><label className={label}>Bairro</label><input className={input} value={form.bairro} onChange={(e) => setForm({...form, bairro: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Município</label><input className={input} value={form.municipio} onChange={(e) => setForm({...form, municipio: e.target.value})} /></div>
            <div><label className={label}>UF</label><input className={input} value={form.uf} onChange={(e) => setForm({...form, uf: e.target.value.toUpperCase()})} maxLength={2} /></div>
            <div><label className={label}>Código IBGE</label><input className={input} value={form.codigoMunicipio} onChange={(e) => setForm({...form, codigoMunicipio: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Inscrição estadual</label><input className={input} value={form.inscricaoEstadual} onChange={(e) => setForm({...form, inscricaoEstadual: e.target.value})} /></div>
            <div><label className={label}>Inscrição municipal</label><input className={input} value={form.inscricaoMunicipal} onChange={(e) => setForm({...form, inscricaoMunicipal: e.target.value})} /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.contribuinteICMS} onChange={(e) => setForm({...form, contribuinteICMS: e.target.checked})} /> Contribuinte ICMS</label>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.consumidorFinal} onChange={(e) => setForm({...form, consumidorFinal: e.target.checked})} /> Consumidor final</label>
          </div>
          <div><label className={label}>Limite de credito (R$)</label><input type="number" step="0.01" className={input} value={form.limiteCredito} onChange={(e) => setForm({...form, limiteCredito: e.target.value})} /></div>
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
                  <th className="px-3 py-2">Razao Social</th><th className="px-3 py-2">CNPJ/CPF</th>
                  <th className="px-3 py-2">Telefone</th><th className="px-3 py-2">Cidade/UF</th>
                  <th className="px-3 py-2">Limite</th><th className="px-3 py-2">Acoes</th>
                </tr></thead>
                <tbody>{lista.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{c.razaoSocial}</td>
                    <td className="px-3 py-2 text-slate-500">{c.cnpjCpf || "—"}</td>
                    <td className="px-3 py-2">{c.telefone || "—"}</td>
                    <td className="px-3 py-2">{c.cidade ? `${c.cidade}/${c.estado}` : "—"}</td>
                    <td className="px-3 py-2">R$ {c.limiteCredito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => iniciarEdicao(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => { if (confirm(`Excluir cliente "${c.razaoSocial}"?`)) excluir(c.id); }} disabled={deletingId === c.id} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40" title="Excluir"><Trash2 className="h-4 w-4" /></button>
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
