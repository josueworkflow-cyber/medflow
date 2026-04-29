import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNFeXML } from "@/lib/nfe-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const venda = await prisma.pedidoVenda.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        itens: {
          include: { produto: true },
        },
      },
    });

    if (!venda) {
      return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
    }

    // Preparar dados para o gerador
    const xmlData = {
      vendaId: venda.id,
      numero: venda.id.toString().padStart(6, '0'),
      dataEmissao: new Date(),
      cliente: {
        razaoSocial: venda.cliente.razaoSocial,
        cnpjCpf: venda.cliente.cnpjCpf || "",
        logradouro: venda.cliente.endereco?.split(',')[0] || "Não informado",
        numero: venda.cliente.endereco?.split(',')[1]?.trim() || "SN",
        bairro: "Bairro", // Campo padrão se não tivermos
        cidade: venda.cliente.cidade || "Cidade",
        uf: venda.cliente.estado || "SP",
        cep: venda.cliente.cep || "00000000",
        email: venda.cliente.email || undefined,
      },
      itens: venda.itens.map((item) => ({
        codigo: item.produto.codigoInterno || item.produtoId.toString(),
        descricao: item.produto.descricao,
        ncm: "30049099", // NCM genérico para medicamentos
        cfop: "5102", // Venda de mercadoria
        unidade: item.produto.unidadeVenda || "UN",
        quantidade: item.quantidade,
        valorUnitario: item.precoUnitario,
        valorTotal: item.subtotal,
      })),
      total: venda.valorTotal,
    };

    const xml = generateNFeXML(xmlData);

    // Retorna o XML como arquivo para download
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="NFe-${venda.id}.xml"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar XML de NF-e:", error);
    return NextResponse.json({ error: "Erro ao gerar nota fiscal." }, { status: 500 });
  }
}
