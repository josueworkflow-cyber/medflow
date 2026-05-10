import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNFeXML } from "@/lib/nfe-generator";
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

    const venda = await prisma.pedidoVenda.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        empresaFiscal: true,
        itens: {
          include: { produto: true },
        },
      },
    });

    if (!venda) {
      return NextResponse.json({ error: "Venda nao encontrada." }, { status: 404 });
    }

    if (venda.tipoPedido !== "PEDIDO_NORMAL") {
      return NextResponse.json({ error: "Pedido interno nao emite NF." }, { status: 400 });
    }
    if (!venda.empresaFiscalId) {
      return NextResponse.json({ error: "Empresa emissora nao definida." }, { status: 400 });
    }

    const xmlData = {
      vendaId: venda.id,
      numero: venda.id.toString().padStart(6, '0'),
      dataEmissao: new Date(),
      cliente: {
        razaoSocial: venda.cliente.razaoSocial,
        cnpjCpf: venda.cliente.cnpjCpf || "",
        logradouro: venda.cliente.endereco?.split(',')[0] || "Nao informado",
        numero: venda.cliente.endereco?.split(',')[1]?.trim() || "SN",
        bairro: "Bairro",
        cidade: venda.cliente.cidade || "Cidade",
        uf: venda.cliente.estado || "SP",
        cep: venda.cliente.cep || "00000000",
        email: venda.cliente.email || undefined,
      },
      itens: venda.itens.map((item) => ({
        codigo: item.produto.codigoInterno || item.produtoId.toString(),
        descricao: item.produto.descricao,
        ncm: "30049099",
        cfop: "5102",
        unidade: item.produto.unidadeVenda || "UN",
        quantidade: item.quantidade,
        valorUnitario: item.precoUnitario,
        valorTotal: item.subtotal,
      })),
      total: venda.valorTotal,
    };

    const xml = generateNFeXML(xmlData);

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
