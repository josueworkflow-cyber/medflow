import { NextResponse } from "next/server";
import { executarJobsDeInicializacao } from "@/lib/jobs/job-runner";

export async function GET() {
  try {
    await executarJobsDeInicializacao();
    return NextResponse.json({ status: "OK", message: "Health check passed. Initialization jobs executed." });
  } catch (error: any) {
    console.error("Erro no health check ao inicializar jobs:", error);
    return NextResponse.json({ status: "ERROR", error: error.message || "Erro de inicialização." }, { status: 500 });
  }
}
