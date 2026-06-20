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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Trash2, 
  Package, 
  Thermometer,
  DollarSign,
  Beaker,
  Box,
  Pencil,
  History,
  FileText
} from "lucide-react";
import { ProdutoListItem } from "@/lib/services/produtos.service";
import { CategoriaWithChildren } from "@/lib/services/categorias.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HistoricoAlteracoes } from "@/components/auditoria/historico-alteracoes";

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
  estoqueMaximo: string;
  pontoReposicao: string;
  localizacaoEstoque: string;
  tipoItem: string;
  produtoVariado: boolean;
  pesoBruto: string;
  pesoLiquido: string;
  observacoes: string;
  numeroOrdem: string;
  tamanho: string;
  categoriaLegadoId: string;
  subcategoriaLegadoId: string;
  precoCustoBase: string;
  precoVendaBase: string;
  apresentacao: string;
  concentracaoValor: string;
  concentracaoUnidade: string;
  principioAtivo: string;
  marca: string;
  ncm: string;
  cfop: string;
  cst: string;
  csosn: string;
  origemMercadoria: string;
  unidadeFiscal: string;
  codigoBeneficioFiscal: string;
  cest: string;
  tipoClassificacaoFiscal: string;
  aliquotaIcms: string;
  aliquotaIpi: string;
  aliquotaPis: string;
  aliquotaCofins: string;
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
  estoqueMaximo: "",
  pontoReposicao: "0",
  localizacaoEstoque: "",
  tipoItem: "Produto",
  produtoVariado: false,
  pesoBruto: "",
  pesoLiquido: "",
  observacoes: "",
  numeroOrdem: "",
  tamanho: "",
  categoriaLegadoId: "",
  subcategoriaLegadoId: "",
  precoCustoBase: "0",
  precoVendaBase: "0",
  apresentacao: "",
  concentracaoValor: "",
  concentracaoUnidade: "",
  principioAtivo: "",
  marca: "",
  ncm: "",
  cfop: "5102",
  cst: "",
  csosn: "102",
  origemMercadoria: "0",
  unidadeFiscal: "UN",
  codigoBeneficioFiscal: "",
  cest: "",
  tipoClassificacaoFiscal: "",
  aliquotaIcms: "0",
  aliquotaIpi: "0",
  aliquotaPis: "0",
  aliquotaCofins: "0",
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

const ORIGENS_MERCADORIA = [
  { value: "0", label: "0 - Nacional" },
  { value: "1", label: "1 - Importação direta" },
  { value: "2", label: "2 - Adquirida no mercado interno" },
  { value: "3", label: "3 - Nacional, importação acima de 40%" },
  { value: "4", label: "4 - Nacional, processo produtivo básico" },
  { value: "5", label: "5 - Nacional, importação até 40%" },
  { value: "6", label: "6 - Importada sem similar nacional" },
  { value: "7", label: "7 - Nacional sem similar nacional" },
  { value: "8", label: "8 - Nacional, importação acima de 70%" },
];

