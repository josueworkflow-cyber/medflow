import { getProdutos } from "@/lib/services/produtos.service";
import { getCategorias } from "@/lib/services/categorias.service";
import { ProdutosClient } from "./components/ProdutosClient";

export default async function ProdutosPage() {
  const produtos = await getProdutos({ ativo: true });
  const categorias = await getCategorias();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Produtos</h1>
          <p className="text-muted-foreground">Gerenciamento completo de itens, preços e regras sanitárias.</p>
        </div>
      </div>

      <ProdutosClient initialData={produtos} categorias={categorias} />
    </div>
  );
}