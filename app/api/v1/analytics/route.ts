import { NextResponse } from "next/server";
import { authenticateFirebaseRequest } from "@/lib/firebase-auth";
import { getAnalytics, isRange } from "@/lib/analytics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authentication = await authenticateFirebaseRequest(request);
  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.message },
      { status: authentication.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedRange = searchParams.get("range") ?? "7d";
  if (!isRange(requestedRange)) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  try {
    const { range, generatedAt, truncated, summary, daily, topSongs } =
      await getAnalytics(requestedRange);
    return NextResponse.json({ range, generatedAt, truncated, summary, daily, topSongs });
  } catch (error) {
    console.error("Falha ao consultar estatísticas do app no Firestore:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar as estatísticas no Firebase." },
      { status: 500 },
    );
  }
}
