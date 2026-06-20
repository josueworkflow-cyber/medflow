"use client";

import { useState } from "react";
import { XCircle, Loader2, AlertTriangle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CancelarNFeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoFiscal: {
    id: number;
    numero: string;
    chaveAcesso: string | null;
  } | null;
  onSuccess: () => void;
}

export default function CancelarNFeModal({
  open,
  onOpenChange,
  documentoFiscal,
  onSuccess,
}: CancelarNFeModalProps) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!documentoFiscal) return null;

  const handleConfirm = async () => {
    if (motivo.length < 15) {
      toast.error("O motivo deve ter no mínimo 15 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/fiscal/nfe/${documentoFiscal.id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw { status: res.status, message: data.error };
      }

      toast.success("NF-e cancelada com sucesso!");
      setMotivo("");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao cancelar NF-e:", err);
      
      // Tratamento diferenciado para erros HTTP 503 (Indisponibilidade da SEFAZ)
      if (err.status === 503 || err.message?.includes("Serviço SEFAZ indisponível")) {
        toast.error("Erro de conexão: O serviço da SEFAZ está temporariamente instável. Por favor, tente novamente em alguns instantes.");
      } else {
        toast.error(err.message || "Falha ao solicitar o cancelamento da NF-e.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[500px] p-6 bg-white rounded-lg">
        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          Cancelar NF-e Nº {documentoFiscal.numero}
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          Esta operação enviará uma solicitação de cancelamento para a SEFAZ.
        </DialogDescription>

        <div className="space-y-4 py-3">
          {/* Alerta de Irreversibilidade */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-800">Ação Irreversível</p>
              <p className="text-[11px] text-red-700 mt-0.5">
                Esta ação é irreversível. A NF-e será cancelada junto à SEFAZ e não poderá ser reativada ou reutilizada.
              </p>
            </div>
          </div>

          {/* Chave de Acesso para Confirmação */}
          {documentoFiscal.chaveAcesso && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Key className="h-3 w-3" /> Chave de Acesso NF-e
              </span>
              <p className="text-xs font-mono font-bold text-slate-700 break-all select-all">
                {documentoFiscal.chaveAcesso}
              </p>
            </div>
          )}

          {/* Campo de Motivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Motivo do Cancelamento <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Descreva o motivo do cancelamento (mínimo de 15 caracteres)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.substring(0, 255))}
              rows={4}
              maxLength={255}
              disabled={loading}
              className="text-xs resize-none bg-white border-slate-200 focus:border-red-500 focus:ring-red-500"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>Mínimo 15 caracteres</span>
              <span className={motivo.length < 15 ? "text-amber-600 font-semibold" : "text-slate-500"}>
                {motivo.length}/255 caracteres
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé e Ações */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMotivo("");
              onOpenChange(false);
            }}
            disabled={loading}
            className="text-xs text-slate-500 hover:bg-slate-100"
          >
            Voltar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading || motivo.length < 15}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-5 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Cancelando...
              </>
            ) : (
              "Confirmar cancelamento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
