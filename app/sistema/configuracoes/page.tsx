"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import TaxRulesManager from "@/components/fiscal/TaxRulesManager";
import {
  Building,
  Shield,
  Bell,
  Settings,
  Clock,
  Save,
  KeyRound,
  Mail,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Send,
  Loader2,
  Calculator,
} from "lucide-react";

// Algoritmo de Validação de CNPJ brasileiro padrão
function validarCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/[^\d]+/g, "");
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let tamanho = clean.length - 2;
  let numeros = clean.substring(0, tamanho);
  const digitos = clean.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = clean.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

export default function ConfiguracoesPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados dos formulários para a empresa selecionada
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
  const [regimeTributario, setRegimeTributario] = useState("");
  const [ambienteSEFAZ, setAmbienteSEFAZ] = useState("homologacao");
  const [serieNFe, setSerieNFe] = useState("1");
  const [codigoMunicipio, setCodigoMunicipio] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");

  // Aba 2 - NFS-e
  const [codigoTributacaoIss, setCodigoTributacaoIss] = useState("");
  const [codigoNbs, setCodigoNbs] = useState("");
  const [aliquotaIss, setAliquotaIss] = useState("");
  const [percentualTributosFederais, setPercentualTributosFederais] = useState("");
  const [percentualTributosEstaduais, setPercentualTributosEstaduais] = useState("");

  // Aba 3 - Certificado
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [certificadoSenha, setCertificadoSenha] = useState("");
  const [certificadoStatus, setCertificadoStatus] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aba 4 - E-mail
  const [emailRemetente, setEmailRemetente] = useState("");
  const [emailAtivo, setEmailAtivo] = useState(false);
  const [emailApiKey, setEmailApiKey] = useState("");
  const [hasEmailApiKey, setHasEmailApiKey] = useState(false);

  // Estados de loading de ações
  const [salvandoGerais, setSalvandoGerais] = useState(false);
  const [salvandoNfse, setSalvandoNfse] = useState(false);
  const [salvandoCertificado, setSalvandoCertificado] = useState(false);
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [testandoEmail, setTestandoEmail] = useState(false);

  // Carrega empresas cadastradas no banco
  const carregarEmpresas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fiscal/empresa");
      if (!res.ok) {
        throw new Error("Falha ao buscar empresas fiscais");
      }
      const data = await res.json();
      setEmpresas(data);
      if (data.length > 0) {
        // Seleciona a primeira empresa por padrão se nenhuma estiver selecionada
        setSelectedEmpresaId((prev) => prev || data[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega os dados da empresa selecionada
  useEffect(() => {
    carregarEmpresas();
  }, [carregarEmpresas]);

  useEffect(() => {
    if (!selectedEmpresaId || empresas.length === 0) return;
    const emp = empresas.find((e) => e.id === selectedEmpresaId);
    if (!emp) return;

    // Popula Dados Gerais
    setRazaoSocial(emp.razaoSocial || "");
    setNomeFantasia(emp.nomeFantasia || "");
    setCnpj(emp.cnpj || "");
    setInscricaoEstadual(emp.inscricaoEstadual || "");
    setInscricaoMunicipal(emp.inscricaoMunicipal || "");
    setRegimeTributario(emp.regimeTributario || "SIMPLES_NACIONAL");
    setAmbienteSEFAZ(emp.ambienteSEFAZ || "homologacao");
    setSerieNFe(emp.serieNFe || "1");
    setCodigoMunicipio(emp.codigoMunicipio || "");
    setCep(emp.cep || "");
    setLogradouro(emp.logradouro || "");
    setNumero(emp.numero || "");
    setComplemento(emp.complemento || "");
    setBairro(emp.bairro || "");
    setMunicipio(emp.municipio || ""); // Cidade
    setUf(emp.uf || ""); // Estado

    // Popula NFS-e
    setCodigoTributacaoIss(emp.codigoTributacaoIss || "");
    setCodigoNbs(emp.codigoNbs || "");
    setAliquotaIss(emp.aliquotaIss ? String(emp.aliquotaIss) : "");
    setPercentualTributosFederais(emp.percentualTributosFederais || "");
    setPercentualTributosEstaduais(emp.percentualTributosEstaduais || "");

    // Popula E-mail
    setEmailRemetente(emp.emailRemetente || "");
    setEmailAtivo(!!emp.emailAtivo);
    setHasEmailApiKey(!!emp.hasEmailApiKey);
    setEmailApiKey(emp.hasEmailApiKey ? "●●●●●●●● (configurada)" : "");

    // Reseta inputs de certificado locais
    setCertificadoFile(null);
    setCertificadoSenha("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Carrega validade do certificado
    carregarValidadeCertificado(emp.id);
  }, [selectedEmpresaId, empresas]);

  async function carregarValidadeCertificado(id: number) {
    try {
      const res = await fetch(`/api/fiscal/empresa/${id}/certificado`);
      if (res.ok) {
        const data = await res.json();
        setCertificadoStatus(data);
      }
    } catch (err) {
      console.error("Erro ao verificar validade do certificado:", err);
    }
  }

  // CNPJ máscara
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 14) val = val.substring(0, 14);

    let masked = val;
    if (val.length > 2) masked = val.substring(0, 2) + "." + val.substring(2);
    if (val.length > 5) masked = masked.substring(0, 6) + "." + val.substring(5);
    if (val.length > 8) masked = masked.substring(0, 10) + "/" + val.substring(8);
    if (val.length > 12) masked = masked.substring(0, 15) + "-" + val.substring(12);

    setCnpj(masked);
  };

  // Salvar Aba 1 - Dados Gerais
  async function salvarDadosGerais() {
    if (!selectedEmpresaId) return;

    if (!razaoSocial.trim()) {
      toast.error("A razão social é obrigatória.");
      return;
    }
    if (!cnpj.trim()) {
      toast.error("O CNPJ é obrigatório.");
      return;
    }

    const cleanCnpj = cnpj.replace(/[^\d]+/g, "");
    if (!validarCNPJ(cleanCnpj)) {
      toast.error("CNPJ inválido. Digite um CNPJ válido.");
      return;
    }

    try {
      setSalvandoGerais(true);
      const res = await fetch(`/api/fiscal/empresa/${selectedEmpresaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razaoSocial,
          nomeFantasia,
          cnpj: cleanCnpj,
          inscricaoEstadual,
          inscricaoMunicipal,
          regimeTributario,
          ambienteSEFAZ,
          serieNFe,
          codigoMunicipio,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          municipio, // Cidade
          uf, // Estado
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar dados gerais");

      toast.success("Dados da empresa atualizados com sucesso!");
      // Atualiza lista local
      setEmpresas(empresas.map((e) => (e.id === selectedEmpresaId ? { ...e, ...data } : e)));
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSalvandoGerais(false);
    }
  }

  // Salvar Aba 2 - NFS-e
  async function salvarNfse() {
    if (!selectedEmpresaId) return;

    try {
      setSalvandoNfse(true);
      const res = await fetch(`/api/fiscal/empresa/${selectedEmpresaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoTributacaoIss,
          codigoNbs,
          aliquotaIss: aliquotaIss ? Number(aliquotaIss) : null,
          percentualTributosFederais,
          percentualTributosEstaduais,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar configurações NFS-e");

      toast.success("Configurações NFS-e salvas com sucesso!");
      setEmpresas(empresas.map((e) => (e.id === selectedEmpresaId ? { ...e, ...data } : e)));
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSalvandoNfse(false);
    }
  }

  // Salvar Aba 3 - Certificado
  async function uploadCertificado() {
    if (!selectedEmpresaId) return;
    if (!certificadoFile) {
      toast.error("Selecione um arquivo de certificado (.pfx).");
      return;
    }
    if (!certificadoSenha) {
      toast.error("Digite a senha do certificado.");
      return;
    }

    try {
      setSalvandoCertificado(true);

      const body = new FormData();
      body.append("certificadoPfx", certificadoFile);
      body.append("certificadoSenha", certificadoSenha);

      const res = await fetch(`/api/fiscal/empresa/${selectedEmpresaId}/certificado`, {
        method: "POST",
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar certificado");

      toast.success("Certificado digital cadastrado e validado com sucesso!");
      setCertificadoSenha("");
      setCertificadoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Atualiza status local
      carregarValidadeCertificado(selectedEmpresaId);
      // Atualiza indicador na lista de empresas
      setEmpresas(
        empresas.map((e) =>
          e.id === selectedEmpresaId ? { ...e, hasCertificado: true } : e
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar certificado.");
    } finally {
      setSalvandoCertificado(false);
    }
  }

  // Salvar Aba 4 - E-mail
  async function salvarEmailSettings() {
    if (!selectedEmpresaId) return;

    try {
      setSalvandoEmail(true);
      const res = await fetch(`/api/fiscal/empresa/${selectedEmpresaId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailRemetente,
          emailAtivo,
          emailApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar e-mail");

      toast.success("Configurações de e-mail atualizadas!");
      if (emailApiKey && !emailApiKey.includes("●")) {
        setHasEmailApiKey(true);
        setEmailApiKey("●●●●●●●● (configurada)");
      }
      setEmpresas(
        empresas.map((e) =>
          e.id === selectedEmpresaId
            ? { ...e, emailRemetente, emailAtivo, hasEmailApiKey: true }
            : e
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSalvandoEmail(false);
    }
  }

  // Testar Envio de E-mail
  async function testarEnvioEmail() {
    if (!selectedEmpresaId) return;

    try {
      setTestandoEmail(true);
      const res = await fetch(`/api/fiscal/empresa/${selectedEmpresaId}/email/teste`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha no envio do e-mail de teste");
      }

      toast.success(data.message || "E-mail de teste enviado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao testar envio de e-mail.");
    } finally {
      setTestandoEmail(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Gerencie as preferências da plataforma e parâmetros fiscais.</p>
      </div>

      {/* Seletor de Empresa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Empresa Selecionada para Configuração
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando empresas...
            </div>
          ) : empresas.length === 0 ? (
            <div className="text-sm text-red-500 font-medium">Nenhuma empresa fiscal cadastrada no banco.</div>
          ) : (
            <Select
              value={String(selectedEmpresaId)}
              onValueChange={(val) => setSelectedEmpresaId(Number(val))}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.razaoSocial} ({emp.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {!loading && selectedEmpresaId && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Status Geral:</span>
            {empresas.find((e) => e.id === selectedEmpresaId)?.hasCertificado ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" variant="outline">
                Certificado Ativo
              </Badge>
            ) : (
              <Badge variant="destructive">Sem Certificado</Badge>
            )}
            {empresas.find((e) => e.id === selectedEmpresaId)?.emailAtivo ? (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50" variant="outline">
                E-mail Ativo
              </Badge>
            ) : (
              <Badge variant="secondary">E-mail Inativo</Badge>
            )}
          </div>
        )}
      </div>

      {!selectedEmpresaId ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <Building className="h-16 w-16 text-slate-300 mb-4 animate-pulse" />
            <p className="font-semibold text-lg">Nenhuma Empresa Ativa Selecionada</p>
            <p className="text-sm mt-1">Carregue ou selecione uma empresa fiscal para visualizar suas configurações.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 overflow-hidden shadow-xs">
          <Tabs defaultValue="gerais" className="w-full flex-col">
            <div className="border-b border-slate-200 bg-slate-50/50 p-2">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-slate-100 rounded-lg p-1">
                <TabsTrigger value="gerais" className="gap-2">
                  <Building className="h-4 w-4" /> Dados Gerais
                </TabsTrigger>
                <TabsTrigger value="nfse" className="gap-2">
                  <Settings className="h-4 w-4" /> Configs NFS-e
                </TabsTrigger>
                <TabsTrigger value="tributos" className="gap-2">
                  <Calculator className="h-4 w-4" /> Motor Tributário
                </TabsTrigger>
                <TabsTrigger value="certificado" className="gap-2">
                  <KeyRound className="h-4 w-4" /> Certificado Digital
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-4 w-4" /> E-mail
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Dados Gerais */}
            <TabsContent value="gerais" className="p-6 focus:outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Dados Gerais da Empresa</h3>
                  <p className="text-sm text-slate-500">Informações cadastrais e endereço da distribuidora.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Razão Social *</label>
                    <Input
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      placeholder="Ex: MEDFLOW DISTRIBUIDORA LTDA"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nome Fantasia</label>
                    <Input
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      placeholder="Ex: Medflow Distribuidora"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">CNPJ *</label>
                    <Input
                      value={cnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Inscrição Estadual</label>
                    <Input
                      value={inscricaoEstadual}
                      onChange={(e) => setInscricaoEstadual(e.target.value)}
                      placeholder="Somente números ou ISENTO"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Inscrição Municipal</label>
                    <Input
                      value={inscricaoMunicipal}
                      onChange={(e) => setInscricaoMunicipal(e.target.value)}
                      placeholder="Se aplicável"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Regime Tributário (CRT) *</label>
                    <Select value={regimeTributario} onValueChange={setRegimeTributario}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o CRT" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                        <SelectItem value="LUCRO_PRESUMIDO">Regime Normal (Lucro Presumido)</SelectItem>
                        <SelectItem value="LUCRO_REAL">Regime Normal (Lucro Real)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                      <span>Ambiente SEFAZ *</span>
                      {ambienteSEFAZ === "producao" ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">Produção</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Homologação</Badge>
                      )}
                    </label>
                    <Select value={ambienteSEFAZ} onValueChange={setAmbienteSEFAZ}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o Ambiente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                        <SelectItem value="producao">Produção (Real)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Série NF-e *</label>
                    <Input
                      value={serieNFe}
                      onChange={(e) => setSerieNFe(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Código Município IBGE *</label>
                    <Input
                      value={codigoMunicipio}
                      onChange={(e) => setCodigoMunicipio(e.target.value)}
                      placeholder="Ex: 3550308"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">CEP</label>
                    <Input
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Logradouro</label>
                    <Input
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Ex: Avenida Paulista"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Número</label>
                    <Input
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Ex: 1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Complemento</label>
                    <Input
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Ex: Sala 402"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Bairro</label>
                    <Input
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex: Bela Vista"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cidade (Município)</label>
                    <Input
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Estado (UF)</label>
                    <Input
                      value={uf}
                      onChange={(e) => setUf(e.target.value)}
                      placeholder="Ex: SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button onClick={salvarDadosGerais} disabled={salvandoGerais} className="gap-2">
                    {salvandoGerais ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: NFS-e */}
            <TabsContent value="nfse" className="p-6 focus:outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Configurações para Emissão de NFS-e</h3>
                  <p className="text-sm text-slate-500">Parâmetros específicos para prestação de serviços municipais.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Código de Tributação ISS</label>
                    <Input
                      value={codigoTributacaoIss}
                      onChange={(e) => setCodigoTributacaoIss(e.target.value)}
                      placeholder="Ex: 01.01 / 1401"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Código NBS</label>
                    <Input
                      value={codigoNbs}
                      onChange={(e) => setCodigoNbs(e.target.value)}
                      placeholder="Nomenclatura Brasileira de Serviços"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Alíquota ISS (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={aliquotaIss}
                      onChange={(e) => setAliquotaIss(e.target.value)}
                      placeholder="Ex: 2.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tributos Federais (%)</label>
                    <Input
                      value={percentualTributosFederais}
                      onChange={(e) => setPercentualTributosFederais(e.target.value)}
                      placeholder="Ex: 13.45"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tributos Estaduais (%)</label>
                    <Input
                      value={percentualTributosEstaduais}
                      onChange={(e) => setPercentualTributosEstaduais(e.target.value)}
                      placeholder="Ex: 12.00"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button onClick={salvarNfse} disabled={salvandoNfse} className="gap-2">
                    {salvandoNfse ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Salvar NFS-e
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tributos" className="p-6 focus:outline-none">
              <TaxRulesManager
                empresaFiscalId={selectedEmpresaId}
                regimeTributario={empresas.find((empresa) => empresa.id === selectedEmpresaId)?.regimeTributario}
              />
            </TabsContent>

            {/* TAB 3: Certificado Digital */}
            <TabsContent value="certificado" className="p-6 focus:outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Certificado Digital (A1)</h3>
                  <p className="text-sm text-slate-500">Upload de arquivo .pfx para assinatura de documentos e comunicação mTLS.</p>
                </div>

                {/* Status do Certificado */}
                <div className="p-4 rounded-xl border bg-slate-50/50">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Status do Certificado Cadastrado</h4>
                  {!certificadoStatus || certificadoStatus.notRegistered ? (
                    <div className="flex items-center gap-3 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold">Nenhum certificado cadastrado.</span> A emissão de notas fiscais e a comunicação com a SEFAZ estão desabilitadas.
                      </div>
                    </div>
                  ) : certificadoStatus.alertar ? (
                    <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold">Atenção! Certificado expira em breve.</span> Vence em:{" "}
                        <span className="font-semibold">
                          {new Date(certificadoStatus.venceEm).toLocaleDateString("pt-BR")}
                        </span>{" "}
                        ({Math.ceil((new Date(certificadoStatus.venceEm).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} dias restantes).
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold">Certificado cadastrado e válido.</span> Vence em:{" "}
                        <span className="font-semibold">
                          {new Date(certificadoStatus.venceEm).toLocaleDateString("pt-BR")}
                        </span>.
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Arquivo do Certificado (.pfx) *</label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept=".pfx"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full gap-2 border-dashed border-2 py-6 h-auto flex flex-col justify-center items-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20"
                      >
                        <Upload className="h-5 w-5" />
                        {certificadoFile ? (
                          <span className="text-sm font-medium text-slate-900">{certificadoFile.name}</span>
                        ) : (
                          <span className="text-xs">Selecione ou arraste o arquivo .pfx</span>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-slate-500" /> Senha do Certificado *
                    </label>
                    <Input
                      type="password"
                      value={certificadoSenha}
                      onChange={(e) => setCertificadoSenha(e.target.value)}
                      placeholder="Senha de criptografia do PFX"
                    />
                    <p className="text-xs text-slate-400">A senha será criptografada com AES-256 e nunca exposta em APIs públicas.</p>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button onClick={uploadCertificado} disabled={salvandoCertificado} className="gap-2">
                    {salvandoCertificado ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Processando & Validando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Salvar Certificado
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Configurações de E-mail */}
            <TabsContent value="email" className="p-6 focus:outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Configurações de E-mail (Provedor Resend)</h3>
                  <p className="text-sm text-slate-500">Ajustes de chave de API e remetente para envio automático de XML/DANFe.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Remetente Autorizado *</label>
                    <Input
                      value={emailRemetente}
                      onChange={(e) => setEmailRemetente(e.target.value)}
                      placeholder="Ex: nfe@medflow.com.br"
                    />
                    <p className="text-xs text-slate-400">Deve ser um domínio já validado e autorizado em sua conta Resend.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">API Key do Resend *</label>
                    <Input
                      type="password"
                      value={emailApiKey}
                      onChange={(e) => setEmailApiKey(e.target.value)}
                      placeholder={hasEmailApiKey ? "●●●●●●●● (configurada)" : "re_..."}
                    />
                    <p className="text-xs text-slate-400">Chave de acesso. Deixe como está para manter a chave já configurada.</p>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 md:col-span-2">
                    <input
                      type="checkbox"
                      id="emailAtivo"
                      checked={emailAtivo}
                      onChange={(e) => setEmailAtivo(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-0.5">
                      <label htmlFor="emailAtivo" className="text-sm font-medium text-slate-900 cursor-pointer">
                        Ativar Envio de E-mails
                      </label>
                      <p className="text-xs text-slate-500">Se marcado, o sistema enviará a nota fiscal assinada para os clientes logo após a autorização.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                  {/* Botão de Testar Envio */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testarEnvioEmail}
                    disabled={testandoEmail || !emailAtivo}
                    className="gap-2 border-slate-300"
                  >
                    {testandoEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Testar Envio
                      </>
                    )}
                  </Button>

                  <Button onClick={salvarEmailSettings} disabled={salvandoEmail} className="gap-2">
                    {salvandoEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Salvar Configurações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Outras Seções de Configurações */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Shield className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Políticas de senha, autenticação em duas etapas e logs de acesso.</CardDescription>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" /> Em breve
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Bell className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Alertas de estoque baixo, vencimentos e novos pedidos por e-mail.</CardDescription>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" /> Em breve
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" /> Parâmetros do Sistema
          </CardTitle>
          <CardDescription>Estes ajustes afetam o cálculo de impostos e regras de negócio globais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 opacity-60">
            <div>
              <p className="text-sm font-medium">Backup Automático</p>
              <p className="text-xs text-slate-500">Realizar backup da base de dados diariamente às 03:00</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
              <Clock className="h-3 w-3" /> Em breve
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 opacity-60">
            <div>
              <p className="text-sm font-medium">Modo Homologação NF-e</p>
              <p className="text-xs text-slate-500">Emitir notas sem valor fiscal para fins de teste</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
              <Clock className="h-3 w-3" /> Em breve
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
