import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import forge from "node-forge";

const ALGORITHM = "aes-256-cbc";

/**
 * Obtém a chave de criptografia de 32 bytes (256 bits) a partir do env CERT_ENCRYPTION_KEY.
 * Utiliza o hash SHA-256 para garantir que a chave possua exatamente 32 bytes.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CERT_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("A variavel de ambiente CERT_ENCRYPTION_KEY nao foi definida.");
  }
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Criptografa uma senha usando AES-256-CBC.
 * Retorna uma string contendo o IV e o texto criptografado separados por dois pontos (ivHex:encryptedHex).
 * IMPORTANTE: Tanto o IV quanto o texto criptografado usam codificacao HEXADECIMAL (hex), nao base64.
 */
export function criptografarSenha(senha: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(senha, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  // Retorna no formato ivHex:encryptedHex (ambos em codificacao hexadecimal)
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Descriptografa uma senha criptografada no formato ivHex:encryptedHex.
 * IMPORTANTE: Decodifica explicitamente a partir de strings em formato HEXADECIMAL (hex).
 */
export function descriptografarSenha(senhaCriptografada: string): string {
  const parts = senhaCriptografada.split(":");
  if (parts.length !== 2) {
    throw new Error("Formato de senha criptografada invalido. Deve ser ivHex:encryptedHex.");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encryptedTextHex = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let decrypted = decipher.update(encryptedTextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Carrega a chave privada e o certificado publico de uma empresa a partir do banco de dados.
 * IMPORTANTE: Faz um select isolado apenas para as credenciais sensiveis do certificado,
 * evitando exposicao indevida ou poluicao das queries normais do sistema.
 */
export async function carregarCertificado(empresaEmissoraId: number): Promise<{
  privateKeyPem: string;
  certificatePem: string;
  validity: Date;
}> {
  // Select restrito e isolado, livre do fiscal-select padrão
  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaEmissoraId },
    select: {
      id: true,
      certificadoPfxBase64: true,
      certificadoSenha: true,
    },
  });

  if (!empresa) {
    throw new Error(`Empresa emissora ID ${empresaEmissoraId} nao encontrada.`);
  }

  if (!empresa.certificadoPfxBase64 || !empresa.certificadoSenha) {
    throw new Error(`Empresa ID ${empresaEmissoraId} nao possui certificado digital cadastrado.`);
  }

  // Descriptografa a senha do certificado
  let senhaDecriptografada: string;
  try {
    senhaDecriptografada = descriptografarSenha(empresa.certificadoSenha);
  } catch (err) {
    throw new Error(`Erro ao descriptografar a senha do certificado da empresa ID ${empresaEmissoraId}.`);
  }

  try {
    // Leitura do PFX Base64 com node-forge
    const pfxDer = forge.util.decode64(empresa.certificadoPfxBase64);
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, senhaDecriptografada);

    // Extração da chave privada
    let privateKeyPem = "";
    const shroudedKeyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
    if (shroudedKeyBags.length > 0 && shroudedKeyBags[0].key) {
      privateKeyPem = forge.pki.privateKeyToPem(shroudedKeyBags[0].key);
    } else {
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [];
      if (keyBags.length > 0 && keyBags[0].key) {
        privateKeyPem = forge.pki.privateKeyToPem(keyBags[0].key);
      }
    }

    if (!privateKeyPem) {
      throw new Error("Chave privada nao encontrada no arquivo PFX.");
    }

    // Extração do certificado publico e validade
    let certificatePem = "";
    let validity: Date | null = null;
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (certBags.length > 0 && certBags[0].cert) {
      certificatePem = forge.pki.certificateToPem(certBags[0].cert);
      validity = certBags[0].cert.validity.notAfter;
    }

    if (!certificatePem || !validity) {
      throw new Error("Certificado ou data de validade nao encontrados no arquivo PFX.");
    }

    return {
      privateKeyPem,
      certificatePem,
      validity,
    };
  } catch (err: any) {
    // Garante que a senha descriptografada ou dados brutos nunca aparecam na mensagem de erro
    throw new Error(`Erro ao ler/processar o certificado PFX da empresa ID ${empresaEmissoraId}: ${err.message || err}`);
  }
}

/**
 * Verifica a validade do certificado digital de uma empresa e retorna se ele esta expirado
 * ou prestes a expirar (menos de 30 dias).
 */
export async function verificarValidade(empresaEmissoraId: number): Promise<{
  valido: boolean;
  venceEm: Date;
  alertar: boolean;
}> {
  const { validity } = await carregarCertificado(empresaEmissoraId);
  
  const agora = new Date();
  const valido = validity > agora;
  
  // Limite de 30 dias em milissegundos
  const trintaDiasEmMs = 30 * 24 * 60 * 60 * 1000;
  const diferencaMs = validity.getTime() - agora.getTime();
  const alertar = diferencaMs < trintaDiasEmMs;

  if (alertar) {
    // Alerta sem expor senha ou PFX brutos
    console.warn(
      `WARNING: O certificado digital da empresa ID ${empresaEmissoraId} expira em menos de 30 dias! Vence em: ${validity.toISOString()}`
    );
  }

  return {
    valido,
    venceEm: validity,
    alertar,
  };
}
