import { atualizarLotesVencidos } from "./lote-vencimento.job";

let jobExecutado = false;

export async function executarJobsDeInicializacao(): Promise<void> {
  if (jobExecutado) return;
  jobExecutado = true;
  await atualizarLotesVencidos();
}
