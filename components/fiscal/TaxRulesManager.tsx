"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Natureza = {
  id: number;
  codigo: string;
  nome: string;
  tipoOperacao: string;
  finalidadeNFe: number;
  ativa: boolean;
  padrao: boolean;
  _count?: { regras: number };
};

type Regra = Record<string, any> & { id: number; nome: string; ativa: boolean; cfop: string; prioridade: number };

const emptyNature = { codigo: "", nome: "", finalidadeNFe: "1", padrao: false };

function emptyRule(regimeTributario?: string | null) {
  return {
    nome: "", prioridade: "100", produtoId: "", ncmPrefixo: "", ufDestino: "",
    contribuinteICMS: "QUALQUER", consumidorFinal: "QUALQUER", cfop: "",
    origemMercadoria: "0", cstIcms: regimeTributario === "SIMPLES_NACIONAL" ? "" : "00",
    csosn: regimeTributario === "SIMPLES_NACIONAL" ? "102" : "",
    modalidadeBcIcms: "3", aliquotaIcms: "0", reducaoBaseIcms: "0", aliquotaFcp: "0",
    modalidadeBcSt: "4", mvaSt: "0", aliquotaIcmsSt: "0", aliquotaFcpSt: "0",
    aliquotaInterestadual: "", aliquotaInternaDestino: "", cstIpi: "53", aliquotaIpi: "0",
    codigoEnquadramentoIpi: "999", cstPis: "07", aliquotaPis: "0", cstCofins: "07",
    aliquotaCofins: "0", informacoesComplementares: "", ativa: true,
  };
}

const finalidadeLabel: Record<number, string> = { 1: "Normal", 2: "Complementar", 3: "Ajuste", 4: "Devolução" };

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function boolFilter(value: string): boolean | null {
  if (value === "SIM") return true;
  if (value === "NAO") return false;
  return null;
}

