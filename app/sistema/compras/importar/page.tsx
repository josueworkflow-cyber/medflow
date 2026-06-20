"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

interface ItemPendente {
  descricao: string;
  ncm: string;
  ean?: string;
  codigoFornecedor: string;
  quantidade: number;
  valorUnitario: number;
}

interface ImportacaoResult {
  sucesso: boolean;
  documentoFiscalId: number;
  fornecedorId: number;
  fornecedorCriado: boolean;
  itensImportados: number;
  itensPendentes: ItemPendente[];
  alertasLote: string[];
  chave?: string;
  numero?: string;
  fornecedor?: string;
}

export default function ImportarNFePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportacaoResult | null>(null);
  const [error, setError] = useState("");
  const [statusCode, setStatusCode] = useState<number | null>(null);

  // Modal de cadastro rápido
  const [selectedPendente, setSelectedPendente] = useState<ItemPendente | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [formData, setFormData] = useState({
    descricao: "",
    codigoBarras: "",
    codigoFabricante: "",
    cnpjFabricante: "",
    precoCustoBase: 0,
    controlaLote: false,
    controlaValidade: false,
  });

  const router = useRouter();

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".xml")) {
        setFile(droppedFile);
      } else {
        setError("Por favor, selecione apenas arquivos XML da NF-e.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);
    setStatusCode(null);

    const formData = new FormData();
    formData.append("xml", file);

    try {
      const res = await fetch("/api/estoque/nfe/importar", {
        method: "POST",
        body: formData,
      });

      setStatusCode(res.status);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocorreu um erro ao importar a nota fiscal.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Exportar itens pendentes para CSV
  const handleExportCSV = () => {
    if (!result || !result.itensPendentes || result.itensPendentes.length === 0) return;

    // Cabeçalho de metadados para rastreabilidade fiscal
    const meta = [
      `"RASTREABILIDADE DE PENDENCIAS DE IMPORTACAO NF-e"`,
      `"Numero da Nota Fiscal","${result.numero || "NAO ESPECIFICADO"}"`,
      `"Chave de Acesso","${result.chave || "NAO ESPECIFICADO"}"`,
      `"Data de Geracao","${new Date().toLocaleString("pt-BR")}"`,
      "" // Linha em branco
    ];

    const headers = [
      "Descrição",
      "NCM",
      "EAN/Código de Barras",
      "Código do Fornecedor (cProd)",
      "Quantidade",
      "Valor Unitário (R$)"
    ];

    const rows = result.itensPendentes.map((item) => [
      item.descricao,
      item.ncm,
      item.ean || "",
      item.codigoFornecedor,
      item.quantidade,
      item.valorUnitario
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [...meta, headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pendencias-nfe-${result.numero || "importada"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Abrir modal de cadastro rápido para item pendente
  const openCadastroModal = (item: ItemPendente) => {
    setSelectedPendente(item);
    setFormData({
      descricao: item.descricao,
      codigoBarras: item.ean && item.ean !== "SEM GTIN" ? item.ean : "",
      codigoFabricante: item.codigoFornecedor,
      cnpjFabricante: "", // O operador insere ou deixamos em branco, mas idealmente pré-preenchemos com CNPJ do fornecedor se soubermos
      precoCustoBase: item.valorUnitario,
      controlaLote: false,
      controlaValidade: false,
    });
    setModalOpen(true);
  };

  // Enviar cadastro rápido de produto
  const handleCadastroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendente) return;

    setCadastrando(true);
    try {
      const res = await fetch("/api/produto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar produto.");
      }

      // Remover o item cadastrado localmente do array de pendentes
      if (result) {
        const novosPendentes = result.itensPendentes.filter(
          (item) => item.codigoFornecedor !== selectedPendente.codigoFornecedor
        );
        setResult({
          ...result,
          itensPendentes: novosPendentes,
        });
      }

      setModalOpen(false);
      setSelectedPendente(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCadastrando(false);
    }
  };

  return (
    <main className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Módulo de Estoque / Fiscal</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">Importação de NF-e (XML)</h1>
        <p className="text-slate-500 mt-1 max-w-2xl">
          Registre a entrada de estoque, crie lotes e atualize o saldo de produtos automaticamente a partir do arquivo XML de notas fiscais de fornecedores.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Lado Esquerdo: Área de Upload */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span>📥</span> Upload da Nota Fiscal
              </h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all ${
                    dragActive
                      ? "border-blue-500 bg-blue-50/50"
                      : file
                      ? "border-emerald-300 bg-emerald-50/10"
                      : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                    file ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {file ? "✓" : "📄"}
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    {file ? "NF-e Carregada" : "Arraste o arquivo XML da nota"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4 text-center max-w-xs">
                    {file
                      ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)`
                      : "ou selecione o arquivo local do seu computador"}
                  </p>

                  <input
                    type="file"
                    id="xmlFile"
                    accept=".xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="xmlFile"
                    className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Selecionar Arquivo
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!file || loading}
                  className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando Nota...
                    </>
                  ) : (
                    "Importar Nota Fiscal"
                  )}
                </button>
              </form>
            </CardContent>
          </Card>

          {/* Estado de Erro */}
          {error && (
            <Card className="border-red-200 bg-red-50/50 shadow-sm overflow-hidden">
              <CardContent className="p-5 flex items-start gap-4">
                <span className="text-2xl text-red-600">⚠️</span>
                <div className="space-y-1">
                  <h3 className="font-semibold text-red-800 text-sm">
                    {statusCode === 409 ? "Duplicidade de Nota Fiscal" : "Erro no Processamento"}
                  </h3>
                  <p className="text-xs text-red-700 leading-relaxed">{error}</p>
                  <p className="text-[10px] text-red-600 mt-2 font-medium">
                    {statusCode === 409
                      ? "Esta chave de acesso já consta em nossa base de dados como importada."
                      : "Verifique a integridade do arquivo XML ou se a nota foi devidamente assinada pela SEFAZ."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lado Direito: Resultados e Pendências */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* Resumo de Sucesso */}
              <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎉</span>
                      <div>
                        <h3 className="font-bold text-emerald-900">Importação Concluída com Sucesso!</h3>
                        <p className="text-xs text-emerald-700">A NF-e nº {result.numero} foi processada no banco.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-3 text-xs">
                      <span className="text-slate-400 block font-medium">Fornecedor</span>
                      <div className="flex items-center gap-2 mt-1">
                        <strong className="text-slate-800">{result.fornecedor || "Cadastrado"}</strong>
                        {result.fornecedorCriado && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            Criado Automaticamente
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-3 text-xs">
                      <span className="text-slate-400 block font-medium">Itens Processados</span>
                      <strong className="text-slate-800 mt-1 block text-lg font-bold">
                        {result.itensImportados} itens
                      </strong>
                    </div>
                  </div>

                  <div className="bg-white/50 border border-emerald-100 rounded-xl p-3 text-xs mt-3">
                    <span className="text-slate-400 block font-medium">Chave de Acesso NF-e</span>
                    <code className="text-slate-700 font-mono text-[11px] block mt-1 break-all bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      {result.chave}
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* Banner de Alertas de Lote */}
              {result.alertasLote && result.alertasLote.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2 mb-3">
                      <span>⚠️</span> Avisos de Controle de Lotes ({result.alertasLote.length})
                    </h3>
                    <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1.5">
                      {result.alertasLote.map((alerta, index) => (
                        <li key={index}>{alerta}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Seção de Itens Pendentes (Não Encontrados) */}
              {result.itensPendentes && result.itensPendentes.length > 0 ? (
                <Card className="border-orange-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-orange-50/60 p-4 border-b border-orange-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-orange-900 text-sm flex items-center gap-2">
                        <span>🧩</span> Produtos Pendentes de Cadastro ({result.itensPendentes.length})
                      </h3>
                      <p className="text-xs text-orange-700 mt-0.5">
                        Os produtos abaixo foram detectados no XML mas não possuem correspondência em nossa base.
                      </p>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      📥 Exportar CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                          <th className="p-3">Descrição</th>
                          <th className="p-3">Cod. Fornecedor</th>
                          <th className="p-3">EAN (GTIN)</th>
                          <th className="p-3 text-right">Qtd / Unitário</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {result.itensPendentes.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-slate-900 max-w-xs truncate" title={item.descricao}>
                              {item.descricao}
                            </td>
                            <td className="p-3 font-mono text-slate-500">{item.codigoFornecedor}</td>
                            <td className="p-3 font-mono text-slate-500">{item.ean || "SEM GTIN"}</td>
                            <td className="p-3 text-right">
                              <div>{item.quantidade} un</div>
                              <div className="text-[10px] text-slate-400">R$ {item.valorUnitario.toFixed(2)}</div>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => openCadastroModal(item)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 rounded-lg font-semibold transition-colors"
                              >
                                Cadastrar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card className="border-emerald-100 bg-white shadow-sm p-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 font-bold">✓</div>
                  <div>Todos os produtos da NF-e foram reconhecidos e vinculados perfeitamente no cadastro!</div>
                </Card>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-12 text-center bg-white flex flex-col items-center justify-center gap-3">
              <span className="text-4xl">📄</span>
              <h3 className="font-semibold text-slate-700 text-sm">Aguardando Processamento</h3>
              <p className="text-slate-400 text-xs max-w-md leading-relaxed">
                Faça o upload do arquivo XML ao lado. A validação de cadastro do fornecedor e o mapeamento de SKUs serão exibidos nesta área.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro Rápido (Inline Overlay) */}
      {modalOpen && selectedPendente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-950 p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Cadastro Rápido de SKU Pendente</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Cadastre o produto no sistema para dar entrada no estoque fiscal</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white font-medium text-sm p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCadastroSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Descrição Comercial</label>
                <input
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    value={formData.codigoBarras}
                    onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Código Fabricante (cProd)</label>
                  <input
                    type="text"
                    value={formData.codigoFabricante}
                    onChange={(e) => setFormData({ ...formData, codigoFabricante: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">CNPJ Fabricante / Emitente</label>
                  <input
                    type="text"
                    placeholder="CNPJ do fabricante"
                    value={formData.cnpjFabricante}
                    onChange={(e) => setFormData({ ...formData, cnpjFabricante: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Preço de Custo Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.precoCustoBase}
                    onChange={(e) => setFormData({ ...formData, precoCustoBase: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-around">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={formData.controlaLote}
                    onChange={(e) => setFormData({ ...formData, controlaLote: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  Controlar Lote
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={formData.controlaValidade}
                    onChange={(e) => setFormData({ ...formData, controlaValidade: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  Controlar Validade
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cadastrando}
                  className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {cadastrando ? "Cadastrando..." : "Confirmar Cadastro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
