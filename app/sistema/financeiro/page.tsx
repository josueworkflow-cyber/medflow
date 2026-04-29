"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Conta = {
  id: number; tipo: string; descricao: string; valor: number;
  dataVencimento: string; dataPagamento: string | null; status: string;
  cliente: { razaoSocial: string } | null; fornecedor: { razaoSocial: string } | null;
};
type Resumo = {
  aReceber: number; qtdReceber: number; aPagar: number; qtdPagar: number;
  recebidoMes: number; pagoMes: number; saldoMes: number; vencidas: number;
};

const statusColor: Record<string, string> = {
  ABERTA: "text-blue-600", PAGA: "text-green-600", VENCIDA: "text-red-600", CANCELADA: "text-slate-400",
};

export default function FinanceiroPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [tab, setTab] = useState<"RECEBER" | "PAGAR">("RECEBER");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ tipo: "RECEBER" as string, descricao: "", valor: "", dataVencimento: "", observacao: "" });

  const carregar = () => {
    fetch("/api/financeiro").then((r) => r.json()).then((d) => setContas(Array.isArray(d) ? d : []));
    fetch("/api/financeiro/resumo").then((r) => r.json()).then(setResumo);
  };
  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErro("");
    try {
      const res = await fetch("/api/financeiro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ tipo: "RECEBER", descricao: "", valor: "", dataVencimento: "", observacao: "" });
      carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro."); }
    finally { setSaving(false); }
  }

  async function baixar(id: number) {
    await fetch(`/api/financeiro/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAGA" }),
    });
    carregar();
  }

  const filtradas = contas.filter((c) => c.tipo === tab);
  const r = resumo || { aReceber: 0, qtdReceber: 0, aPagar: 0, qtdPagar: 0, recebidoMes: 0, pagoMes: 0, saldoMes: 0, vencidas: 0 };
  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Financeiro</p><h1 className="text-3xl font-semibold">Gestão Financeira</h1></div>
      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">A receber</p><h3 className="text-2xl font-semibold mt-2 text-green-600">R$ {r.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3><p className="text-xs text-slate-400">{r.qtdReceber} contas</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">A pagar</p><h3 className="text-2xl font-semibold mt-2 text-red-600">R$ {r.aPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3><p className="text-xs text-slate-400">{r.qtdPagar} contas</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Saldo do mês</p><h3 className={`text-2xl font-semibold mt-2 ${r.saldoMes >= 0 ? "text-green-600" : "text-red-600"}`}>R$ {r.saldoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3></CardContent></Card>
        <Card className={r.vencidas > 0 ? "border-red-200" : ""}><CardContent className="p-5"><p className="text-sm text-slate-500">Vencidas</p><h3 className={`text-2xl font-semibold mt-2 ${r.vencidas > 0 ? "text-red-600" : ""}`}>{r.vencidas}</h3></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Nova conta</h2>
          <div><label className={label}>Tipo *</label>
            <select className={input} value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})}> 
              <option value="RECEBER">A receber</option><option value="PAGAR">A pagar</option>
            </select>
          </div>
          <div><label className={label}>Descrição *</label><input className={input} value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Valor (R$) *</label><input type="number" step="0.01" className={input} value={form.valor} onChange={(e) => setForm({...form, valor: e.target.value})} required /></div>
            <div><label className={label}>Vencimento *</label><input type="date" className={input} value={form.dataVencimento} onChange={(e) => setForm({...form, dataVencimento: e.target.value})} required /></div>
          </div>
          <div><label className={label}>Observação</label><textarea className={input} value={form.observacao} onChange={(e) => setForm({...form, observacao: e.target.value})} /></div>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar conta"}</button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab("RECEBER")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "RECEBER" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>A receber</button>
            <button onClick={() => setTab("PAGAR")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "PAGAR" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>A pagar</button>
          </div>
          {filtradas.length === 0 ? <p className="text-sm text-slate-500">Nenhuma conta.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-2 px-3">Descrição</th><th className="px-3">Valor</th><th className="px-3">Vencimento</th><th className="px-3">Status</th><th className="px-3">Ações</th></tr></thead>
              <tbody>{filtradas.map((c) => (
                <tr key={c.id} className="border-b hover:bg-slate-50">
                  <td className="py-2 px-3">{c.descricao}<br /><span className="text-xs text-slate-400">{c.cliente?.razaoSocial || c.fornecedor?.razaoSocial || ""}</span></td>
                  <td className="px-3">R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3">{new Date(c.dataVencimento).toLocaleDateString("pt-BR")}</td>
                  <td className={`px-3 font-medium ${statusColor[c.status]}`}>{c.status}</td>
                  <td className="px-3">{c.status === "ABERTA" && <button onClick={() => baixar(c.id)} className="text-xs text-green-600 hover:underline">Baixar</button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </main>
  );
}
