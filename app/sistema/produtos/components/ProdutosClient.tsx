"use client";

import { useState } from "react";
import useSWR from "swr";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Trash2, 
  Package, 
  Thermometer,
  DollarSign,
  Beaker,
  Box
} from "lucide-react";
import { ProdutoListItem } from "@/lib/services/produtos.service";
import { CategoriaWithChildren } from "@/lib/services/categorias.service";

type FormData = {
  codigoInterno: string;
  codigoBarras: string;
  descricao: string;
  categoria: string;
  fabricante: string;
  cnpjFabricante: string;
  classeRisco: string;
  codigoFabricante: string;
  unidadeVenda: string;
  unidadeCompra: string;
  fatorConversao: string;
  conteudoEmbalagem: string;
  registroAnvisa: string;
  temperaturaArmazenamento: string;
  controlaValidade: boolean;
  controlaLote: boolean;
  estoqueMinimo: string;
  pontoReposicao: string;
  localizacaoEstoque: string;
  precoCustoBase: string;
  precoVendaBase: string;
  apresentacao: string;
  concentracaoValor: string;
  concentracaoUnidade: string;
  principioAtivo: string;
  marca: string;
};

const initialForm: FormData = {
  codigoInterno: "",
  codigoBarras: "",
  descricao: "",
  categoria: "",
  fabricante: "",
  cnpjFabricante: "",
  classeRisco: "",
  codigoFabricante: "",
  unidadeVenda: "UN",
  unidadeCompra: "CX",
  fatorConversao: "1",
  conteudoEmbalagem: "",
  registroAnvisa: "",
  temperaturaArmazenamento: "Temperatura ambiente (15–30°C)",
  controlaValidade: true,
  controlaLote: true,
  estoqueMinimo: "0",
  pontoReposicao: "0",
  localizacaoEstoque: "",
  precoCustoBase: "0",
  precoVendaBase: "0",
  apresentacao: "",
  concentracaoValor: "",
  concentracaoUnidade: "",
  principioAtivo: "",
  marca: "",
};

const APRESENTACOES = [
  { value: "AMPOLA", label: "Ampola" },
  { value: "FRASCO", label: "Frasco" },
  { value: "CAIXA", label: "Caixa" },
  { value: "SACHE", label: "Sache" },
  { value: "BOLSA", label: "Bolsa" },
  { value: "SERINGA", label: "Seringa" },
  { value: "TUBO", label: "Tubo" },
  { value: "BLISTER", label: "Blister" },
  { value: "BOMBONA", label: "Bombona" },
  { value: "LATA", label: "Lata" },
  { value: "GALERIA", label: "Galeria" },
  { value: "UNIDADE", label: "Unidade" },
  { value: "OUTRA", label: "Outra" },
];

const UNIDADES_CONCENTRACAO = [
  { value: "mg", label: "mg" },
  { value: "ml", label: "ml" },
  { value: "g", label: "g" },
  { value: "mcg", label: "mcg" },
  { value: "UI", label: "UI" },
  { value: "%", label: "%" },
];

