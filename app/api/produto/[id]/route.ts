import { NextRequest, NextResponse } from "next/server";
import { getProdutoById, atualizarProdutoComAuditoria, inativarProduto } from "@/lib/services/produtos.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

function nullableString(value: any): string | null | undefined {
  return value === undefined ? undefined : value;
}

function nullableNumber(value: any): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function nullableDigits(value: any): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return String(value).replace(/\D/g, "");
}

function validarCodigoFiscal(value: any, size: number, label: string): string | null {
  const clean = nullableDigits(value);
  if (!clean) return null;
  if (clean.length !== size) {
    throw new Error(`${label} deve conter exatamente ${size} dígitos numéricos.`);
  }
  return clean;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { id } = await params;
    const produto = await getProdutoById(Number(id));

    if (!produto) {
      return NextResponse.json(
        { error: "Produto nao encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(produto);
  } catch (error) {
    console.error("GET /api/produto/[id]", error);
    return NextResponse.json(
      { error: "Erro ao buscar produto." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    const { motivo } = body;
    if (!motivo || typeof motivo !== "string" || motivo.trim().length < 5) {
      return NextResponse.json(
        { error: "Informe um motivo para a alteração (mínimo 5 caracteres)." },
        { status: 400 }
      );
    }

    const ncm = body.ncm !== undefined ? validarCodigoFiscal(body.ncm, 8, "NCM") : undefined;
    const cfop = body.cfop !== undefined ? validarCodigoFiscal(body.cfop, 4, "CFOP") : undefined;
    const cest = body.cest !== undefined ? validarCodigoFiscal(body.cest, 7, "CEST") : undefined;

    const produto = await atualizarProdutoComAuditoria(Number(id), {
      codigoInterno: nullableString(body.codigoInterno),
      codigoBarras: nullableString(body.codigoBarras),
      descricao: body.descricao ?? undefined,
      categoria: body.categoria ?? undefined,
      categoriaId: nullableNumber(body.categoriaId),
      fabricante: nullableString(body.fabricante),
      cnpjFabricante: nullableString(body.cnpjFabricante),
      classeRisco: nullableString(body.classeRisco) as any,
      codigoFabricante: nullableString(body.codigoFabricante),
      unidadeVenda: body.unidadeVenda ?? undefined,
      unidadeCompra: body.unidadeCompra ?? undefined,
      fatorConversao: body.fatorConversao !== undefined ? Number(body.fatorConversao) : undefined,
      conteudoEmbalagem: nullableNumber(body.conteudoEmbalagem),
      registroAnvisa: nullableString(body.registroAnvisa),
      temperaturaArmazenamento: nullableString(body.temperaturaArmazenamento),
      controlaValidade: body.controlaValidade ?? undefined,
      controlaLote: body.controlaLote ?? undefined,
      precoCustoBase: body.precoCustoBase !== undefined ? Number(body.precoCustoBase) : undefined,
      precoVendaBase: body.precoVendaBase !== undefined ? Number(body.precoVendaBase) : undefined,
      estoqueMinimo: body.estoqueMinimo !== undefined ? Number(body.estoqueMinimo) : undefined,
      estoqueMaximo: nullableNumber(body.estoqueMaximo),
      tipoItem: nullableString(body.tipoItem),
      produtoVariado: body.produtoVariado ?? undefined,
      pesoBruto: nullableNumber(body.pesoBruto),
      pesoLiquido: nullableNumber(body.pesoLiquido),
      observacoes: nullableString(body.observacoes),
      numeroOrdem: nullableString(body.numeroOrdem),
      tamanho: nullableString(body.tamanho),
      categoriaLegadoId: nullableString(body.categoriaLegadoId),
      subcategoriaLegadoId: nullableString(body.subcategoriaLegadoId),
      dadosOrigem: body.dadosOrigem !== undefined ? body.dadosOrigem : undefined,
      pontoReposicao: nullableNumber(body.pontoReposicao),
      localizacaoEstoque: nullableString(body.localizacaoEstoque),
      apresentacao: nullableString(body.apresentacao) as any,
      concentracaoValor: nullableNumber(body.concentracaoValor),
      concentracaoUnidade: nullableString(body.concentracaoUnidade),
      principioAtivo: nullableString(body.principioAtivo),
      marca: nullableString(body.marca),
      ncm,
      cfop,
      cst: nullableString(body.cst),
      csosn: nullableString(body.csosn),
      origemMercadoria: nullableString(body.origemMercadoria),
      unidadeFiscal: nullableString(body.unidadeFiscal),
      aliquotaIcms: nullableNumber(body.aliquotaIcms),
      aliquotaIpi: nullableNumber(body.aliquotaIpi),
      aliquotaPis: nullableNumber(body.aliquotaPis),
      aliquotaCofins: nullableNumber(body.aliquotaCofins),
      codigoBeneficioFiscal: nullableString(body.codigoBeneficioFiscal),
      cest,
      tipoClassificacaoFiscal: nullableString(body.tipoClassificacaoFiscal),
    }, motivo, actor.usuarioId);

    return NextResponse.json(produto);
  } catch (error: any) {
    console.error("PUT /api/produto/[id]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar produto." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { id } = await params;

    await inativarProduto(Number(id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/produto/[id]", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto." },
      { status: 500 }
    );
  }
}
