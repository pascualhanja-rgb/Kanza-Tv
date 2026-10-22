# StreamHub API — Autenticação (documento para o front-end)

Base URL (dev): `http://localhost:3000/api`
Swagger interativo (dev): `http://localhost:3000/docs` (tag **Auth**)

A autenticação usa **JWT com Bearer token**. Fluxo resumido:

1. Usuário cria conta → `POST /api/auth/register`
2. Ou entra → `POST /api/auth/login`
3. Nas rotas protegidas, envia `Authorization: Bearer <accessToken>`
4. Para saber quem está logado → `GET /api/auth/me`

---

## 1. `POST /api/auth/register`

Cria a conta e **já devolve o token** (não precisa logar de novo).

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "P@sswordSegura123"
}
```

**Validações (erros 400):**
- `email`: e-mail válido (máx. 255)
- `password`: mínimo **8 caracteres** e precisa ter **pelo menos uma letra e um número**
```json
{ "message": "Password deve ter pelo menos uma letra e um número", "error": "Bad Request", "statusCode": 400 }
```

**Resposta `201`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Erro `409`:** e-mail já cadastrado —
```json
{ "message": "E-mail já registado.", "error": "Conflict", "statusCode": 409 }
```

---

## 2. `POST /api/auth/login`

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "P@sswordSegura123"
}
```

**Resposta `200`:** mesmas chaves do register:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Erro `401` (credenciais erradas):**
```json
{ "message": "Credenciais inválidas.", "error": "Unauthorized", "statusCode": 401 }
```
A mensagem é genérica de propósito (não revela se o e-mail existe), para segurança.

---

## 3. `GET /api/auth/me` 🔒

Retorna o usuário logado. **Requer** header:
```
Authorization: Bearer <accessToken>
```

**Resposta `200`:**
```json
{ "id": 1, "email": "user@example.com", "createdAt": "2026-10-21T16:00:00.000Z" }
```

**Erro `401`:**
```json
{ "message": "Unauthorized", "statusCode": 401 }
```
→ o token está ausente, expirado ou inválido. **Trate como "sessão expirada": limpe o token salvo e mande o usuário para a tela de login.**

---

## 4. Regras de uso do token (Flutter)

| Regra | Detalhe |
|---|---|
| Onde guardar | Persistir o `accessToken` (ex.: `flutter_secure_storage`) |
| Header | `Authorization: Bearer <accessToken>` (espaço após `Bearer`) |
| Validade | **7 dias** (`JWT_EXPIRES_IN` do backend) |
| Expirado (401) | Não há refresh token; refazer login |
| Quais rotas exigem | `/api/watch-history` (posts/get/delete) e `/api/auth/me`. Resto do catálogo é público |

**Exemplo de interceptor simples (Dart):**
```dart
Future<http.Response> authedRequest(String path) {
  final apiKey = storage.read('accessToken'); // de flutter_secure_storage
  return http.get(
    Uri.parse('$baseUrl/api$path'),
    headers: {
      'Authorization': 'Bearer $apiKey',
      'Content-Type': 'application/json',
    },
  );
}
```

---

## 5. Rate limit nas rotas de auth

`register` e `login` aceitam **5 tentativas por minuto por IP** (proteção contra brute-force). Ao estourar o backend responde `429`:
```json
{ "message": "ThrottlerException: Too Many Requests", "statusCode": 429 }
```
No front: mostrar "Muitas tentativas. Aguarde um minuto." e desabilitar o botão até o próximo minuto.

O limite global também vale (**120 req/min/IP**) — evite fazer polling agressivo no app.
