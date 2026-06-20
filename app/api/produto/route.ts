import { NextRequest, NextResponse } from "next/server";
import { getProdutos, criarProduto } from "@/lib/services/produtos.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { z } from "zod";
import { ClasseRisco, Apresentacao } from "@prisma/client";

function onlyDigits(value: string | null | undefined) {
  return value ? value.replace(/\D/g, "") : "";
}

const optionalFiscalCode = (size: number, label: string) =>
  z.string().nullable().optional().refine((value) => {
    const clean = onlyDigits(value);
    return clean.length === 0 || clean.length === size;
  }, `${label} deve conter exatamente ${size} dígitos numéricos.`);

const produtoSchema = z.object({
  codigoInterno: z.string().nullable().optional(),
  codigoBarras: z.string().nullable().optional(),
  descricao: z.string().min(1, "Descrição é obrigatória."),
  categoria: z.string().nullable().optional(),
  fabricante: z.string().nullable().optional(),
  unidadeVenda: z.string().optional().default("UN"),
  unidadeCompra: z.string().nullable().optional(),
  fatorConversao: z.coerce.number().optional().default(1),
  registroAnvisa: z.string().nullable().optional(),
  temperaturaArmazenamento: z.string().nullable().optional(),
  controlaValidade: z.coerce.boolean().optional().default(false),
  controlaLote: z.coerce.boolean().optional().default(false),
  precoCustoBase: z.coerce.number().optional().default(0),
  precoVendaBase: z.coerce.number().optional().default(0),
  estoqueMinimo: z.coerce.number().optional().default(0),
  estoqueMaximo: z.coerce.number().nullable().optional(),
  tipoItem: z.string().nullable().optional(),
  produtoVariado: z.coerce.boolean().optional().default(false),
  pesoBruto: z.coerce.number().nullable().optional(),
  pesoLiquido: z.coerce.number().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  numeroOrdem: z.string().nullable().optional(),
  tamanho: z.string().nullable().optional(),
  categoriaLegadoId: z.string().nullable().optional(),
  subcategoriaLegadoId: z.string().nullable().optional(),
  dadosOrigem: z.any().nullable().optional(),

  // Campos adicionais do ProdutosClient
  cnpjFabricante: z.string().nullable().optional(),
  classeRisco: z.nativeEnum(ClasseRisco).nullable().optional(),
  codigoFabricante: z.string().nullable().optional(),
  apresentacao: z.nativeEnum(Apresentacao).nullable().optional(),
  concentracaoValor: z.coerce.number().nullable().optional(),
  concentracaoUnidade: z.string().nullable().optional(),
  principioAtivo: z.string().nullable().optional(),
  marca: z.string().nullable().optional(),
  conteudoEmbalagem: z.coerce.number().int().nullable().optional(),
  localizacaoEstoque: z.string().nullable().optional(),
  pontoReposicao: z.coerce.number().nullable().optional(),
  categoriaId: z.coerce.number().int().nullable().optional(),

  ncm: optionalFiscalCode(8, "NCM"),
  cfop: optionalFiscalCode(4, "CFOP"),
  cst: z.string().nullable().optional(),
  csosn: z.string().nullable().optional(),
  origemMercadoria: z.string().nullable().optional(),
  unidadeFiscal: z.string().nullable().optional(),
  aliquotaIcms: z.coerce.number().nullable().optional(),
  aliquotaIpi: z.coerce.number().nullable().optional(),
  aliquotaPis: z.coerce.number().nullable().optional(),
  aliquotaCofins: z.coerce.number().nullable().optional(),
  codigoBeneficioFiscal: z.string().nullable().optional(),
  cest: optionalFiscalCode(7, "CEST"),
  tipoClassificacaoFiscal: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || undefined;
    const categoria = searchParams.get("categoria") || undefined;

    const result = await getProdutos({ ativo: true, page, pageSize, search, categoria });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/produto", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = produtoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const produto = await criarProduto({
      codigoInterno: data.codigoInterno || null,
      codigoBarras: data.codigoBarras || null,
      descricao: data.descricao,
      categoria: data.categoria || null,
      fabricante: data.fabricante || null,
      unidadeVenda: data.unidadeVenda,
      unidadeCompra: data.unidadeCompra || null,
      fatorConversao: data.fatorConversao,
      registroAnvisa: data.registroAnvisa || null,
      temperaturaArmazenamento: data.temperaturaArmazenamento || null,
      controlaValidade: data.controlaValidade,
      controlaLote: data.controlaLote,
      precoCustoBase: data.precoCustoBase,
      precoVendaBase: data.precoVendaBase,
      estoqueMinimo: data.estoqueMinimo,
      estoqueMaximo: data.estoqueMaximo ?? null,
      tipoItem: data.tipoItem || null,
      produtoVariado: data.produtoVariado,
      pesoBruto: data.pesoBruto ?? null,
      pesoLiquido: data.pesoLiquido ?? null,
      observacoes: data.observacoes || null,
      numeroOrdem: data.numeroOrdem || null,
      tamanho: data.tamanho || null,
      categoriaLegadoId: data.categoriaLegadoId || null,
      subcategoriaLegadoId: data.subcategoriaLegadoId || null,
      dadosOrigem: data.dadosOrigem ?? undefined,
      ativo: true,

      cnpjFabricante: data.cnpjFabricante || null,
      classeRisco: data.classeRisco || null,
      codigoFabricante: data.codigoFabricante || null,
      apresentacao: data.apresentacao || null,
      concentracaoValor: data.concentracaoValor ?? null,
      concentracaoUnidade: data.concentracaoUnidade || null,
      principioAtivo: data.principioAtivo || null,
      marca: data.marca || null,
      conteudoEmbalagem: data.conteudoEmbalagem ?? null,
      localizacaoEstoque: data.localizacaoEstoque || null,
      pontoReposicao: data.pontoReposicao ?? null,
      categoriaId: data.categoriaId ?? null,

      ncm: onlyDigits(data.ncm) || null,
      cfop: onlyDigits(data.cfop) || null,
      cst: data.cst || null,
      csosn: data.csosn || null,
      origemMercadoria: data.origemMercadoria || null,
      unidadeFiscal: data.unidadeFiscal || null,
      aliquotaIcms: data.aliquotaIcms ?? null,
      aliquotaIpi: data.aliquotaIpi ?? null,
      aliquotaPis: data.aliquotaPis ?? null,
      aliquotaCofins: data.aliquotaCofins ?? null,
      codigoBeneficioFiscal: data.codigoBeneficioFiscal || null,
      cest: onlyDigits(data.cest) || null,
      tipoClassificacaoFiscal: data.tipoClassificacaoFiscal || null,
    });

    return NextResponse.json(produto, { status: 201 });
  } catch (error) {
    console.error("POST /api/produto", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar produto." },
      { status: 500 }
    );
  }
}
