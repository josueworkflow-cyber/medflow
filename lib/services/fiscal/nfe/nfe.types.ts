export interface RetornoSEFAZ {
  autorizada: boolean;
  chaveAcesso?: string;
  protocolo?: string;
  xmlAutorizado?: string; // XML completo assinado + protocolo de autorização (ex: nfeProc)
  codigoRejeicao?: string;
  mensagemRejeicao?: string;
}
