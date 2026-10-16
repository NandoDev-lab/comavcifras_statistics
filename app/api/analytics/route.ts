import { NextResponse } from "next/server";
import { getAnalytics, isDashboardAuthorized, isRange } from "@/lib/analytics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.ANALYTICS_DASHBOARD_TOKEN) {
    return NextResponse.json(
      { error: "O painel não foi configurado. Defina ANALYTICS_DASHBOARD_TOKEN." },
      { status: 503 },
    );
  }

  if (!isDashboardAuthorized(request)) {
    return NextResponse.json({ error: "Token do painel inválido." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedRange = searchParams.get("range") ?? "7d";
  if (!isRange(requestedRange)) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getAnalytics(requestedRange));
  } catch (error) {
    console.error("Falha ao consultar estatísticas no Firestore:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar as estatísticas no Firebase." },
      { status: 500 },
    );
  }
}
