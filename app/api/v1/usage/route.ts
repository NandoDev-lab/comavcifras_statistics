import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { EVENT_TYPES } from "@/lib/analytics";
import { authenticateFirebaseRequest } from "@/lib/firebase-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 200;

function isText(value: unknown, maxLength = MAX_TEXT_LENGTH): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export async function POST(request: Request) {
  const authentication = await authenticateFirebaseRequest(request);
  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.message },
      { status: authentication.status },
    );
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!EVENT_TYPES.includes(payload.type as (typeof EVENT_TYPES)[number])) {
    return NextResponse.json({ error: "Tipo de evento inválido." }, { status: 400 });
  }
  if (
    payload.songId !== undefined && !isText(payload.songId) ||
    payload.songTitle !== undefined && !isText(payload.songTitle) ||
    payload.artist !== undefined && !isText(payload.artist) ||
    payload.query !== undefined && !isText(payload.query)
  ) {
    return NextResponse.json({ error: "Um ou mais campos de texto são inválidos." }, { status: 400 });
  }
  if (payload.type === "chord_view" && (!isText(payload.songId) || !isText(payload.songTitle))) {
    return NextResponse.json(
      { error: "songId e songTitle são obrigatórios para visualizações." },
      { status: 400 },
    );
  }
  if (payload.type === "search" && !isText(payload.query)) {
    return NextResponse.json(
      { error: "query é obrigatório para eventos de busca." },
      { status: 400 },
    );
  }
  if (payload.type === "favorite_add" && (!isText(payload.songId) || !isText(payload.songTitle))) {
    return NextResponse.json(
      { error: "songId e songTitle são obrigatórios para favoritos." },
      { status: 400 },
    );
  }

  const event = {
    type: payload.type,
    userId: authentication.userId,
    createdAt: FieldValue.serverTimestamp(),
    ...(isText(payload.songId) && { songId: payload.songId.trim() }),
    ...(isText(payload.songTitle) && { songTitle: payload.songTitle.trim() }),
    ...(isText(payload.artist) && { artist: payload.artist.trim() }),
    ...(isText(payload.query) && { query: payload.query.trim() }),
  };

  try {
    const document = await getAdminFirestore().collection("usage_events").add(event);
    return NextResponse.json({ id: document.id, recorded: true }, { status: 201 });
  } catch (error) {
    console.error("Falha ao registrar evento de uso no Firestore:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar o evento no Firebase." },
      { status: 500 },
    );
  }
}
