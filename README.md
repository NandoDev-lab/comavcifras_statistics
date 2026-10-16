# Comav Cifras · Estatísticas

Painel em Next.js para consultar eventos de uso armazenados no Cloud Firestore. O mesmo projeto fornece uma API autenticada para o app registrar visualizações de cifras, buscas e favoritos.

## Requisitos

- Node.js 20.9 ou superior
- Projeto Firebase com Cloud Firestore e Firebase Authentication
- Conta de serviço com permissão para gravar/ler eventos e verificar tokens do Firebase Authentication

## Configuração

Crie `.env.local` na raiz:

```env
FIREBASE_PROJECT_ID=seu-id-do-projeto
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account", "...":"..."}
ANALYTICS_DASHBOARD_TOKEN=um-token-longo-e-aleatorio
```

Use o JSON da conta de serviço fornecida pelo Firebase como uma única linha e mantenha `.env.local` fora do controle de versão. Em ambientes Google Cloud, Application Default Credentials podem substituir `FIREBASE_SERVICE_ACCOUNT_JSON`; defina `GOOGLE_APPLICATION_CREDENTIALS` (ou use o ambiente Cloud Run) e `FIREBASE_PROJECT_ID`/`GOOGLE_CLOUD_PROJECT`.

Instale as dependências e inicie:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` e informe o valor de `ANALYTICS_DASHBOARD_TOKEN`. O token fica na sessão atual do navegador e protege a rota de consulta do painel.

## Modelo de eventos no Firestore

Os eventos são gravados na coleção `usage_events`. O servidor define `userId` pelo token verificado do Firebase Authentication e define `createdAt` com o horário do servidor. O app não pode definir esses dois campos:

| Evento | Campos enviados pelo app |
| --- | --- |
| `chord_view` | `songId`, `songTitle`, `artist` (opcional) |
| `search` | `query` |
| `favorite_add` | `songId`, `songTitle`, `artist` (opcional) |

Para cada registro, envie o Firebase ID token do usuário autenticado:

```http
POST /api/v1/usage
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

Exemplo de corpo:

```json
{
  "type": "chord_view",
  "songId": "cifra-123",
  "songTitle": "Nome da cifra",
  "artist": "Nome do artista"
}
```

Uma gravação aceita retorna `201` com `{ "id": "...", "recorded": true }`. O app pode registrar os demais tipos usando o mesmo endpoint e formato de evento acima. Tokens ausentes/inválidos, tipos não reconhecidos e campos inválidos retornam erros HTTP explícitos.

## Consultar estatísticas no app

```http
GET /api/v1/analytics?range=7d
Authorization: Bearer <firebase-id-token>
```

`range` aceita `7d`, `30d` ou `90d`. O app pode obter um Firebase ID token após autenticar o usuário e enviá-lo no cabeçalho. A resposta contém totais, séries diárias, até cinco cifras mais vistas e a indicação `truncated` caso o limite de 20 mil eventos por consulta seja atingido; não inclui buscas ou atividades recentes de usuários.

O endpoint `/api/analytics?range=7d` é exclusivo do painel web e exige `ANALYTICS_DASHBOARD_TOKEN`. Não distribua esse segredo no app cliente.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servidor de produção
- `npm run typecheck` — verificação TypeScript
