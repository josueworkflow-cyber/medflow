import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { id } = await params;

    const documento = await prisma.documentoFiscal.findFirst({
      where: { pedidoVendaId: Number(id), tipo: "NFE_SAIDA" },
      orderBy: { createdAt: "desc" },
    });

    if (!documento) {
      return NextResponse.json({ error: "O pedido ainda nao possui tentativa de NF-e." }, { status: 404 });
    }
    if (documento.status !== "AUTORIZADA" || !documento.xmlAutorizadoBase64) {
      return NextResponse.json({
        error: documento.status === "REJEITADA"
          ? documento.mensagemRejeicao || documento.motivoRejeicao || "NF-e rejeitada."
          : "A NF-e ainda nao foi autorizada.",
      }, { status: 409 });
    }
    const xml = Buffer.from(documento.xmlAutorizadoBase64, "base64").toString("utf8");

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="NFe-${documento.chaveAcesso || documento.id}.xml"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar XML de NF-e:", error);
    return NextResponse.json({ error: "Erro ao gerar nota fiscal." }, { status: 500 });
  }
}
