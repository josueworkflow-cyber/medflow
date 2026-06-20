import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthActor();
    if (!actor) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    try {
      assertPerfil(actor, ["FINANCEIRO", "ADMINISTRADOR"]);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    const { id } = await params;
    const docId = Number(id);

    if (isNaN(docId)) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const documento = await prisma.documentoFiscal.findUnique({
      where: { id: docId },
      include: {
        pedidoVenda: true,
      },
    });

    if (!documento) {
      return NextResponse.json({ error: "Documento fiscal nao encontrado." }, { status: 404 });
    }

    // Valida que pertence a um pedido acessivel
    if (!documento.pedidoVendaId || !documento.pedidoVenda) {
      return NextResponse.json(
        { error: "Documento fiscal nao possui pedido de venda associado." },
        { status: 400 }
      );
    }

    if (!documento.danfePdfBase64) {
      return NextResponse.json(
        { error: "DANFe ainda não gerado para este documento" },
        { status: 404 }
      );
    }

    const pdfBuffer = Buffer.from(documento.danfePdfBase64, "base64");
    const filename = `danfe-${documento.chaveAcesso || documento.id}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Erro no GET /api/fiscal/[id]/danfe:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar o DANFe." },
      { status: 500 }
    );
  }
}
