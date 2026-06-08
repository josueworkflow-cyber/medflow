import https from "https";
import { prisma } from "@/lib/prisma";
import { buildNFSePayload } from "./nfse-builder.service";
import { carregarCertificado } from "../certificado.service";
import { RetornoNFSe } from "./nfse.types";

// URLs de producao e homologacao da API Nacional de NFS-e (REST/JSON)
const API_URLS: Record<string, string> = {
  homologacao: "https://hom.api.nfse.gov.br/v1/dps",
  producao: "https://api.nfse.gov.br/v1/dps"
};

/**
 * Funcao auxiliar para realizar requisicao POST HTTPS com suporte a agente mTLS nativo do Node.
 */
function postRequest(
  urlStr: string,
  body: string,
  agent: https.Agent
): Promise<{ status: number; responseText: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      agent: agent,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          responseText: data
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Envia um lote DPS de NFS-e para a API Nacional utilizando mTLS.
 * 
 * Regra de seguranca: Nunca loga o payload DPS ou credenciais em mensagens de erro/console.
 * Regra de validacao: Erros do builder ou certificado sobem diretamente (nao sao engolidos).
 */
export async function enviarNFSe(
  empresaEmissoraId: number,
  pedidoVendaId: number
): Promise<RetornoNFSe> {
  // 1. Chamadas de validacao e montagem do payload
  // Quaisquer erros de validacao/dados aqui sobem diretamente como excecao para o chamador
  const payload = await buildNFSePayload(pedidoVendaId);
  const certData = await carregarCertificado(empresaEmissoraId);

  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaEmissoraId },
    select: { ambienteSEFAZ: true }
  });

  if (!empresa) {
    throw new Error(`Empresa emissora ID ${empresaEmissoraId} nao encontrada.`);
  }

  const ambiente = (empresa.ambienteSEFAZ || "homologacao").toLowerCase();
  const url = API_URLS[ambiente];
  if (!url) {
    throw new Error(`URL da API NFS-e nao configurada para o ambiente: ${ambiente}`);
  }

  // Cria o HTTPS Agent para autenticacao mutua (mTLS)
  const agent = new https.Agent({
    cert: certData.certificatePem,
    key: certData.privateKeyPem,
  });

  const payloadString = JSON.stringify(payload);

  // 2. Transmissao HTTP (try/catch especifico de conexao/comunicacao)
  let status: number;
  let responseText: string;
  try {
    const res = await postRequest(url, payloadString, agent);
    status = res.status;
    responseText = res.responseText;
  } catch (error: any) {
    // Log seguro apenas com dados nao sensiveis
    console.error(
      `Erro de transmissao da NFS-e para a empresa ID ${empresaEmissoraId}, pedido ${pedidoVendaId}: ${error.message || error}`
    );
    throw new Error(`Falha de comunicacao com a API NFS-e Nacional: ${error.message || error}`);
  }

  // 3. Processamento de resposta
  let jsonBody: any = null;
  try {
    jsonBody = JSON.parse(responseText);
  } catch {
    // Ignora erros de JSON caso a resposta nao seja estruturada
  }

  // Sucesso: HTTP 201 contendo chaveAcesso
  if (status === 201 && jsonBody && jsonBody.chaveAcesso) {
    return {
      autorizada: true,
      chaveAcesso: jsonBody.chaveAcesso,
      xmlAutorizado: responseText // Guarda o corpo do JSON retornado pela API Nacional
    };
  }
  // Rejeicao Fiscal: HTTP 422 ou corpo contendo array de erros[]
  else if (status === 422 || (jsonBody && Array.isArray(jsonBody.erros) && jsonBody.erros.length > 0)) {
    const firstError = jsonBody && Array.isArray(jsonBody.erros) && jsonBody.erros[0] ? jsonBody.erros[0] : {};
    return {
      autorizada: false,
      codigoRejeicao: firstError.codigo || firstError.code || String(status),
      mensagemRejeicao: firstError.descricao || firstError.message || "Rejeicao da API NFS-e Nacional"
    };
  }
  // Outros erros de comunicacao / HTTP status
  else {
    throw new Error(`Falha de comunicacao com a API NFS-e Nacional (HTTP ${status})`);
  }
}