const PAGE_SIZE = 50;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ProdutosClientProps {
  initialData: {
    items: ProdutoListItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  categorias: CategoriaWithChildren[];
}

export function ProdutosClient({ initialData, categorias }: ProdutosClientProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, mutate } = useSWR<{ items: ProdutoListItem[]; total: number; page: number; pageSize: number }>(
    `/api/produto?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`,
    fetcher,
    {
      fallbackData: initialData,
      keepPreviousData: true,
    }
  );

  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedGrandchildId, setSelectedGrandchildId] = useState<number | null>(null);

  // Edit & History states
  const [editingProduto, setEditingProduto] = useState<ProdutoListItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<FormData>(initialForm);
  const [editMotivo, setEditMotivo] = useState("");
  const [editParentId, setEditParentId] = useState<number | null>(null);
  const [editChildId, setEditChildId] = useState<number | null>(null);
  const [editGrandchildId, setEditGrandchildId] = useState<number | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyProdutoId, setHistoryProdutoId] = useState<number | null>(null);
  const [historyProdutoDescricao, setHistoryProdutoDescricao] = useState("");

  const editSelectedCategoria = categorias.find(c => c.id === editParentId);
  const editSelectedSubcategoria = editSelectedCategoria?.children?.find(c => c.id === editChildId);
  const editSelectedSubSubcategoria = editSelectedSubcategoria?.children?.find(c => c.id === editGrandchildId);

  const editMarkup =
    Number(editForm.precoCustoBase) > 0
      ? (
          ((Number(editForm.precoVendaBase) - Number(editForm.precoCustoBase)) /
            Number(editForm.precoCustoBase)) *
          100
        ).toFixed(1)
      : "0.0";

  function campoEdit<K extends keyof FormData>(k: K, v: FormData[K]) {
    setEditForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleEditCategoriaChange(id: number | null) {
    setEditParentId(id);
    setEditChildId(null);
    setEditGrandchildId(null);
  }

  function handleEditSubcategoriaChange(id: number | null) {
    setEditChildId(id);
    setEditGrandchildId(null);
  }

  function handleEditSubSubcategoriaChange(id: number | null) {
    setEditGrandchildId(id);
  }

  function getEditCategoriaNome(): string {
    if (editSelectedSubSubcategoria) return editSelectedSubSubcategoria.nome;
    if (editSelectedSubcategoria) return editSelectedSubcategoria.nome;
    if (editSelectedCategoria) return editSelectedCategoria.nome;
    return "";
  }

  function findCategoryPath(nome: string) {
    for (const parent of categorias) {
      if (parent.nome === nome) {
        return { parentId: parent.id, childId: null, grandchildId: null };
      }
      if (parent.children) {
        for (const child of parent.children) {
          if (child.nome === nome) {
            return { parentId: parent.id, childId: child.id, grandchildId: null };
          }
          if (child.children) {
            for (const grandchild of child.children) {
              if (grandchild.nome === nome) {
                return { parentId: parent.id, childId: child.id, grandchildId: grandchild.id };
              }
            }
          }
        }
      }
    }
    return { parentId: null, childId: null, grandchildId: null };
  }

  function findCategoryPathById(id: number | null) {
    if (!id) return null;
    for (const parent of categorias) {
      if (parent.id === id) {
        return { parentId: parent.id, childId: null, grandchildId: null };
      }
      if (parent.children) {
        for (const child of parent.children) {
          if (child.id === id) {
            return { parentId: parent.id, childId: child.id, grandchildId: null };
          }
          if (child.children) {
            for (const grandchild of child.children) {
              if (grandchild.id === id) {
                return { parentId: parent.id, childId: child.id, grandchildId: grandchild.id };
              }
            }
          }
        }
      }
    }
    return null;
  }

  function openEdit(p: ProdutoListItem) {
    setEditingProduto(p);
    const catPath = findCategoryPathById(p.categoriaId) ?? findCategoryPath(p.categoria || "");
    setEditParentId(catPath.parentId);
    setEditChildId(catPath.childId);
    setEditGrandchildId(catPath.grandchildId);
    setEditForm({
      codigoInterno: p.codigoInterno || "",
      codigoBarras: p.codigoBarras || "",
      descricao: p.descricao,
      categoria: p.categoria || "",
      fabricante: p.fabricante || "",
      cnpjFabricante: p.cnpjFabricante || "",
      classeRisco: p.classeRisco || "",
      codigoFabricante: p.codigoFabricante || "",
      unidadeVenda: p.unidadeVenda || "UN",
      unidadeCompra: p.unidadeCompra || "CX",
      fatorConversao: String(p.fatorConversao || 1),
      conteudoEmbalagem: p.conteudoEmbalagem ? String(p.conteudoEmbalagem) : "",
      registroAnvisa: p.registroAnvisa || "",
      temperaturaArmazenamento: p.temperaturaArmazenamento || "Temperatura ambiente (15-30C)",
      controlaValidade: p.controlaValidade ?? true,
      controlaLote: p.controlaLote ?? true,
      estoqueMinimo: String(p.estoqueMinimo ?? 0),
      estoqueMaximo: p.estoqueMaximo != null ? String(p.estoqueMaximo) : "",
      pontoReposicao: p.pontoReposicao ? String(p.pontoReposicao) : "0",
      localizacaoEstoque: p.localizacaoEstoque || "",
      tipoItem: p.tipoItem || "Produto",
      produtoVariado: p.produtoVariado ?? false,
      pesoBruto: p.pesoBruto != null ? String(p.pesoBruto) : "",
      pesoLiquido: p.pesoLiquido != null ? String(p.pesoLiquido) : "",
      observacoes: p.observacoes || "",
      numeroOrdem: p.numeroOrdem || "",
      tamanho: p.tamanho || "",
      categoriaLegadoId: p.categoriaLegadoId || "",
      subcategoriaLegadoId: p.subcategoriaLegadoId || "",
      precoCustoBase: String(p.precoCustoBase ?? 0),
      precoVendaBase: String(p.precoVendaBase ?? 0),
      apresentacao: p.apresentacao || "",
      concentracaoValor: p.concentracaoValor ? String(p.concentracaoValor) : "",
      concentracaoUnidade: p.concentracaoUnidade || "",
      principioAtivo: p.principioAtivo || "",
      marca: p.marca || "",
      ncm: p.ncm || "",
      cfop: p.cfop || "5102",
      cst: p.cst || "",
      csosn: p.csosn || "",
      origemMercadoria: p.origemMercadoria || "0",
      unidadeFiscal: p.unidadeFiscal || p.unidadeVenda || "UN",
      codigoBeneficioFiscal: p.codigoBeneficioFiscal || "",
      cest: p.cest || "",
      tipoClassificacaoFiscal: p.tipoClassificacaoFiscal || "",
      aliquotaIcms: p.aliquotaIcms != null ? String(p.aliquotaIcms) : "0",
      aliquotaIpi: p.aliquotaIpi != null ? String(p.aliquotaIpi) : "0",
      aliquotaPis: p.aliquotaPis != null ? String(p.aliquotaPis) : "0",
      aliquotaCofins: p.aliquotaCofins != null ? String(p.aliquotaCofins) : "0",
    });
    setEditMotivo("");
    setIsEditDialogOpen(true);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduto) return;
    if (!editForm.descricao) return toast.error("Descrição é obrigatória");
    if (!validarCamposFiscais(editForm)) return;

    const categoriaNome = getEditCategoriaNome();
    if (!categoriaNome) return toast.error("Selecione uma categoria");

    try {
      setSaving(true);
      const payload = {
        codigoInterno: editForm.codigoInterno || null,
        codigoBarras: editForm.codigoBarras || null,
        descricao: editForm.descricao,
        categoria: categoriaNome,
        categoriaId: getEditCategoriaId(),
        fabricante: editForm.fabricante || null,
        cnpjFabricante: editForm.cnpjFabricante || null,
        classeRisco: editForm.classeRisco || null,
        codigoFabricante: editForm.codigoFabricante || null,
        unidadeVenda: editForm.unidadeVenda,
        unidadeCompra: editForm.unidadeCompra,
        fatorConversao: Number(editForm.fatorConversao) || 1,
        conteudoEmbalagem: editForm.conteudoEmbalagem ? Number(editForm.conteudoEmbalagem) : null,
        registroAnvisa: editForm.registroAnvisa || null,
        temperaturaArmazenamento: editForm.temperaturaArmazenamento || null,
        controlaValidade: editForm.controlaValidade,
        controlaLote: editForm.controlaLote,
        estoqueMinimo: Number(editForm.estoqueMinimo) || 0,
        estoqueMaximo: nullableNumber(editForm.estoqueMaximo),
        pontoReposicao: editForm.pontoReposicao ? Number(editForm.pontoReposicao) : null,
        localizacaoEstoque: editForm.localizacaoEstoque || null,
        tipoItem: editForm.tipoItem || null,
        produtoVariado: editForm.produtoVariado,
        pesoBruto: nullableNumber(editForm.pesoBruto),
        pesoLiquido: nullableNumber(editForm.pesoLiquido),
        observacoes: editForm.observacoes || null,
        numeroOrdem: editForm.numeroOrdem || null,
        tamanho: editForm.tamanho || null,
        categoriaLegadoId: editForm.categoriaLegadoId || null,
        subcategoriaLegadoId: editForm.subcategoriaLegadoId || null,
        precoCustoBase: Number(editForm.precoCustoBase) || 0,
        precoVendaBase: Number(editForm.precoVendaBase) || 0,
        apresentacao: editForm.apresentacao || null,
        concentracaoValor: editForm.concentracaoValor ? Number(editForm.concentracaoValor) : null,
        concentracaoUnidade: editForm.concentracaoUnidade || null,
        principioAtivo: editForm.principioAtivo || null,
        marca: editForm.marca || null,
        ncm: digits(editForm.ncm) || null,
        cfop: digits(editForm.cfop) || null,
        cst: digits(editForm.cst) || null,
        csosn: digits(editForm.csosn) || null,
        origemMercadoria: editForm.origemMercadoria || null,
        unidadeFiscal: editForm.unidadeFiscal || null,
        codigoBeneficioFiscal: editForm.codigoBeneficioFiscal || null,
        cest: digits(editForm.cest) || null,
        tipoClassificacaoFiscal: editForm.tipoClassificacaoFiscal || null,
        aliquotaIcms: editForm.aliquotaIcms === "" ? null : Number(editForm.aliquotaIcms),
        aliquotaIpi: editForm.aliquotaIpi === "" ? null : Number(editForm.aliquotaIpi),
        aliquotaPis: editForm.aliquotaPis === "" ? null : Number(editForm.aliquotaPis),
        aliquotaCofins: editForm.aliquotaCofins === "" ? null : Number(editForm.aliquotaCofins),
        motivo: editMotivo,
      };

      const res = await fetch(`/api/produto/${editingProduto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error);

      toast.success("Produto atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingProduto(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setSaving(false);
    }
  }

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

  function digits(value: string) {
    return value.replace(/\D/g, "");
  }

  function nullableNumber(value: string) {
    return value === "" ? null : Number(value);
  }

  function getSelectedCategoriaId() {
    return selectedGrandchildId ?? selectedChildId ?? selectedParentId ?? null;
  }

  function getEditCategoriaId() {
    return editGrandchildId ?? editChildId ?? editParentId ?? null;
  }

  function validarCamposFiscais(values: FormData) {
    const ncm = digits(values.ncm);
    const cfop = digits(values.cfop);
    const cest = digits(values.cest);
    if (values.ncm && ncm.length !== 8) {
      toast.error("NCM deve conter exatamente 8 dígitos numéricos.");
      return false;
    }
    if (values.cfop && cfop.length !== 4) {
      toast.error("CFOP deve conter exatamente 4 dígitos numéricos.");
      return false;
    }
    if (values.cest && cest.length !== 7) {
      toast.error("CEST deve conter exatamente 7 dígitos numéricos.");
      return false;
    }
    return true;
  }

  function renderFiscalFields(
    values: FormData,
    setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void
  ) {
    return (
      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-cyan-50/50 border-b pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-cyan-700">
            <FileText className="h-4 w-4" /> Dados Fiscais
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">NCM</label>
              <Input value={values.ncm} onChange={(e) => setField("ncm", digits(e.target.value).slice(0, 8))} placeholder="30049099" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">CFOP</label>
              <Input value={values.cfop} onChange={(e) => setField("cfop", digits(e.target.value).slice(0, 4))} placeholder="5102" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Unidade Fiscal</label>
              <Input value={values.unidadeFiscal} onChange={(e) => setField("unidadeFiscal", e.target.value.toUpperCase())} placeholder="UN" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">CST</label>
              <Input value={values.cst} onChange={(e) => setField("cst", digits(e.target.value).slice(0, 3))} placeholder="00" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">CSOSN</label>
              <Input value={values.csosn} onChange={(e) => setField("csosn", digits(e.target.value).slice(0, 3))} placeholder="102" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Origem</label>
              <Select value={values.origemMercadoria} onValueChange={(v) => setField("origemMercadoria", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Origem..." /></SelectTrigger>
                <SelectContent>
                  {ORIGENS_MERCADORIA.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">CEST</label>
              <Input value={values.cest} onChange={(e) => setField("cest", digits(e.target.value).slice(0, 7))} placeholder="1300402" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Benefício Fiscal</label>
              <Input value={values.codigoBeneficioFiscal} onChange={(e) => setField("codigoBeneficioFiscal", e.target.value.toUpperCase())} placeholder="PR..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Classificação Fiscal</label>
              <Input value={values.tipoClassificacaoFiscal} onChange={(e) => setField("tipoClassificacaoFiscal", e.target.value)} placeholder="Mercadoria" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">ICMS %</label>
              <Input type="number" step="0.01" value={values.aliquotaIcms} onChange={(e) => setField("aliquotaIcms", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">IPI %</label>
              <Input type="number" step="0.01" value={values.aliquotaIpi} onChange={(e) => setField("aliquotaIpi", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">PIS %</label>
              <Input type="number" step="0.01" value={values.aliquotaPis} onChange={(e) => setField("aliquotaPis", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">COFINS %</label>
              <Input type="number" step="0.01" value={values.aliquotaCofins} onChange={(e) => setField("aliquotaCofins", e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderComplementaryFields(
    values: FormData,
    setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void
  ) {
    return (
      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-orange-50/50 border-b pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
            <FileText className="h-4 w-4" /> Dados Complementares
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Tipo Item</label>
              <Input value={values.tipoItem} onChange={(e) => setField("tipoItem", e.target.value)} placeholder="Produto" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Número Ordem</label>
              <Input value={values.numeroOrdem} onChange={(e) => setField("numeroOrdem", e.target.value)} placeholder="Ordem interna" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Categoria Legado</label>
              <Input value={values.categoriaLegadoId} onChange={(e) => setField("categoriaLegadoId", e.target.value)} placeholder="ID antigo" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Subcategoria Legado</label>
              <Input value={values.subcategoriaLegadoId} onChange={(e) => setField("subcategoriaLegadoId", e.target.value)} placeholder="ID antigo" className="h-8 text-sm" />
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
            <input type="checkbox" checked={values.produtoVariado} onChange={e => setField("produtoVariado", e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
            <span>Produto variado</span>
          </label>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Observações</label>
            <Textarea value={values.observacoes} onChange={(e) => setField("observacoes", e.target.value)} placeholder="Informações complementares do produto" className="min-h-20 text-sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao) return toast.error("Descrição é obrigatória");
    if (!validarCamposFiscais(form)) return;

    const categoriaNome = getCategoriaNome();
    if (!categoriaNome) return toast.error("Selecione uma categoria");

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        codigoInterno: form.codigoInterno || null,
        codigoBarras: form.codigoBarras || null,
        descricao: form.descricao,
        categoria: categoriaNome,
        categoriaId: getSelectedCategoriaId(),
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
        estoqueMaximo: nullableNumber(form.estoqueMaximo),
        pontoReposicao: form.pontoReposicao ? Number(form.pontoReposicao) : null,
        localizacaoEstoque: form.localizacaoEstoque || null,
        tipoItem: form.tipoItem || null,
        produtoVariado: form.produtoVariado,
        pesoBruto: nullableNumber(form.pesoBruto),
        pesoLiquido: nullableNumber(form.pesoLiquido),
        observacoes: form.observacoes || null,
        numeroOrdem: form.numeroOrdem || null,
        tamanho: form.tamanho || null,
        categoriaLegadoId: form.categoriaLegadoId || null,
        subcategoriaLegadoId: form.subcategoriaLegadoId || null,
        precoCustoBase: Number(form.precoCustoBase) || 0,
        precoVendaBase: Number(form.precoVendaBase) || 0,
        apresentacao: form.apresentacao || null,
        concentracaoValor: form.concentracaoValor ? Number(form.concentracaoValor) : null,
        concentracaoUnidade: form.concentracaoUnidade || null,
        principioAtivo: form.principioAtivo || null,
        marca: form.marca || null,
        ncm: digits(form.ncm) || null,
        cfop: digits(form.cfop) || null,
        cst: digits(form.cst) || null,
        csosn: digits(form.csosn) || null,
        origemMercadoria: form.origemMercadoria || null,
        unidadeFiscal: form.unidadeFiscal || null,
        codigoBeneficioFiscal: form.codigoBeneficioFiscal || null,
        cest: digits(form.cest) || null,
        tipoClassificacaoFiscal: form.tipoClassificacaoFiscal || null,
        aliquotaIcms: form.aliquotaIcms === "" ? null : Number(form.aliquotaIcms),
        aliquotaIpi: form.aliquotaIpi === "" ? null : Number(form.aliquotaIpi),
        aliquotaPis: form.aliquotaPis === "" ? null : Number(form.aliquotaPis),
        aliquotaCofins: form.aliquotaCofins === "" ? null : Number(form.aliquotaCofins),
      };

      const res = await fetch("/api/produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error);

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

  const produtosList = data?.items || [];
  const total = data?.total || 0;

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

        {renderFiscalFields(form, campo)}
        {renderComplementaryFields(form, campo)}

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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Peso Bruto</label>
                <Input type="number" step="0.001" value={form.pesoBruto} onChange={(e) => campo("pesoBruto", e.target.value)} placeholder="0,000" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Peso Líquido</label>
                <Input type="number" step="0.001" value={form.pesoLiquido} onChange={(e) => campo("pesoLiquido", e.target.value)} placeholder="0,000" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Tamanho</label>
                <Input value={form.tamanho} onChange={(e) => campo("tamanho", e.target.value)} placeholder="P/M/G, 10ml..." className="h-8 text-sm" />
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Estoque Máx.</label>
                <Input type="number" value={form.estoqueMaximo} onChange={(e) => campo("estoqueMaximo", e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
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
            <CardDescription className="text-xs">{total} itens no sistema</CardDescription>
          </div>
          <div className="w-64">
            <Input
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="h-8 text-xs bg-white"
            />
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
                  <TableHead className="text-[10px] w-28 text-right">Ações</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setHistoryProdutoId(p.id);
                            setHistoryProdutoDescricao(p.descricao);
                            setIsHistoryOpen(true);
                          }}
                          title="Histórico de Alterações"
                          className="h-6 w-6 text-slate-400 hover:text-primary transition-all"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEdit(p)}
                          title="Editar Produto"
                          className="h-6 w-6 text-slate-400 hover:text-amber-600 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => excluir(p.id)}
                          title="Excluir Produto"
                          className="h-6 w-6 text-slate-300 group-hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <div className="text-xs text-slate-500">
              Página <span className="font-semibold text-slate-700">{page + 1}</span> de{" "}
              <span className="font-semibold text-slate-700">{Math.ceil(total / PAGE_SIZE) || 1}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 text-xs"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => (p + 1 < Math.ceil(total / PAGE_SIZE) ? p + 1 : p))}
                disabled={page + 1 >= Math.ceil(total / PAGE_SIZE)}
                className="h-8 text-xs"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG DE EDIÇÃO */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="flex max-h-[92vh] w-[min(1200px,calc(100vw-2rem))] max-w-none grid-rows-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="border-b bg-white px-5 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2 pr-4 text-lg leading-tight">
              <Pencil className="h-5 w-5 text-amber-500" />
              <span>Editar Produto:</span>
              <span className="truncate text-slate-700" title={editingProduto?.descricao}>{editingProduto?.descricao}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere os campos do produto abaixo. A auditoria do sistema registrará todas as alterações efetuadas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvarEdicao} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-5 xl:grid-cols-2">
              {/* COLUNA 1 */}
              <div className="space-y-5">
                {/* IDENTIFICAÇÃO BÁSICA */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-slate-50/50 border-b pb-3 py-3">
                    <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-wider text-slate-600">
                      <Package className="h-3.5 w-3.5 text-primary" /> Identificação Básica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Código</label>
                        <Input value={editForm.codigoInterno} onChange={(e) => campoEdit("codigoInterno", e.target.value)} placeholder="MED-001" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">EAN / Barras</label>
                        <Input value={editForm.codigoBarras} onChange={(e) => campoEdit("codigoBarras", e.target.value)} placeholder="789..." className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Descrição do Produto</label>
                      <Input value={editForm.descricao} onChange={(e) => campoEdit("descricao", e.target.value)} placeholder="Ex: Amoxicilina 500mg" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Categoria</label>
                      <div className="space-y-1.5">
                        <Select value={editParentId?.toString() || ""} onValueChange={(v) => handleEditCategoriaChange(v ? Number(v) : null)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                          <SelectContent>
                            {categorias.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        
                        {editParentId && editSelectedCategoria?.children && editSelectedCategoria.children.length > 0 && (
                          <Select value={editChildId?.toString() || ""} onValueChange={(v) => handleEditSubcategoriaChange(v ? Number(v) : null)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subcategoria..." /></SelectTrigger>
                            <SelectContent>
                              {editSelectedCategoria.children.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {editChildId && editSelectedSubcategoria?.children && editSelectedSubcategoria.children.length > 0 && (
                          <Select value={editGrandchildId?.toString() || ""} onValueChange={(v) => handleEditSubSubcategoriaChange(v ? Number(v) : null)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subcategoria..." /></SelectTrigger>
                            <SelectContent>
                              {editSelectedSubcategoria.children.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
                          Selecionado: <span className="font-semibold text-slate-700">{getEditCategoriaNome() || "Nenhuma"}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {renderFiscalFields(editForm, campoEdit)}
                {renderComplementaryFields(editForm, campoEdit)}

                {/* IDENTIFICAÇÃO SANITÁRIA */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-blue-50/50 border-b pb-3 py-3">
                    <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-wider text-blue-700">
                      <Package className="h-3.5 w-3.5" /> Identificação Sanitária
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">CNPJ Fabricante</label>
                        <Input value={editForm.cnpjFabricante} onChange={(e) => campoEdit("cnpjFabricante", e.target.value)} placeholder="00.000.000/0001-00" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Classe Risco</label>
                        <Select value={editForm.classeRisco} onValueChange={(v) => campoEdit("classeRisco", v)}>
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
                        <Input value={editForm.codigoFabricante} onChange={(e) => campoEdit("codigoFabricante", e.target.value)} placeholder="REF-001" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Fabricante</label>
                        <Input value={editForm.fabricante} onChange={(e) => campoEdit("fabricante", e.target.value)} placeholder="EMS Pharma" className="h-8 text-sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ESPECIFICAÇÕES TÉCNICAS */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-purple-50/50 border-b pb-3 py-3">
                    <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-wider text-purple-700">
                      <Beaker className="h-3.5 w-3.5" /> Especificações Técnicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Apresentação</label>
                        <Select value={editForm.apresentacao} onValueChange={(v) => campoEdit("apresentacao", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {APRESENTACOES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Concentração</label>
                        <div className="flex gap-1.5">
                          <Input type="number" step="0.01" value={editForm.concentracaoValor} onChange={(e) => campoEdit("concentracaoValor", e.target.value)} placeholder="500" className="h-8 text-sm w-20" />
                          <Select value={editForm.concentracaoUnidade} onValueChange={(v) => campoEdit("concentracaoUnidade", v)}>
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
                        <Input value={editForm.principioAtivo} onChange={(e) => campoEdit("principioAtivo", e.target.value)} placeholder="Amoxicilina" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Marca</label>
                        <Input value={editForm.marca} onChange={(e) => campoEdit("marca", e.target.value)} placeholder="Genérico" className="h-8 text-sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* COLUNA 2 */}
              <div className="space-y-5">
                {/* EMBALAGEM */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-amber-50/50 border-b pb-3 py-3">
                    <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-wider text-amber-700">
                      <Box className="h-3.5 w-3.5" /> Embalagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Unidade Compra</label>
                        <Input value={editForm.unidadeCompra} onChange={(e) => campoEdit("unidadeCompra", e.target.value)} placeholder="CX" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Unidade Venda</label>
                        <Input value={editForm.unidadeVenda} onChange={(e) => campoEdit("unidadeVenda", e.target.value)} placeholder="UN" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Fator Conv.</label>
                        <Input type="number" value={editForm.fatorConversao} onChange={(e) => campoEdit("fatorConversao", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Conteúdo por Embalagem</label>
                      <div className="flex items-center gap-2">
                        <Input type="number" value={editForm.conteudoEmbalagem} onChange={(e) => campoEdit("conteudoEmbalagem", e.target.value)} placeholder="100" className="h-8 text-sm w-24" />
                        <span className="text-xs text-slate-500">unidades por embalagem</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Peso Bruto</label>
                        <Input type="number" step="0.001" value={editForm.pesoBruto} onChange={(e) => campoEdit("pesoBruto", e.target.value)} placeholder="0,000" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Peso Líquido</label>
                        <Input type="number" step="0.001" value={editForm.pesoLiquido} onChange={(e) => campoEdit("pesoLiquido", e.target.value)} placeholder="0,000" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Tamanho</label>
                        <Input value={editForm.tamanho} onChange={(e) => campoEdit("tamanho", e.target.value)} placeholder="P/M/G, 10ml..." className="h-8 text-sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CONTROLE DE ESTOQUE */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-emerald-50/50 border-b pb-3 py-3">
                    <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-wider text-emerald-700">
                      <Thermometer className="h-3.5 w-3.5" /> Controle de Estoque
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Localização Estoque</label>
                        <Input value={editForm.localizacaoEstoque} onChange={(e) => campoEdit("localizacaoEstoque", e.target.value)} placeholder="Corredor A, Prateleira 3" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Ponto de Reposição</label>
                        <Input type="number" value={editForm.pontoReposicao} onChange={(e) => campoEdit("pontoReposicao", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Estoque Mín.</label>
                        <Input type="number" value={editForm.estoqueMinimo} onChange={(e) => campoEdit("estoqueMinimo", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Estoque Máx.</label>
                        <Input type="number" value={editForm.estoqueMaximo} onChange={(e) => campoEdit("estoqueMaximo", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Temperatura</label>
                        <Select value={editForm.temperaturaArmazenamento} onValueChange={(v) => campoEdit("temperaturaArmazenamento", v)}>
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
                      <Input value={editForm.registroAnvisa} onChange={(e) => campoEdit("registroAnvisa", e.target.value)} placeholder="1.0123.4567.890-1" className="h-8 text-sm" />
                    </div>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                        <input type="checkbox" checked={editForm.controlaValidade} onChange={e => campoEdit("controlaValidade", e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                        <span>Controla Validade</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                        <input type="checkbox" checked={editForm.controlaLote} onChange={e => campoEdit("controlaLote", e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                        <span>Controla Lote</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* PREÇOS */}
                <Card className="shadow-sm border-slate-200 bg-primary/5">
                  <CardHeader className="border-b pb-3 py-3 bg-primary/10">
                    <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-wider text-primary">
                      <DollarSign className="h-3.5 w-3.5" /> Preços e Margem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Custo Base (R$)</label>
                        <Input type="number" step="0.01" value={editForm.precoCustoBase} onChange={e => campoEdit("precoCustoBase", e.target.value)} className="h-8 text-sm bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Venda Base (R$)</label>
                        <Input type="number" step="0.01" value={editForm.precoVendaBase} onChange={e => campoEdit("precoVendaBase", e.target.value)} className="h-8 text-sm bg-white font-bold" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-primary/20">
                      <span className="text-xs font-medium text-slate-500">Markup Calculado</span>
                      <Badge className="bg-primary hover:bg-primary font-bold text-xs">{editMarkup}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
              </div>

            {/* SEÇÃO MOTIVO (OBRIGATÓRIA PARA SALVAR) */}
            <Card className="mt-5 shadow-md border-amber-200 bg-amber-50/20">
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    Motivo da Alteração <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={editMotivo}
                    onChange={(e) => setEditMotivo(e.target.value)}
                    placeholder="Descreva detalhadamente o motivo desta alteração (mínimo 5 caracteres)..."
                    className="min-h-16 text-sm bg-white border-slate-300 focus:border-primary"
                  />
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">
                      * Este motivo será gravado de forma permanente no histórico de auditoria do produto.
                    </span>
                    <span className={editMotivo.trim().length >= 5 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                      {editMotivo.trim().length} / 5 caracteres
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            <div className="flex flex-col gap-2 border-t bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || editMotivo.trim().length < 5} className="font-bold">
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SHEET DE HISTÓRICO */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="max-w-2xl sm:max-w-2xl overflow-y-auto w-full md:w-[600px]">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Histórico do Produto
            </SheetTitle>
            <SheetDescription className="text-xs">
              Exibindo a linha do tempo de edições e auditorias realizadas no produto: <span className="font-semibold text-slate-800">{historyProdutoDescricao}</span>
            </SheetDescription>
          </SheetHeader>

          {historyProdutoId && (
            <div className="pt-4">
              <HistoricoAlteracoes entidade="produto" entidadeId={historyProdutoId} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
