"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Separacao = {
  id: number; status: string; responsavel: string | null; createdAt: string;
  pedidoVenda: { numero: string; cliente: { razaoSocial: string } };
  itens: { produto: { descricao: string }; quantidade: number; conferido: boolean }[];
  romaneio: { motorista: string | null; veiculo: string | null; statusEntrega: string } | null;
};

const statusStyle: Record<string, string> = {
  PENDENTE: "bg-gray-100 text-gray-700", EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  CONFERIDO: "bg-green-100 text-green-700", ENVIADO: "bg-purple-100 text-purple-700",
};

export default function LogisticaPage() {
  const [separacoes, setSeparacoes] = useState<Separacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logistica").then((r) => r.json()).then((d) => setSeparacoes(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function atualizarStatus(id: number, status: string) {
    const body: Record<string, unknown> = { status };
    if (status === "ENVIADO") {
      const motorista = prompt("Nome do motorista:");
      const veiculo = prompt("Placa do veículo:");
      body.romaneio = { motorista, veiculo };
    }

    await fetch(`/api/logistica/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const r = await fetch("/api/logistica"); setSeparacoes(await r.json());
  }

  const pendentes = separacoes.filter((s) => s.status === "PENDENTE").length;
  const emAndamento = separacoes.filter((s) => s.status === "EM_ANDAMENTO").length;

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Operação</p><h1 className="text-3xl font-semibold">Logística e Expedição</h1>
        <p className="text-sm text-slate-400 mt-1">Separação → Conferência → Envio</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">📋 Pendentes</p><h3 className="text-2xl font-semibold mt-2">{pendentes}</h3></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">🔄 Em andamento</p><h3 className="text-2xl font-semibold mt-2 text-blue-600">{emAndamento}</h3></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">📦 Total separações</p><h3 className="text-2xl font-semibold mt-2">{separacoes.length}</h3></CardContent></Card>
      </div>

      {loading ? <p className="text-slate-500">Carregando...</p> : separacoes.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-slate-500">Nenhuma separação. Aprove um pedido de venda para iniciar.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {separacoes.map((s) => (
            <Card key={s.id}><CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">Pedido #{s.pedidoVenda.numero.slice(0, 8)}</h3>
                  <p className="text-sm text-slate-500">{s.pedidoVenda.cliente.razaoSocial}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[s.status]}`}>{s.status}</span>
                  {s.status === "PENDENTE" && <button onClick={() => atualizarStatus(s.id, "EM_ANDAMENTO")} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg">Iniciar</button>}
                  {s.status === "EM_ANDAMENTO" && <button onClick={() => atualizarStatus(s.id, "CONFERIDO")} className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg">Conferir</button>}
                  {s.status === "CONFERIDO" && <button onClick={() => atualizarStatus(s.id, "ENVIADO")} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg">Enviar</button>}
                </div>
              </div>
              <table className="w-full text-sm"><thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-1">Produto</th><th>Qtd</th><th>Conferido</th></tr></thead>
                <tbody>{s.itens.map((item, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-1">{item.produto.descricao}</td><td>{item.quantidade}</td><td>{item.conferido ? "✅" : "⬜"}</td></tr>))}</tbody>
              </table>
              {s.romaneio && <div className="mt-3 text-xs text-slate-500">🚚 Motorista: {s.romaneio.motorista} | Veículo: {s.romaneio.veiculo} | Status: {s.romaneio.statusEntrega}</div>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </main>
  );
}
