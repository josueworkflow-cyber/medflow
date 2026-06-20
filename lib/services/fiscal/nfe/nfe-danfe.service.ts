import { gerarPDF } from "@alexssmusica/node-pdf-nfe";

// Objeto auxiliar exportado para permitir mock nos testes unitarios
export const danfeLib = {
  gerarPDF,
};

/**
 * Gera o PDF do DANFe a partir de um XML autorizado.
 * 
 * @param xmlAutorizado XML completo assinado + protocolo de autorizacao (nfeProc)
 * @returns Promise contendo a string PDF em base64
 */
export async function gerarDanfe(xmlAutorizado: string): Promise<string> {
  try {
    if (!xmlAutorizado || xmlAutorizado.trim() === "") {
      throw new Error("XML autorizado nao pode ser vazio.");
    }

    const pdfDoc = await danfeLib.gerarPDF(xmlAutorizado, { cancelada: false });

    return await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString("base64"));
        } catch (err) {
          reject(err);
        }
      });
      pdfDoc.on("error", (err: any) => {
        reject(err);
      });
    });
  } catch (error: any) {
    const xmlLength = xmlAutorizado ? xmlAutorizado.length : 0;
    // NUNCA logar o XML completo, apenas o tamanho
    console.error(`Erro ao gerar DANFe. Tamanho do XML: ${xmlLength}. Mensagem: ${error.message || error}`);
    throw new Error(`Falha na geracao do DANFe: ${error.message || error}`);
  }
}
