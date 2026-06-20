import { z } from "zod";

const optionalText = z.string().trim().nullable().optional();
const nullableBoolean = z.boolean().nullable().optional();
const percentual = z.coerce.number().min(0).max(100).optional().default(0);

export const naturezaOperacaoSchema = z.object({
  empresaFiscalId: z.coerce.number().int().positive(),
  codigo: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/),
  nome: z.string().trim().min(3).max(60),
  descricao: optionalText,
  tipoOperacao: z.enum(["SAIDA", "ENTRADA"]).optional().default("SAIDA"),
  finalidadeNFe: z.coerce.number().int().min(1).max(4).optional().default(1),
  ativa: z.boolean().optional().default(true),
  padrao: z.boolean().optional().default(false),
});

export const regraTributariaSchema = z.object({
  empresaFiscalId: z.coerce.number().int().positive(),
  naturezaOperacaoId: z.coerce.number().int().positive(),
  produtoId: z.coerce.number().int().positive().nullable().optional(),
  nome: z.string().trim().min(3).max(100),
  prioridade: z.coerce.number().int().min(0).max(10000).optional().default(100),
  ativa: z.boolean().optional().default(true),
  ncmPrefixo: z.string().trim().regex(/^\d{1,8}$/).nullable().optional(),
  ufDestino: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).nullable().optional(),
  contribuinteICMS: nullableBoolean,
  consumidorFinal: nullableBoolean,
  cfop: z.string().trim().regex(/^\d{4}$/),
  origemMercadoria: z.string().trim().regex(/^[0-8]$/).nullable().optional(),
  cstIcms: z.enum(["00", "10", "20", "40", "41", "50"]).nullable().optional(),
  csosn: z.enum(["102", "103", "300", "400"]).nullable().optional(),
  modalidadeBcIcms: z.string().trim().regex(/^[0-3]$/).optional().default("3"),
  aliquotaIcms: percentual,
  reducaoBaseIcms: percentual,
  aliquotaFcp: percentual,
  modalidadeBcSt: z.string().trim().regex(/^[0-6]$/).optional().default("4"),
  mvaSt: z.coerce.number().min(0).max(1000).optional().default(0),
  aliquotaIcmsSt: percentual,
  aliquotaFcpSt: percentual,
  aliquotaInterestadual: z.coerce.number().min(0).max(100).nullable().optional(),
  aliquotaInternaDestino: z.coerce.number().min(0).max(100).nullable().optional(),
  cstIpi: z.enum(["50", "51", "52", "53", "54", "55", "99"]).optional().default("53"),
  aliquotaIpi: percentual,
  codigoEnquadramentoIpi: z.string().trim().regex(/^\d{3}$/).optional().default("999"),
  cstPis: z.enum(["01", "02", "04", "05", "06", "07", "08", "09", "49", "99"]).optional().default("07"),
  aliquotaPis: percentual,
  cstCofins: z.enum(["01", "02", "04", "05", "06", "07", "08", "09", "49", "99"]).optional().default("07"),
  aliquotaCofins: percentual,
  informacoesComplementares: z.string().trim().max(2000).nullable().optional(),
  vigenciaInicio: z.coerce.date().nullable().optional(),
  vigenciaFim: z.coerce.date().nullable().optional(),
}).superRefine((data, ctx) => {
  if ((data.aliquotaInterestadual === null) !== (data.aliquotaInternaDestino === null)) {
    ctx.addIssue({ code: "custom", message: "DIFAL exige aliquota interestadual e interna de destino." });
  }
  if (data.cstIcms === "10" && data.aliquotaIcmsSt <= 0) {
    ctx.addIssue({ code: "custom", message: "CST 10 exige aliquota de ICMS-ST." });
  }
  if (data.vigenciaInicio && data.vigenciaFim && data.vigenciaFim < data.vigenciaInicio) {
    ctx.addIssue({ code: "custom", message: "Fim da vigencia deve ser posterior ao inicio." });
  }
});
