"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciais inválidas. Tente novamente.");
      } else {
        router.push("/sistema");
      }
    } catch (err) {
      setError("Ocorreu um erro ao tentar fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-[400px] border-none shadow-2xl">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-lg">
              MF
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MedFlow ERP</h1>
            <p className="text-sm text-slate-500">Gestão Hospitalar Inteligente</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 uppercase">
                Email Corporativo
              </label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 uppercase">
                Senha de Acesso
              </label>
              <input
                type="password"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-50"
            >
              {loading ? "Autenticando..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400">
            &copy; 2026 MedFlow Systems. Todos os direitos reservados.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
