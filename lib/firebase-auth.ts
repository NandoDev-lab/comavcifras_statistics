import "server-only";
import { getAdminAuth } from "@/lib/firebase-admin";

export type FirebaseAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 503; message: string };

export async function authenticateFirebaseRequest(
  request: Request,
): Promise<FirebaseAuthResult> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Token de autenticação obrigatório." };
  }

  let auth: ReturnType<typeof getAdminAuth>;
  try {
    auth = getAdminAuth();
  } catch (error) {
    console.error("Firebase Admin não está configurado para autenticação:", error);
    return {
      ok: false,
      status: 503,
      message: "A autenticação do Firebase não está configurada no servidor.",
    };
  }

  try {
    const decodedToken = await auth.verifyIdToken(authorization.slice(7));
    return { ok: true, userId: decodedToken.uid };
  } catch {
    return { ok: false, status: 401, message: "Token de autenticação inválido." };
  }
}