const CLASSE_RISCO = [
  { value: "I", label: "I - Baixo Risco" },
  { value: "II", label: "II - Médio Risco" },
  { value: "III", label: "III - Alto Risco" },
  { value: "IV", label: "IV - Máximo Risco" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ProdutosClientProps {
  initialData: ProdutoListItem[];
  categorias: CategoriaWithChildren[];
}

export function ProdutosClient({ initialData, categorias }: ProdutosClientProps) {
  const { data: produtos, mutate } = useSWR<ProdutoListItem[]>("/api/produto", fetcher, {
    fallbackData: initialData,
  });

  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedGrandchildId, setSelectedGrandchildId] = useState<number | null>(null);

  const selectedCategoria = categorias.find(c => c.id === selectedParentId);
  const selectedSubcategoria = selectedCategoria?.children?.find(c => c.id === selectedChildId);
  const selectedSubSubcategoria = selectedSubcategoria?.children?.find(c => c.id === selectedGrandchildId);

  const markup =
    Number(form.precoCustoBase) > 0
      ? (
          ((Number(form.precoVendaBase) - Number(form.precoCustoBase)) /
            Number(form.precoCustoBase)) *
          100
        ).toFixed(1)
      : "0.0";

  function campo<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleCategoriaChange(id: number | null) {
    setSelectedParentId(id);
    setSelectedChildId(null);
    setSelectedGrandchildId(null);
    if (id === null) {
      setForm(prev => ({ ...prev, categoria: "" }));
    }
  }

  function handleSubcategoriaChange(id: number | null) {
    setSelectedChildId(id);
    setSelectedGrandchildId(null);
  }

  function handleSubSubcategoriaChange(id: number | null) {
    setSelectedGrandchildId(id);
  }

  function getCategoriaNome(): string {
    if (selectedSubSubcategoria) return selectedSubSubcategoria.nome;
    if (selectedSubcategoria) return selectedSubcategoria.nome;
    if (selectedCategoria) return selectedCategoria.nome;
    return "";
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao) return toast.error("Descrição é obrigatória");

    const categoriaNome = getCategoriaNome();
    if (!categoriaNome) return toast.error("Selecione uma categoria");

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        codigoInterno: form.codigoInterno || null,
        codigoBarras: form.codigoBarras || null,
        descricao: form.descricao,
        categoria: categoriaNome,
        fabricante: form.fabricante || null,
        cnpjFabricante: form.cnpjFabricante || null,
        classeRisco: form.classeRisco || null,
        codigoFabricante: form.codigoFabricante || null,
        unidadeVenda: form.unidadeVenda,
        unidadeCompra: form.unidadeCompra,
        fatorConversao: Number(form.fatorConversao) || 1,
        conteudoEmbalagem: form.conteudoEmbalagem ? Number(form.conteudoEmbalagem) : null,
        registroAnvisa: form.registroAnvisa || null,
        temperaturaArmazenamento: form.temperaturaArmazenamento || null,
        controlaValidade: form.controlaValidade,
        controlaLote: form.controlaLote,
        estoqueMinimo: Number(form.estoqueMinimo) || 0,
        pontoReposicao: form.pontoReposicao ? Number(form.pontoReposicao) : null,
        localizacaoEstoque: form.localizacaoEstoque || null,
        precoCustoBase: Number(form.precoCustoBase) || 0,
        precoVendaBase: Number(form.precoVendaBase) || 0,
        apresentacao: form.apresentacao || null,
        concentracaoValor: form.concentracaoValor ? Number(form.concentracaoValor) : null,
        concentracaoUnidade: form.concentracaoUnidade || null,
        principioAtivo: form.principioAtivo || null,
        marca: form.marca || null,
      };

      const res = await fetch("/api/produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Produto cadastrado com sucesso!");
      setForm(initialForm);
      setSelectedParentId(null);
      setSelectedChildId(null);
      setSelectedGrandchildId(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm("Deseja realmente excluir este produto?")) return;

    try {
      const res = await fetch(`/api/produto/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("Produto removido.");
      mutate();
    } catch (err) {
      toast.error("Não foi possível excluir o produto.");
    }
  }

  const produtosList = Array.isArray(produtos) ? produtos : [];

  function formatConcentracao(p: any): string {
    if (p.concentracaoValor && p.concentracaoUnidade) {
      return `${p.concentracaoValor}${p.concentracaoUnidade}`;
    }
    return "-";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[480px_1fr]">
      <form onSubmit={salvar} className="space-y-5">
        
        {/* CARD 1: IDENTIFICAÇÃO BÁSICA */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Identificação Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Código</label>
                <Input value={form.codigoInterno} onChange={(e) => campo("codigoInterno", e.target.value)} placeholder="MED-001" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">EAN / Barras</label>
                <Input value={form.codigoBarras} onChange={(e) => campo("codigoBarras", e.target.value)} placeholder="789..." className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Descrição do Produto</label>
              <Input value={form.descricao} onChange={(e) => campo("descricao", e.target.value)} placeholder="Ex: Amoxicilina 500mg" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Categoria</label>
              <div className="space-y-1.5">
                <Select value={selectedParentId?.toString() || ""} onValueChange={(v) => handleCategoriaChange(v ? Number(v) : null)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                {selectedParentId && selectedCategoria?.children && selectedCategoria.children.length > 0 && (
                  <Select value={selectedChildId?.toString() || ""} onValueChange={(v) => handleSubcategoriaChange(v ? Number(v) : null)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subcategoria..." /></SelectTrigger>
                    <SelectContent>
                      {selectedCategoria.children.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                
                {selectedChildId && selectedSubcategoria?.children && selectedSubcategoria.children.length > 0 && (
                  <Select value={selectedGrandchildId?.toString() || ""} onValueChange={(v) => handleSubSubcategoriaChange(v ? Number(v) : null)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subcategoria..." /></SelectTrigger>
                    <SelectContent>
                      {selectedSubcategoria.children.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                
                <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
                  Selecionado: <span className="font-semibold text-slate-700">{getCategoriaNome() || "Nenhuma"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: IDENTIFICAÇÃO SANITÁRIA */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-blue-50/50 border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <Package className="h-4 w-4" /> Identificação Sanitária
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">CNPJ Fabricante</label>
                <Input value={form.cnpjFabricante} onChange={(e) => campo("cnpjFabricante", e.target.value)} placeholder="00.000.000/0001-00" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Classe Risco</label>
                <Select value={form.classeRisco} onValueChange={(v) => campo("classeRisco", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {CLASSE_RISCO.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Código Fabricante</label>
                <Input value={form.codigoFabricante} onChange={(e) => campo("codigoFabricante", e.target.value)} placeholder="REF-001" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Fabricante</label>
                <Input value={form.fabricante} onChange={(e) => campo("fabricante", e.target.value)} placeholder="EMS Pharma" className="h-8 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: ESPECIFICAÇÕES TÉCNICAS */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-purple-50/50 border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
              <Beaker className="h-4 w-4" /> Especificações Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Apresentação</label>
                <Select value={form.apresentacao} onValueChange={(v) => campo("apresentacao", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {APRESENTACOES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Concentração</label>
                <div className="flex gap-1.5">
                  <Input type="number" step="0.01" value={form.concentracaoValor} onChange={(e) => campo("concentracaoValor", e.target.value)} placeholder="500" className="h-8 text-sm w-20" />
                  <Select value={form.concentracaoUnidade} onValueChange={(v) => campo("concentracaoUnidade", v)}>
                    <SelectTrigger className="h-8 text-xs w-16"><SelectValue placeholder="..." /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES_CONCENTRACAO.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Princípio Ativo</label>
                <Input value={form.principioAtivo} onChange={(e) => campo("principioAtivo", e.target.value)} placeholder="Amoxicilina" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Marca</label>
                <Input value={form.marca} onChange={(e) => campo("marca", e.target.value)} placeholder="Genérico" className="h-8 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: EMBALAGEM */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-amber-50/50 border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <Box className="h-4 w-4" /> Embalagem
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Unidade Compra</label>
                <Input value={form.unidadeCompra} onChange={(e) => campo("unidadeCompra", e.target.value)} placeholder="CX" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Unidade Venda</label>
                <Input value={form.unidadeVenda} onChange={(e) => campo("unidadeVenda", e.target.value)} placeholder="UN" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Fator Conv.</label>
                <Input type="number" value={form.fatorConversao} onChange={(e) => campo("fatorConversao", e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Conteúdo por Embalagem</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={form.conteudoEmbalagem} onChange={(e) => campo("conteudoEmbalagem", e.target.value)} placeholder="100" className="h-8 text-sm w-24" />
                <span className="text-xs text-slate-500">unidades por embalagem</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 5: CONTROLE DE ESTOQUE */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-emerald-50/50 border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <Thermometer className="h-4 w-4" /> Controle de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Localização Estoque</label>
                <Input value={form.localizacaoEstoque} onChange={(e) => campo("localizacaoEstoque", e.target.value)} placeholder="Corredor A, Prateleira 3" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Ponto de Reposição</label>
                <Input type="number" value={form.pontoReposicao} onChange={(e) => campo("pontoReposicao", e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Estoque Mín.</label>
                <Input type="number" value={form.estoqueMinimo} onChange={(e) => campo("estoqueMinimo", e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Temperatura</label>
                <Select value={form.temperaturaArmazenamento} onValueChange={(v) => campo("temperaturaArmazenamento", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Temperatura ambiente (15-30C)">Ambiente (15-30°C)</SelectItem>
                    <SelectItem value="Refrigerado (2-8C)">Refrigerado (2-8°C)</SelectItem>
                    <SelectItem value="Congelado (abaixo de -15C)">Congelado (≤-15°C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Registro ANVISA</label>
              <Input value={form.registroAnvisa} onChange={(e) => campo("registroAnvisa", e.target.value)} placeholder="1.0123.4567.890-1" className="h-8 text-sm" />
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={form.controlaValidade} onChange={e => campo("controlaValidade", e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                <span>Controla Validade</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={form.controlaLote} onChange={e => campo("controlaLote", e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                <span>Controla Lote</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* CARD 6: PREÇOS */}
        <Card className="shadow-md border-slate-200 bg-primary/5">
          <CardHeader className="border-b pb-3 bg-primary/10">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <DollarSign className="h-4 w-4" /> Preços e Margem
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Custo Base (R$)</label>
                <Input type="number" step="0.01" value={form.precoCustoBase} onChange={e => campo("precoCustoBase", e.target.value)} className="h-8 text-sm bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Venda Base (R$)</label>
                <Input type="number" step="0.01" value={form.precoVendaBase} onChange={e => campo("precoVendaBase", e.target.value)} className="h-8 text-sm bg-white font-bold" />
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-primary/20">
              <span className="text-xs font-medium text-slate-500">Markup Calculado</span>
              <Badge className="bg-primary hover:bg-primary font-bold text-xs">{markup}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full h-10 text-sm font-bold shadow-lg rounded-lg">
          {saving ? "Salvando..." : "Cadastrar Produto"}
        </Button>
      </form>

      {/* TABELA DE PRODUTOS */}
      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base">Produtos Cadastrados</CardTitle>
            <CardDescription className="text-xs">{produtosList.length} itens no sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px]">Produto</TableHead>
                  <TableHead className="text-[10px]">Apresentação</TableHead>
                  <TableHead className="text-[10px]">Concentração</TableHead>
                  <TableHead className="text-[10px]">Fabricante</TableHead>
                  <TableHead className="text-[10px]">Localização</TableHead>
                  <TableHead className="text-[10px] text-right">Vl. Venda</TableHead>
                  <TableHead className="text-[10px] w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosList.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs italic">Nenhum produto cadastrado.</TableCell></TableRow>
                ) : produtosList.map((p) => (
                  <TableRow key={p.id} className="group transition-colors hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-xs">{p.descricao}</span>
                        <span className="text-[9px] font-mono text-slate-400">#{p.codigoInterno || p.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.apresentacao ? <Badge variant="outline" className="text-[9px] font-normal bg-slate-50">{p.apresentacao}</Badge> : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{formatConcentracao(p)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{p.fabricante || "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{p.localizacaoEstoque || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-slate-800 text-xs">
                      R$ {p.precoVendaBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => excluir(p.id)}
                        className="h-6 w-6 text-slate-300 group-hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}