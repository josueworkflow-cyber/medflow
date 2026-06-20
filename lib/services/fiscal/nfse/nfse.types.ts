export interface NFSePayload {
  data_emissao: string;
  data_competencia: string;
  codigo_municipio_emissora: number;
  cnpj_prestador: string;
  inscricao_municipal_prestador?: string;
  codigo_opcao_simples_nacional: number;
  regime_especial_tributacao: number;
  
  // Tomador (Cliente)
  cnpj_tomador?: string;
  cpf_tomador?: string;
  razao_social_tomador: string;
  codigo_municipio_tomador: number;
  cep_tomador: string;
  logradouro_tomador: string;
  numero_tomador: string;
  complemento_tomador?: string;
  bairro_tomador: string;
  telefone_tomador?: string;
  email_tomador?: string;
  
  // Serviço
  codigo_municipio_prestacao: number;
  codigo_tributacao_nacional_iss: string;
  codigo_nbs: string;
  descricao_servico: string;
  valor_servico: number;
  
  // Tributos
  tributacao_iss: number;
  tipo_retencao_iss: number;
  valor_iss?: number;
  
  // Totais de tributos federais (obrigatório pelo modelo nacional)
  percentual_total_tributos_federais: string;
  percentual_total_tributos_estaduais: string;
  percentual_total_tributos_municipais: string;
  situacao_tributaria_pis_cofins: string;
}

export interface RetornoNFSe {
  autorizada: boolean;
  chaveAcesso?: string;
  xmlAutorizado?: string; // Will store the JSON response body of the authorized DPS
  codigoRejeicao?: string;
  mensagemRejeicao?: string;
}
