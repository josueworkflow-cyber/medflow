import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { enviarNFe } from "./nfe-sender.service";

describe("NF-e Sender Service Unit Tests", () => {
  let empresaIdValida: number;

  before(async () => {
    // 0. Limpar qualquer dado de teste residual
    await prisma.empresaFiscal.deleteMany({
      where: { cnpj: "99888777000177" }
    });

    // 1. Criar empresa fiscal de teste
    const empresa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Empresa Transmissora LTDA",
        cnpj: "99888777000177",
        inscricaoEstadual: "12345678",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        ambienteSEFAZ: "homologacao"
      }
    });
    empresaIdValida = empresa.id;
  });

  after(async () => {
    // Limpeza final do banco e restauracao dos mocks do fetch
    await prisma.empresaFiscal.deleteMany({
      where: { id: empresaIdValida }
    });
    
    mock.restoreAll();
  });

  test("Caso de Teste 1: Retorno cStat 100 -> RetornoSEFAZ com autorizada: true e chaveAcesso preenchida", async () => {
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => {
      const responseSoap = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeAutorizacaoLoteResult xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <retConsReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso da NF-e</xMotivo>
        <protNFe versao="4.00">
          <infProt>
            <chNFe>33260699888777000177550010000000111123456780</chNFe>
            <nProt>133261234567890</nProt>
            <cStat>100</cStat>
            <xMotivo>Autorizado o uso da NF-e</xMotivo>
          </infProt>
        </protNFe>
      </retConsReciNFe>
    </nfeAutorizacaoLoteResult>
  </soap12:Body>
</soap12:Envelope>`;
      return {
        ok: true,
        status: 200,
        text: async () => responseSoap
      } as Response;
    });

    const retorno = await enviarNFe("<xmlAssinado/>", empresaIdValida);
    assert.strictEqual(retorno.autorizada, true);
    assert.strictEqual(retorno.chaveAcesso, "33260699888777000177550010000000111123456780");
    assert.strictEqual(retorno.protocolo, "133261234567890");
    assert.ok(retorno.xmlAutorizado?.includes("<nfeProc"), "Deve conter a tag nfeProc");
    assert.ok(retorno.xmlAutorizado?.includes("<protNFe"), "Deve conter a tag protNFe");
  });

  test("Caso de Teste 2: Retorno cStat 150 (sucesso fora do prazo) -> RetornoSEFAZ com autorizada: true e chaveAcesso preenchida", async () => {
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => {
      const responseSoap = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeAutorizacaoLoteResult xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <retConsReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <cStat>150</cStat>
        <xMotivo>Autorizado o uso da NF-e fora do prazo</xMotivo>
        <protNFe versao="4.00">
          <infProt>
            <chNFe>33260699888777000177550010000000111123456780</chNFe>
            <nProt>133261234567890</nProt>
            <cStat>150</cStat>
            <xMotivo>Autorizado o uso da NF-e fora do prazo</xMotivo>
          </infProt>
        </protNFe>
      </retConsReciNFe>
    </nfeAutorizacaoLoteResult>
  </soap12:Body>
</soap12:Envelope>`;
      return {
        ok: true,
        status: 200,
        text: async () => responseSoap
      } as Response;
    });

    const retorno = await enviarNFe("<xmlAssinado/>", empresaIdValida);
    assert.strictEqual(retorno.autorizada, true);
    assert.strictEqual(retorno.chaveAcesso, "33260699888777000177550010000000111123456780");
    assert.strictEqual(retorno.protocolo, "133261234567890");
  });

  test("Caso de Teste 3: Retorno de rejeicao (ex: cStat 204) -> autorizada: false com codigoRejeicao e mensagemRejeicao", async () => {
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => {
      const responseSoap = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeAutorizacaoLoteResult xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <retConsReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <cStat>204</cStat>
        <xMotivo>Rejeicao: Duplicidade de NF-e</xMotivo>
      </retConsReciNFe>
    </nfeAutorizacaoLoteResult>
  </soap12:Body>
</soap12:Envelope>`;
      return {
        ok: true,
        status: 200,
        text: async () => responseSoap
      } as Response;
    });

    const retorno = await enviarNFe("<xmlAssinado/>", empresaIdValida);
    assert.strictEqual(retorno.autorizada, false);
    assert.strictEqual(retorno.codigoRejeicao, "204");
    assert.strictEqual(retorno.mensagemRejeicao, "Rejeicao: Duplicidade de NF-e");
  });

  test("Caso de Teste 4: Falha de comunicacao (timeout/HTTP 500) -> lanca excecao", async () => {
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => {
      return {
        ok: false,
        status: 500,
        text: async () => "Erro interno do servidor"
      } as Response;
    });

    await assert.rejects(
      enviarNFe("<xmlAssinado/>", empresaIdValida),
      new Error("Erro de transmissao da NF-e: Falha de comunicacao com a SEFAZ (HTTP 500)")
    );
  });
});
