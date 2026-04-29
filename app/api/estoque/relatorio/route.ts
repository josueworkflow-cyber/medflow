import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const relatorio = await prisma.estoqueAtual.findMany({
      include: {
        produto: true,
        lote: true,
        localizacao: true
      }
    });
    return NextResponse.json(relatorio);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao gerar relatório físico" }, { status: 500 });
  }
}