export default function TaxRulesManager({ empresaFiscalId, regimeTributario }: { empresaFiscalId: number; regimeTributario?: string | null }) {
  const [naturezas, setNaturezas] = useState<Natureza[]>([]);
  const [naturezaId, setNaturezaId] = useState<number | null>(null);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNatureForm, setShowNatureForm] = useState(false);
  const [natureForm, setNatureForm] = useState(emptyNature);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState(() => emptyRule(regimeTributario));
  const [saving, setSaving] = useState(false);

  const loadNaturezas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/fiscal/naturezas?empresaFiscalId=${empresaFiscalId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNaturezas(data);
      setNaturezaId((current) => current && data.some((item: Natureza) => item.id === current)
        ? current
        : data.find((item: Natureza) => item.padrao)?.id || data[0]?.id || null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar naturezas fiscais.");
    } finally {
      setLoading(false);
    }
  }, [empresaFiscalId]);

  const loadRegras = useCallback(async () => {
    if (!naturezaId) { setRegras([]); return; }
    try {
      const response = await fetch(`/api/fiscal/regras?empresaFiscalId=${empresaFiscalId}&naturezaOperacaoId=${naturezaId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRegras(data);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar regras tributárias.");
    }
  }, [empresaFiscalId, naturezaId]);

  useEffect(() => { loadNaturezas(); }, [loadNaturezas]);
  useEffect(() => { loadRegras(); }, [loadRegras]);
  useEffect(() => { setRuleForm(emptyRule(regimeTributario)); }, [regimeTributario, empresaFiscalId]);

  async function saveNature() {
    setSaving(true);
    try {
      const response = await fetch("/api/fiscal/naturezas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaFiscalId, codigo: natureForm.codigo, nome: natureForm.nome,
          tipoOperacao: "SAIDA", finalidadeNFe: Number(natureForm.finalidadeNFe), padrao: natureForm.padrao,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Natureza fiscal criada.");
      setNatureForm(emptyNature);
      setShowNatureForm(false);
      await loadNaturezas();
      setNaturezaId(data.id);
    } catch (error: any) { toast.error(error.message); }
    finally { setSaving(false); }
  }

  async function setDefault(natureza: Natureza) {
    const response = await fetch(`/api/fiscal/naturezas/${natureza.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ padrao: true }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    toast.success("Natureza padrão atualizada.");
    loadNaturezas();
  }

  async function disableNature(natureza: Natureza) {
    if (!window.confirm(`Desativar a natureza ${natureza.nome}?`)) return;
    const response = await fetch(`/api/fiscal/naturezas/${natureza.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    toast.success("Natureza desativada.");
    loadNaturezas();
  }

  function editRule(rule: Regra) {
    const value = (field: string) => rule[field] === null || rule[field] === undefined ? "" : String(rule[field]);
    setRuleForm({
      nome: rule.nome, prioridade: value("prioridade"), produtoId: value("produtoId"), ncmPrefixo: value("ncmPrefixo"),
      ufDestino: value("ufDestino"), contribuinteICMS: rule.contribuinteICMS === null ? "QUALQUER" : rule.contribuinteICMS ? "SIM" : "NAO",
      consumidorFinal: rule.consumidorFinal === null ? "QUALQUER" : rule.consumidorFinal ? "SIM" : "NAO", cfop: rule.cfop,
      origemMercadoria: value("origemMercadoria") || "0", cstIcms: value("cstIcms"), csosn: value("csosn"),
      modalidadeBcIcms: value("modalidadeBcIcms") || "3", aliquotaIcms: value("aliquotaIcms"), reducaoBaseIcms: value("reducaoBaseIcms"),
      aliquotaFcp: value("aliquotaFcp"), modalidadeBcSt: value("modalidadeBcSt") || "4", mvaSt: value("mvaSt"),
      aliquotaIcmsSt: value("aliquotaIcmsSt"), aliquotaFcpSt: value("aliquotaFcpSt"),
      aliquotaInterestadual: value("aliquotaInterestadual"), aliquotaInternaDestino: value("aliquotaInternaDestino"),
      cstIpi: value("cstIpi"), aliquotaIpi: value("aliquotaIpi"), codigoEnquadramentoIpi: value("codigoEnquadramentoIpi"),
      cstPis: value("cstPis"), aliquotaPis: value("aliquotaPis"), cstCofins: value("cstCofins"),
      aliquotaCofins: value("aliquotaCofins"), informacoesComplementares: value("informacoesComplementares"), ativa: rule.ativa,
    });
    setEditingRuleId(rule.id);
    setShowRuleForm(true);
  }

  function updateRule(field: string, value: any) {
    setRuleForm((current) => ({ ...current, [field]: value }));
  }

  async function saveRule() {
    if (!naturezaId) return;
    setSaving(true);
    try {
      const payload = {
        empresaFiscalId, naturezaOperacaoId: naturezaId, nome: ruleForm.nome,
        prioridade: Number(ruleForm.prioridade), produtoId: ruleForm.produtoId ? Number(ruleForm.produtoId) : null,
        ncmPrefixo: nullable(ruleForm.ncmPrefixo), ufDestino: nullable(ruleForm.ufDestino)?.toUpperCase(),
        contribuinteICMS: boolFilter(ruleForm.contribuinteICMS), consumidorFinal: boolFilter(ruleForm.consumidorFinal),
        cfop: ruleForm.cfop, origemMercadoria: nullable(ruleForm.origemMercadoria),
        cstIcms: nullable(ruleForm.cstIcms), csosn: nullable(ruleForm.csosn), modalidadeBcIcms: ruleForm.modalidadeBcIcms,
        aliquotaIcms: Number(ruleForm.aliquotaIcms), reducaoBaseIcms: Number(ruleForm.reducaoBaseIcms), aliquotaFcp: Number(ruleForm.aliquotaFcp),
        modalidadeBcSt: ruleForm.modalidadeBcSt, mvaSt: Number(ruleForm.mvaSt), aliquotaIcmsSt: Number(ruleForm.aliquotaIcmsSt),
        aliquotaFcpSt: Number(ruleForm.aliquotaFcpSt), aliquotaInterestadual: ruleForm.aliquotaInterestadual ? Number(ruleForm.aliquotaInterestadual) : null,
        aliquotaInternaDestino: ruleForm.aliquotaInternaDestino ? Number(ruleForm.aliquotaInternaDestino) : null,
        cstIpi: ruleForm.cstIpi, aliquotaIpi: Number(ruleForm.aliquotaIpi), codigoEnquadramentoIpi: ruleForm.codigoEnquadramentoIpi,
        cstPis: ruleForm.cstPis, aliquotaPis: Number(ruleForm.aliquotaPis), cstCofins: ruleForm.cstCofins,
        aliquotaCofins: Number(ruleForm.aliquotaCofins), informacoesComplementares: nullable(ruleForm.informacoesComplementares), ativa: ruleForm.ativa,
      };
      const response = await fetch(editingRuleId ? `/api/fiscal/regras/${editingRuleId}` : "/api/fiscal/regras", {
        method: editingRuleId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(editingRuleId ? "Regra atualizada." : "Regra criada.");
      setRuleForm(emptyRule(regimeTributario));
      setEditingRuleId(null);
      setShowRuleForm(false);
      await Promise.all([loadRegras(), loadNaturezas()]);
    } catch (error: any) { toast.error(error.message); }
    finally { setSaving(false); }
  }

  async function disableRule(rule: Regra) {
    if (!window.confirm(`Desativar a regra ${rule.nome}?`)) return;
    const response = await fetch(`/api/fiscal/regras/${rule.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    toast.success("Regra desativada.");
    loadRegras(); loadNaturezas();
  }

  const selectedNature = naturezas.find((item) => item.id === naturezaId);
  const taxField = (label: string, field: string) => (
    <div className="space-y-1"><label className="text-[11px] font-semibold text-slate-600">{label}</label>
      <Input type="number" step="0.01" value={ruleForm[field as keyof typeof ruleForm] as string} onChange={(event) => updateRule(field, event.target.value)} className="h-8" />
    </div>
  );

  if (loading) return <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando motor tributário...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="text-lg font-semibold text-slate-900">Motor tributário da NF-e</h3><p className="text-sm text-slate-500">Naturezas e regras da empresa selecionada</p></div>
        <Button size="sm" onClick={() => setShowNatureForm((value) => !value)}><Plus className="h-4 w-4" /> Natureza</Button>
      </div>

      {showNatureForm && (
        <div className="grid grid-cols-1 gap-3 border-y border-slate-200 bg-slate-50 py-4 md:grid-cols-12">
          <div className="md:col-span-2"><label className="text-xs font-medium">Código</label><Input value={natureForm.codigo} onChange={(e) => setNatureForm({ ...natureForm, codigo: e.target.value })} placeholder="VENDA" /></div>
          <div className="md:col-span-5"><label className="text-xs font-medium">Nome</label><Input value={natureForm.nome} onChange={(e) => setNatureForm({ ...natureForm, nome: e.target.value })} placeholder="Venda de mercadoria" /></div>
          <div className="md:col-span-2"><label className="text-xs font-medium">Finalidade</label><Select value={natureForm.finalidadeNFe} onValueChange={(value) => setNatureForm({ ...natureForm, finalidadeNFe: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(finalidadeLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <label className="flex items-end gap-2 pb-2 text-sm md:col-span-1"><input type="checkbox" checked={natureForm.padrao} onChange={(e) => setNatureForm({ ...natureForm, padrao: e.target.checked })} /> Padrão</label>
          <div className="flex items-end gap-2 md:col-span-2"><Button onClick={saveNature} disabled={saving} className="w-full"><Save className="h-4 w-4" /> Salvar</Button></div>
        </div>
      )}

      <div className="grid min-h-[420px] grid-cols-1 border-y border-slate-200 md:grid-cols-[260px_1fr]">
        <div className="border-b border-slate-200 py-3 md:border-b-0 md:border-r">
          {naturezas.length === 0 ? <div className="px-3 py-8 text-center text-sm text-slate-500"><AlertTriangle className="mx-auto mb-2 h-5 w-5" />Nenhuma natureza cadastrada</div> : naturezas.map((natureza) => (
            <div key={natureza.id} className={`border-l-2 px-3 py-3 ${naturezaId === natureza.id ? "border-emerald-600 bg-emerald-50" : "border-transparent"}`}>
              <button className="w-full text-left" onClick={() => setNaturezaId(natureza.id)}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{natureza.nome}</span>{natureza.padrao && <Badge variant="outline">Padrão</Badge>}</div><p className="mt-1 text-xs text-slate-500">{natureza.codigo} · {natureza._count?.regras || 0} regras</p></button>
              <div className="mt-2 flex gap-1"><Button size="icon" variant="ghost" title="Definir como padrão" onClick={() => setDefault(natureza)} disabled={natureza.padrao}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Desativar natureza" onClick={() => disableNature(natureza)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
            </div>
          ))}
        </div>

        <div className="min-w-0 p-4">
          <div className="mb-4 flex items-center justify-between"><div><h4 className="font-semibold">{selectedNature?.nome || "Selecione uma natureza"}</h4>{selectedNature && <p className="text-xs text-slate-500">Finalidade {finalidadeLabel[selectedNature.finalidadeNFe]}</p>}</div>{selectedNature && <Button size="sm" variant="outline" onClick={() => { setEditingRuleId(null); setRuleForm(emptyRule(regimeTributario)); setShowRuleForm(true); }}><Plus className="h-4 w-4" /> Regra</Button>}</div>

          {showRuleForm && (
            <div className="mb-5 space-y-4 border-y border-slate-200 bg-slate-50 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="md:col-span-2"><label className="text-xs font-medium">Nome da regra</label><Input value={ruleForm.nome} onChange={(e) => updateRule("nome", e.target.value)} /></div>
                <div><label className="text-xs font-medium">Prioridade</label><Input type="number" value={ruleForm.prioridade} onChange={(e) => updateRule("prioridade", e.target.value)} /></div>
                <div><label className="text-xs font-medium">Produto ID</label><Input type="number" value={ruleForm.produtoId} onChange={(e) => updateRule("produtoId", e.target.value)} placeholder="Qualquer" /></div>
                <div><label className="text-xs font-medium">Prefixo NCM</label><Input value={ruleForm.ncmPrefixo} onChange={(e) => updateRule("ncmPrefixo", e.target.value.replace(/\D/g, ""))} maxLength={8} placeholder="Qualquer" /></div>
                <div><label className="text-xs font-medium">UF destino</label><Input value={ruleForm.ufDestino} onChange={(e) => updateRule("ufDestino", e.target.value.toUpperCase())} maxLength={2} placeholder="Qualquer" /></div>
                {[ ["Contribuinte ICMS", "contribuinteICMS"], ["Consumidor final", "consumidorFinal"] ].map(([label, field]) => <div key={field}><label className="text-xs font-medium">{label}</label><Select value={ruleForm[field as keyof typeof ruleForm] as string} onValueChange={(value) => updateRule(field, value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="QUALQUER">Qualquer</SelectItem><SelectItem value="SIM">Sim</SelectItem><SelectItem value="NAO">Não</SelectItem></SelectContent></Select></div>)}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <div><label className="text-xs font-medium">CFOP</label><Input value={ruleForm.cfop} onChange={(e) => updateRule("cfop", e.target.value.replace(/\D/g, ""))} maxLength={4} /></div>
                <div><label className="text-xs font-medium">Origem</label><Input value={ruleForm.origemMercadoria} onChange={(e) => updateRule("origemMercadoria", e.target.value)} maxLength={1} /></div>
                {regimeTributario === "SIMPLES_NACIONAL" ? <div><label className="text-xs font-medium">CSOSN</label><Select value={ruleForm.csosn} onValueChange={(value) => updateRule("csosn", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["102","103","300","400"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div> : <div><label className="text-xs font-medium">CST ICMS</label><Select value={ruleForm.cstIcms} onValueChange={(value) => updateRule("cstIcms", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["00","10","20","40","41","50"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>}
                {taxField("ICMS %", "aliquotaIcms")}{taxField("Redução BC %", "reducaoBaseIcms")}{taxField("FCP %", "aliquotaFcp")}
                {taxField("MVA ST %", "mvaSt")}{taxField("ICMS-ST %", "aliquotaIcmsSt")}{taxField("FCP-ST %", "aliquotaFcpSt")}
                {taxField("ICMS interestadual %", "aliquotaInterestadual")}{taxField("ICMS destino %", "aliquotaInternaDestino")}
                <div><label className="text-xs font-medium">CST IPI</label><Select value={ruleForm.cstIpi} onValueChange={(value) => updateRule("cstIpi", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["50","51","52","53","54","55","99"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>{taxField("IPI %", "aliquotaIpi")}
                <div><label className="text-xs font-medium">CST PIS</label><Input value={ruleForm.cstPis} onChange={(e) => updateRule("cstPis", e.target.value)} /></div>{taxField("PIS %", "aliquotaPis")}
                <div><label className="text-xs font-medium">CST COFINS</label><Input value={ruleForm.cstCofins} onChange={(e) => updateRule("cstCofins", e.target.value)} /></div>{taxField("COFINS %", "aliquotaCofins")}
              </div>
              <div><label className="text-xs font-medium">Informações complementares da regra</label><Textarea value={ruleForm.informacoesComplementares} onChange={(e) => updateRule("informacoesComplementares", e.target.value)} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowRuleForm(false)}><X className="h-4 w-4" /> Cancelar</Button><Button onClick={saveRule} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar regra</Button></div>
            </div>
          )}

          <div className="divide-y divide-slate-200">{regras.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Nenhuma regra cadastrada para esta natureza.</p> : regras.map((regra) => <div key={regra.id} className={`flex items-center justify-between gap-4 py-3 ${!regra.ativa ? "opacity-50" : ""}`}><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{regra.nome}</span><Badge variant="outline">P{regra.prioridade}</Badge>{!regra.ativa && <Badge variant="secondary">Inativa</Badge>}</div><p className="mt-1 text-xs text-slate-500">CFOP {regra.cfop} · {regra.csosn ? `CSOSN ${regra.csosn}` : `CST ${regra.cstIcms}`} · ICMS {String(regra.aliquotaIcms)}%{regra.ncmPrefixo ? ` · NCM ${regra.ncmPrefixo}*` : ""}{regra.ufDestino ? ` · ${regra.ufDestino}` : ""}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" title="Editar regra" onClick={() => editRule(regra)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Desativar regra" onClick={() => disableRule(regra)} disabled={!regra.ativa}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div>)}</div>
        </div>
      </div>
    </div>
  );
}
