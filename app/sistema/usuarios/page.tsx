"use client";
import { useEffect, useState } from "react";

type Usuario = {
  id: number; nome: string; email: string; perfil: string; createdAt: string;
};

const perfilLabel: Record<string, string> = {
  ADMINISTRADOR: "👑 Administrador", VENDAS: "💰 Vendas",
  ESTOQUE: "📦 Estoque", FINANCEIRO: "🏦 Financeiro",
};

const perfilStyle: Record<string, string> = {
  ADMINISTRADOR: "bg-purple-100 text-purple-700", VENDAS: "bg-green-100 text-green-700",
  ESTOQUE: "bg-blue-100 text-blue-700", FINANCEIRO: "bg-amber-100 text-amber-700",
};

export default function UsuariosPage() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfil: "VENDAS" });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = () => fetch("/api/usuarios").then((r) => r.json()).then((d) => setLista(Array.isArray(d) ? d : []));
  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErro(""); setSucesso("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ nome: "", email: "", senha: "", perfil: "VENDAS" });
      setSucesso("Usuário criado com sucesso!");
      carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
    finally { setSaving(false); }
  }

  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Configurações</p><h1 className="text-3xl font-semibold">Controle de Usuários</h1>
        <p className="text-sm text-slate-400 mt-1">Gestão de acesso e permissões do sistema</p>
      </div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
      {sucesso && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{sucesso}</div>}
      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Novo usuário</h2>
          <div><label className={label}>Nome completo *</label><input className={input} value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} required /></div>
          <div><label className={label}>E-mail *</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
          <div><label className={label}>Senha *</label><input type="password" className={input} value={form.senha} onChange={(e) => setForm({...form, senha: e.target.value})} required minLength={6} /></div>
          <div><label className={label}>Perfil de acesso *</label>
            <select className={input} value={form.perfil} onChange={(e) => setForm({...form, perfil: e.target.value})}>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="VENDAS">Vendas</option>
              <option value="ESTOQUE">Estoque</option>
              <option value="FINANCEIRO">Financeiro</option>
            </select>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-semibold mb-1">Permissões por perfil:</p>
            <p>👑 <strong>Admin</strong> — Acesso total</p>
            <p>💰 <strong>Vendas</strong> — Pedidos, clientes, vendedores</p>
            <p>📦 <strong>Estoque</strong> — Produtos, movimentações, alertas</p>
            <p>🏦 <strong>Financeiro</strong> — Contas, fluxo de caixa</p>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Criar usuário"}</button>
        </form>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Usuários cadastrados</h2><span className="text-sm text-slate-500">{lista.length}</span></div>
          {lista.length === 0 ? <p className="text-sm text-slate-500">Nenhum usuário cadastrado.</p> : (
            <div className="overflow-x-auto"><table className="min-w-full border-collapse text-sm">
              <thead><tr className="border-b text-left text-xs text-slate-500"><th className="px-3 py-2">Nome</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Desde</th></tr></thead>
              <tbody>{lista.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{u.nome}</td>
                  <td className="px-3 py-2 text-slate-500">{u.email}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${perfilStyle[u.perfil]}`}>{perfilLabel[u.perfil]}</span></td>
                  <td className="px-3 py-2 text-slate-500">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </section>
    </main>
  );
}
