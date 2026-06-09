import { test, describe, mock } from "node:test";
import assert from "node:assert";
import { gerarDanfe, danfeLib } from "./nfe-danfe.service";
import { EventEmitter } from "node:events";

describe("DANFe PDF Generator Service Unit Tests", () => {
  const mockXml = `
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe33260699888777000188550010000000111123456780" versao="4.00">
      <ide>
        <cUF>33</cUF>
        <cNF>12345678</cNF>
        <natOp>Venda de Mercadoria</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>11</nNF>
        <dhEmi>2026-06-08T20:59:01-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3302403</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>0</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>9</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>11222333000199</CNPJ>
        <xNome>DAC Distribuidora de Alimentos e Correlatos Ltda</xNome>
        <xFant>DAC Teste</xFant>
        <enderEmit>
          <xLgr>Rua do Emitter</xLgr>
          <nro>100</nro>
          <xBairro>Centro</xBairro>
          <cMun>3302403</cMun>
          <xMun>Maricá</xMun>
          <UF>RJ</UF>
          <CEP>24900000</CEP>
        </enderEmit>
        <IE>12345678</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CNPJ>44555666000188</CNPJ>
        <xNome>Hospital de Teste S/A</xNome>
        <enderDest>
          <xLgr>Avenida do Cliente</xLgr>
          <nro>200</nro>
          <xBairro>Icaraí</xBairro>
          <cMun>3303302</cMun>
          <xMun>Niterói</xMun>
          <UF>RJ</UF>
          <CEP>24220000</CEP>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>00001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>Medicamento Teste 500mg</xProd>
          <NCM>30049099</NCM>
          <CFOP>5102</CFOP>
          <uCom>CX</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>50.0000</vUnCom>
          <vProd>500.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>CX</uTrib>
          <qTrib>10.0000</qTrib>
          <vUnTrib>50.0000</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
          <PIS>
            <PISNT>
              <CST>07</CST>
            </PISNT>
          </PIS>
          <COFINS>
            <COFINSNT>
              <CST>07</CST>
            </COFINSNT>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>500.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>500.00</vNF>
          <vTotTrib>0.00</vTotTrib>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>15</tPag>
          <vPag>500.00</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>SVRS4.0</verAplic>
      <chNFe>33260699888777000188550010000000111123456780</chNFe>
      <dhRecbto>2026-06-08T20:59:01-03:00</dhRecbto>
      <nProt>133261234567890</nProt>
      <digVal>abcdef</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>
`;

  test("Geração bem-sucedida retorna base64 não-vazio", async () => {
    const base64 = await gerarDanfe(mockXml);
    assert.ok(base64, "Deve retornar uma string base64");
    assert.strictEqual(typeof base64, "string", "Deve ser uma string");
    assert.ok(base64.length > 0, "A string base64 nao deve ser vazia");

    const buffer = Buffer.from(base64, "base64");
    assert.ok(buffer.length > 0, "O buffer decodificado nao deve ser vazio");
    assert.strictEqual(buffer.slice(0, 4).toString(), "%PDF", "O buffer deve comecar com a assinatura de PDF");
  });

  test("XML vazio lança erro descritivo", async () => {
    await assert.rejects(
      gerarDanfe(""),
      /XML autorizado nao pode ser vazio/
    );
    await assert.rejects(
      gerarDanfe("   "),
      /XML autorizado nao pode ser vazio/
    );
  });

  test("Erro interno do stream é capturado e relançado corretamente", async () => {
    mock.method(danfeLib, "gerarPDF", async () => {
      const fakeDoc = new EventEmitter() as any;
      setTimeout(() => {
        fakeDoc.emit("error", new Error("Erro simulado no stream de PDF"));
      }, 10);
      return fakeDoc;
    });

    try {
      await assert.rejects(
        gerarDanfe(mockXml),
        /Erro simulado no stream de PDF/
      );
    } finally {
      mock.restoreAll();
    }
  });
});
