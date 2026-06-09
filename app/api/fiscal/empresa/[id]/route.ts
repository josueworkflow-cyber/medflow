import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { empresaFiscalSelect } from "@/lib/fiscal-select";
import { Prisma, RegimeTributario } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  const { id } = await params;
  const companyId = Number(id);

  if (isNaN(companyId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  try {
    const body = await req.json();

    // Valida se a empresa existe
    const empresaOriginal = await prisma.empresaFiscal.findUnique({
      where: { id: companyId },
    });
    if (!empresaOriginal) {
      return NextResponse.json({ error: "Empresa nao encontrada." }, { status: 404 });
    }

    const data: Prisma.EmpresaFiscalUpdateInput = {};

    if (body.razaoSocial !== undefined) {
      if (!body.razaoSocial?.trim()) {
        return NextResponse.json({ error: "Razao social nao pode ser vazia." }, { status: 400 });
      }
      data.razaoSocial = body.razaoSocial.trim();
    }

    if (body.cnpj !== undefined) {
      if (!body.cnpj?.trim()) {
        return NextResponse.json({ error: "CNPJ nao pode ser vazio." }, { status: 400 });
      }
      const cnpjClean = body.cnpj.replace(/[^\d]+/g, "");
      // Verifica unicidade
      const existe = await prisma.empresaFiscal.findFirst({
        where: { cnpj: cnpjClean, id: { not: companyId } },
      });
      if (existe) {
        return NextResponse.json({ error: "CNPJ ja cadastrado por outra empresa." }, { status: 400 });
      }
      data.cnpj = cnpjClean;
    }

    if (body.nomeFantasia !== undefined) data.nomeFantasia = body.nomeFantasia?.trim() || null;
    if (body.inscricaoEstadual !== undefined) data.inscricaoEstadual = body.inscricaoEstadual?.trim() || null;
    if (body.inscricaoMunicipal !== undefined) data.inscricaoMunicipal = body.inscricaoMunicipal?.trim() || null;

    if (body.regimeTributario !== undefined) {
      let regimeTributario: RegimeTributario | null = null;
      if (body.regimeTributario && Object.values(RegimeTributario).includes(body.regimeTributario)) {
        regimeTributario = body.regimeTributario as RegimeTributario;
      }
      data.regimeTributario = regimeTributario;
    }

    if (body.logradouro !== undefined) data.logradouro = body.logradouro?.trim() || null;
    if (body.numero !== undefined) data.numero = body.numero?.trim() || null;
    if (body.complemento !== undefined) data.complemento = body.complemento?.trim() || null;
    if (body.bairro !== undefined) data.bairro = body.bairro?.trim() || null;
    if (body.municipio !== undefined) data.municipio = body.municipio?.trim() || null;
    if (body.codigoMunicipio !== undefined) data.codigoMunicipio = body.codigoMunicipio?.trim() || null;
    if (body.uf !== undefined) data.uf = body.uf?.trim() || null;
    if (body.cep !== undefined) data.cep = body.cep?.trim() || null;

    if (body.serieNFe !== undefined) data.serieNFe = body.serieNFe?.trim() || "1";
    if (body.numeroUltimaNFe !== undefined) data.numeroUltimaNFe = body.numeroUltimaNFe ? Number(body.numeroUltimaNFe) : 0;
    if (body.serieNFSe !== undefined) data.serieNFSe = body.serieNFSe?.trim() || "1";
    if (body.numeroUltimaNFSe !== undefined) data.numeroUltimaNFSe = body.numeroUltimaNFSe ? Number(body.numeroUltimaNFSe) : 0;

    if (body.ambienteSEFAZ !== undefined) data.ambienteSEFAZ = body.ambienteSEFAZ || "homologacao";

    if (body.codigoTributacaoIss !== undefined) data.codigoTributacaoIss = body.codigoTributacaoIss?.trim() || null;
    if (body.codigoNbs !== undefined) data.codigoNbs = body.codigoNbs?.trim() || null;
    if (body.aliquotaIss !== undefined) {
      data.aliquotaIss = body.aliquotaIss ? new Prisma.Decimal(body.aliquotaIss) : null;
    }
    if (body.percentualTributosFederais !== undefined) {
      data.percentualTributosFederais = body.percentualTributosFederais?.trim() || null;
    }
    if (body.percentualTributosEstaduais !== undefined) {
      data.percentualTributosEstaduais = body.percentualTributosEstaduais?.trim() || null;
    }

    if (body.emailRemetente !== undefined) data.emailRemetente = body.emailRemetente?.trim() || null;
    if (body.emailAtivo !== undefined) data.emailAtivo = !!body.emailAtivo;

    const updated = await prisma.empresaFiscal.update({
      where: { id: companyId },
      data,
      select: empresaFiscalSelect,
    });

    // Adiciona flags informativas sem expor valores reais
    return NextResponse.json({
      ...updated,
      hasEmailApiKey: !!empresaOriginal.emailApiKey,
      hasCertificado: !!empresaOriginal.certificadoPfxBase64,
    });
  } catch (error: any) {
    console.error("PATCH /api/fiscal/empresa/[id]:", error);
    return NextResponse.json({ error: "Erro ao atualizar empresa fiscal: " + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  const { id } = await params;
  const companyId = Number(id);

  if (isNaN(companyId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  try {
    // Soft delete: set ativo: false, never delete from database
    await prisma.empresaFiscal.update({
      where: { id: companyId },
      data: { ativo: false },
    });

    return NextResponse.json({ success: true, message: "Empresa desativada com sucesso." });
  } catch (error: any) {
    console.error("DELETE /api/fiscal/empresa/[id]:", error);
    return NextResponse.json({ error: "Erro ao desativar empresa fiscal: " + error.message }, { status: 500 });
  }
}
