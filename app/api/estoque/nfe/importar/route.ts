import { NextRequest, NextResponse } from "next/server";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { NFeImportacaoService } from "@/lib/services/fiscal/nfe/nfe-importacao.service";

export async function POST(req: NextRequest) {
  // 1. Validar autenticação do usuário
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  // 2. Validar permissões (ESTOQUE ou ADMINISTRADOR)
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    // Suporta tanto o campo "xml" do briefing quanto o campo "file" do preview do form anterior
    const file = (formData.get("xml") || formData.get("file")) as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // 3. Converter arquivo para base64
    const arrayBuffer = await file.arrayBuffer();
    const xmlBase64 = Buffer.from(arrayBuffer).toString("base64");

    // 4. Invocar o serviço de importação
    const result = await NFeImportacaoService.importarNFeEntrada(
      xmlBase64,
      actor.usuarioId || 1
    );

    // 5. Retornar sucesso
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("Erro na rota de importacao de XML:", error);

    // Mapear respostas de erro conforme especificações
    if (error.message === "Nota fiscal já importada anteriormente") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Erro ao processar o XML." },
      { status: 400 }
    );
  }
}
