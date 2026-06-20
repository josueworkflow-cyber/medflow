import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FiscalService } from "@/lib/services/fiscal.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { empresaFiscalSelect } from "@/lib/fiscal-select";
import { Prisma, RegimeTributario } from "@prisma/client";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    // Reutiliza o método do FiscalService que usa o empresaFiscalSelect
    const empresasBase = await FiscalService.getEmpresasFiscais();

    // Busca a presença de campos sensíveis de forma isolada
    const credentialsStatus = await prisma.empresaFiscal.findMany({
      where: { id: { in: empresasBase.map((e) => e.id) } },
      // SEGURANÇA: campos sensiveis selecionados apenas para verificar presenca.
      // Nunca incluir emailApiKey ou certificadoPfxBase64 em respostas JSON.
      select: {
        id: true,
        emailApiKey: true,
        certificadoPfxBase64: true,
      },
    });

    // Mapeia adicionando as flags seguras sem expor dados reais
    const empresas = empresasBase.map((emp) => {
      const status = credentialsStatus.find((c) => c.id === emp.id);
      return {
        ...emp,
        hasEmailApiKey: status ? !!status.emailApiKey : false,
        hasCertificado: status ? !!status.certificadoPfxBase64 : false,
      };
    });

    return NextResponse.json(empresas);
  } catch (error: any) {
    console.error("GET /api/fiscal/empresa:", error);
    return NextResponse.json({ error: "Erro ao buscar empresas fiscais." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.razaoSocial || !body.razaoSocial.trim()) {
      return NextResponse.json({ error: "Razao social e obrigatoria." }, { status: 400 });
    }
    if (!body.cnpj || !body.cnpj.trim()) {
      return NextResponse.json({ error: "CNPJ e obrigatorio." }, { status: 400 });
    }

    // Verifica unicidade do CNPJ
    const cnpjClean = body.cnpj.replace(/[^\d]+/g, "");
    const existe = await prisma.empresaFiscal.findUnique({
      where: { cnpj: cnpjClean },
    });
    if (existe) {
      return NextResponse.json({ error: "CNPJ ja cadastrado." }, { status: 400 });
    }

    // Regime tributário
    let regimeTributario: RegimeTributario | null = null;
    if (body.regimeTributario && Object.values(RegimeTributario).includes(body.regimeTributario)) {
      regimeTributario = body.regimeTributario as RegimeTributario;
    }

    const created = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: body.razaoSocial.trim(),
        nomeFantasia: body.nomeFantasia?.trim() || null,
        cnpj: cnpjClean,
        inscricaoEstadual: body.inscricaoEstadual?.trim() || null,
        inscricaoMunicipal: body.inscricaoMunicipal?.trim() || null,
        regimeTributario,
        logradouro: body.logradouro?.trim() || null,
        numero: body.numero?.trim() || null,
        complemento: body.complemento?.trim() || null,
        bairro: body.bairro?.trim() || null,
        municipio: body.municipio?.trim() || null,
        codigoMunicipio: body.codigoMunicipio?.trim() || null,
        uf: body.uf?.trim() || null,
        cep: body.cep?.trim() || null,
        serieNFe: body.serieNFe?.trim() || "1",
        numeroUltimaNFe: body.numeroUltimaNFe ? Number(body.numeroUltimaNFe) : 0,
        serieNFSe: body.serieNFSe?.trim() || "1",
        numeroUltimaNFSe: body.numeroUltimaNFSe ? Number(body.numeroUltimaNFSe) : 0,
        ambienteSEFAZ: body.ambienteSEFAZ || "homologacao",
        codigoTributacaoIss: body.codigoTributacaoIss?.trim() || null,
        codigoNbs: body.codigoNbs?.trim() || null,
        aliquotaIss: body.aliquotaIss ? new Prisma.Decimal(body.aliquotaIss) : null,
        percentualTributosFederais: body.percentualTributosFederais?.trim() || null,
        percentualTributosEstaduais: body.percentualTributosEstaduais?.trim() || null,
        emailRemetente: body.emailRemetente?.trim() || null,
        emailAtivo: !!body.emailAtivo,
      },
      select: empresaFiscalSelect,
    });

    return NextResponse.json({
      ...created,
      hasEmailApiKey: false,
      hasCertificado: false,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/fiscal/empresa:", error);
    return NextResponse.json({ error: "Erro ao criar empresa fiscal: " + error.message }, { status: 500 });
  }
}
