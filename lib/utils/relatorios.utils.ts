export interface MargemProduto {
  codigoInterno: string | null;
  descricao: string;
  categoria: string | null;
  precoCustoBase: number;
  precoVendaBase: number;
  lucroUnitario: number;
  margem: number;
  markup: number;
  status: string;
}

/**
 * Calcula a diferença de dias calendário entre hoje e a validade.
 * Retorna positivo para datas no futuro, negativo para datas no passado, e 0 se for exatamente hoje.
 */
export function calcularDiasRestantes(validade: Date | string | null | undefined): number {
  if (!validade) return 0;
  const vDate = new Date(validade);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  vDate.setHours(0, 0, 0, 0);
  const diffTime = vDate.getTime() - hoje.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formata os dias de cobertura de estoque, convertendo 999 para "∞".
 */
export function formatarDiasCobertura(dias: number): string {
  return dias === 999 ? "∞" : String(dias);
}

/**
 * Calcula a média aritmética das margens de lucro dos produtos.
 */
export function calcularMargemMedia(produtos: { margem: number }[]): number {
  if (produtos.length === 0) return 0;
  const sum = produtos.reduce((s, p) => s + p.margem, 0);
  return Number((sum / produtos.length).toFixed(2));
}

/**
 * Filtra itens por status. Retorna o array completo se o status for "todos".
 */
export function filtrarPorStatus<T extends { status: string }>(items: T[], status: string): T[] {
  if (!status || status.toLowerCase() === "todos") return items;
  return items.filter((item) => item.status === status);
}

/**
 * Gera conteúdo no formato CSV para o relatório de margem.
 */
export function gerarCsvMargem(produtos: MargemProduto[]): string {
  let csv = "Codigo;Produto;Categoria;Custo;Preco Venda;Lucro Unitario;Margem (%);Markup (%);Status\n";
  produtos.forEach((p) => {
    csv += `${p.codigoInterno || ""};${p.descricao};${p.categoria || ""};${p.precoCustoBase};${p.precoVendaBase};${p.lucroUnitario};${p.margem};${p.markup};${p.status}\n`;
  });
  return csv;
}
