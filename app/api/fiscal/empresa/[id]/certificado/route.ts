import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { criptografarSenha, verificarValidade } from "@/lib/services/fiscal/certificado.service";
import forge from "node-forge";

export async function POST(
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
    const { certificadoPfxBase64, certificadoSenha } = body;

    if (!certificadoPfxBase64) {
      return NextResponse.json({ error: "Arquivo de certificado PFX base64 e obrigatorio." }, { status: 400 });
    }
    if (certificadoSenha === undefined || certificadoSenha === null) {
      return NextResponse.json({ error: "Senha do certificado e obrigatoria." }, { status: 400 });
    }

    // Valida se a empresa existe
    const empresa = await prisma.empresaFiscal.findUnique({
      where: { id: companyId },
    });
    if (!empresa) {
      return NextResponse.json({ error: "Empresa nao encontrada." }, { status: 404 });
    }

    // Leitura e validacao do PFX com a senha
    let validityDate: Date;
    try {
      const pfxDer = forge.util.decode64(certificadoPfxBase64);
      const pfxAsn1 = forge.asn1.fromDer(pfxDer);
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, certificadoSenha);

      const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
      if (certBags.length > 0 && certBags[0].cert) {
        validityDate = certBags[0].cert.validity.notAfter;
      } else {
        throw new Error("Certificado nao encontrado no arquivo PFX.");
      }
    } catch (err: any) {
      return NextResponse.json(
        { error: "Erro ao ler/validar certificado PFX (verifique a senha): " + (err.message || err) },
        { status: 400 }
      );
    }

    // Criptografa a senha
    const senhaCriptografada = criptografarSenha(certificadoSenha);

    // Salva no banco de dados
    await prisma.empresaFiscal.update({
      where: { id: companyId },
      data: {
        certificadoPfxBase64,
        certificadoSenha: senhaCriptografada,
        certificadoValidade: validityDate,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Certificado digital salvo com sucesso.",
      validade: validityDate.toISOString(),
    });
  } catch (error: any) {
    console.error("POST /api/fiscal/empresa/[id]/certificado:", error);
    return NextResponse.json({ error: "Erro ao salvar certificado: " + error.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const companyId = Number(id);

  if (isNaN(companyId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  try {
    const statusValidade = await verificarValidade(companyId);
    return NextResponse.json(statusValidade);
  } catch (error: any) {
    // Retorna vazio/desabilitado caso nao possua certificado cadastrado
    return NextResponse.json({
      valido: false,
      venceEm: null,
      alertar: false,
      notRegistered: true,
    });
  }
}
