"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, ChevronRight, ChevronDown, Trash2, Edit2, FolderOpen, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

type Categoria = {
  id: number;
  nome: string;
  parentId: number | null;
  children?: Categoria[];
};

type CategoriaFlat = {
  id: number;
  nome: string;
  parentId: number | null;
};

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [flatList, setFlatList] = useState<CategoriaFlat[]>([]);
  const [nome, setNome] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);

  async function carregarCategorias() {
    try {
      setErro("");
      const res = await fetch("/api/produto/categoria");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar categorias.");
      }

      setCategorias(data.hierarchical || []);
      setFlatList(data.flat || []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar categorias.");
    }
  }

  async function salvarCategoria() {
    if (!nome.trim()) {
      setErro("Digite o nome da categoria.");
      setSucesso("");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/produto/categoria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome, parentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar categoria.");
      }

      setNome("");
      setParentId(null);
      setShowForm(false);
      setSucesso(parentId ? "Subcategoria cadastrada com sucesso." : "Categoria cadastrada com sucesso.");
      carregarCategorias();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar categoria.");
      setSucesso("");
    } finally {
      setSalvando(false);
    }
  }

  async function deletarCategoria(id: number) {
    if (!confirm("Deseja realmente excluir esta categoria?")) return;

    try {
      const res = await fetch(`/api/produto/categoria?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir categoria.");
      }

      toast.success("Categoria excluída.");
      carregarCategorias();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir categoria.");
    }
  }

  function toggleExpand(id: number) {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  }

  function getAvailableParents(flat: CategoriaFlat[], currentId?: number): CategoriaFlat[] {
    return flat.filter(c => !currentId || c.id !== currentId);
  }

  useEffect(() => {
    carregarCategorias();
  }, []);

  function renderCategoria(categoria: Categoria, level: number = 0) {
    const hasChildren = categoria.children && categoria.children.length > 0;
    const isExpanded = expanded.has(categoria.id);

    return (
      <div key={categoria.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b border-slate-100 group",
            level > 0 && "bg-slate-50/50"
          )}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(categoria.id)}
              className="p-0.5 hover:bg-slate-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {level === 0 ? (
            <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-slate-400 shrink-0" />
          )}

          <span className="flex-1 text-sm text-slate-700 truncate">{categoria.nome}</span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setParentId(categoria.id);
                setNome("");
                setShowForm(true);
              }}
              title="Adicionar subcategoria"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
              onClick={() => deletarCategoria(categoria.id)}
              title="Excluir"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {categoria.children!.map(child => renderCategoria(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Gerenciar categorias</p>
          <h1 className="text-3xl font-semibold text-slate-900">Categorias</h1>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setParentId(null);
            setNome("");
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {sucesso}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {parentId ? "Nova subcategoria" : "Nova categoria"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setParentId(null);
                  setNome("");
                }}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              {parentId && (
                <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                  Categoria pai: <strong>{flatList.find(c => c.id === parentId)?.nome}</strong>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {parentId ? "Nome da subcategoria" : "Nome da categoria"}
                </label>
                <Input
                  placeholder="Ex.: Medicamentos"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
              </div>

              {!parentId && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Categoria pai (opcional)
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white"
                    value={parentId ?? ""}
                    onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Nenhuma (categoria raiz)</option>
                    {flatList
                      .filter(c => !c.parentId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <Button
                onClick={salvarCategoria}
                disabled={salvando}
                className="w-full"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}

        <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden", !showForm && "lg:col-span-2")}>
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900">
              Hierarquia de Categorias
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Clique nas setas para expandir/recidir categorias com subcategorias
            </p>
          </div>

          {categorias.length === 0 ? (
            <div className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Nenhuma categoria cadastrada ainda.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em &quot;Nova Categoria&quot; para começar.
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {categorias.map(categoria => renderCategoria(categoria))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}