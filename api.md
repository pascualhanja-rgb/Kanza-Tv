# StreamHub API — Documentação para o Front-end

Base URL (dev): `http://localhost:3000/api`
Swagger interativo (dev): `http://localhost:3000/docs`

Todas as rotas abaixo seguem o padrão JSON. Rotas que exigem login pedem o header `Authorization: Bearer <accessToken>` — o token é obtido em `/auth/login` ou `/auth/register` (ver **auth.md**).

---

## Convenções globais

### Formato de sucesso
As rotas de listagem devolvem sempre:
```json
{ "page": 1, "totalPages": 30, "items": [ ... ] }
```

### Formato de erro
```json
{ "message": "Mensagem legível em português", "error": "Not Found", "statusCode": 404 }
```
O front deve usar `statusCode` e `message`.

### Rate limit (429)
Limite global de **120 requisições/minuto por IP**. Rotas sensíveis têm limites menores (indicado em cada seção). Ao estourar, o backend responde `429 Too Many Requests` — mostrar um aviso e aguardar alguns segundos antes de tentar de novo.

---

## 1. Saúde do servidor 

### `GET /health`
Retorna `200` sempre que o backend está de pé.
```json
{ "status": "ok", "database": "up", "timestamp": "2026-10-21T18:44:32.548Z" }
```
*Obs: esta rota é a única fora do prefixo `/api` (é `/health`, não `/api/health`).*

---

## 2. Filmes (TMDB)

### `GET /api/movies/trending?page=1`
Filmes em alta na semana.
```json
{
  "page": 1,
  "totalPages": 10,
  "items": [
    {
      "tmdbId": 550,
      "title": "Avatar",
      "type": "MOVIE",
      "posterUrl": "https://image.tmdb.org/t/p/w500/abc.jpg",
      "backdropUrl": "https://image.tmdb.org/t/p/w780/abc.jpg",
      "overview": "Sinopse...",
      "releaseYear": 2009
    }
  ]
}
```

### `GET /api/movies/popular?page=1&genre=28&year=2024`
Populares. Filtros opcionais: `genre` = ID de gênero TMDB, `year` = ano de lançamento.
Resposta: igual à trending (mesmmas chaves).

### `GET /api/movies/search?q=avatar&page=1`
Busca por nome. Resposta: igual à trending.

### `GET /api/movies/:id`
Detalhe do filme. Erro `404` com `message: "Filme não encontrado."`.
```json
{
  "tmdbId": 550,
  "title": "Avatar",
  "type": "MOVIE",
  "posterUrl": "https://image.tmdb.org/t/p/w500/abc.jpg",
  "backdropUrl": "https://image.tmdb.org/t/p/w780/abc.jpg",
  "overview": "Sinopse...",
  "releaseYear": 2009,
  "runtime": 162,
  "genres": ["Ação", "Ficção científica"],
  "voteAverage": 7.6
}
```

---

## 3. Séries (TMDB)

### `GET /api/series/trending?page=1`
Igual a filmes, mas `type: "SERIES"`.

### `GET /api/series/popular?page=1&genre=18&year=2024`
Igual a movies/popular.

### `GET /api/series/search?q=breaking&page=1`
Igual a movies/search.

### `GET /api/series/:id`
Igual a movies/:id, com `type: "SERIES"`.

### `GET /api/series/:id/episodes/:season`
Lista de episódios de uma temporada (ex.: `/series/1399/episodes/1`). Devolve array puro:
```json
[
  {
    "seasonNumber": 1,
    "episodeNumber": 1,
    "name": "Snow",
    "overview": "Sinopse do episódio...",
    "stillPath": "https://image.tmdb.org/t/p/w300/abc.jpg",
    "airDate": "2011-04-17"
  }
]
```

---

## 4. Novelas (TMDB, idioma original PT)

### `GET /api/soap-operas/popular?page=1`
Mesmas chaves de filme/série, com `type: "SOAP_OPERA"`.

### `GET /api/soap-operas/search?q=globoplay&page=1`
Mesmas chaves de search.

### `GET /api/soap-operas/:id`
Detalhe. Erro `404` com `message: "Novela não encontrada."`.

---

## 5. Animes (Kitsu.io)

Catálogo alimentado pela API Kitsu. Os itens trazem tanto `kitsuId` quanto `malId` — **para reproduzir, use sempre `kitsuId`** na rota de streaming.

### `GET /api/animes/top?page=1`
Animes mais populares.
```json
{
  "page": 1,
  "totalPages": 992,
  "items": [
    {
      "kitsuId": "7442",
      "malId": 16498,
      "title": "Attack on Titan",
      "posterUrl": "https://media.kitsu.app/anime/poster_images/7442/large.jpg",
      "overview": "Sinopse...",
      "releaseYear": 2013,
      "episodesCount": 25,
      "score": 8.5,
      "genres": ["Ação", "Drama"]
    }
  ]
}
```
*`malId` pode vir `null` nas listas (é garantido apenas em `/animes/:id` e na rota de stream).*

### `GET /api/animes/season-now?page=1`
Animes da temporada atual. Mesmo formato.

### `GET /api/animes/search?q=naruto&page=1`
Busca por nome. Mesmo formato.

### `GET /api/animes/:id`
Detalhe por `kitsuId`, com gêneros e `malId` preenchidos. Erro `404`: `"Anime não encontrado."`.

### `GET /api/animes/:id/episodes?page=1`
Episódios (thumbnails/datas podem ser `null`):
```json
{
  "page": 1,
  "items": [
    { "episodeNumber": 1, "title": "Enter: Naruto Uzumaki!", "airDate": "2002-10-03" }
  ]
}
```

### ⭐ `GET /api/animes/stream/kitsu/:kitsuId?ep=:episode`
**Rota para reproduzir**. Recebe o `kitsuId` do item e o número do episódio, mapeia internamente para o MyAnimeList e devolve a URL do player (embed VidSrc) para abrir na WebView.
```json
{
  "status": "success",
  "data": {
    "kitsuId": "11",
    "malId": 20,
    "episode": 1,
    "embedUrl": "https://vidsrc.icu/embed/anime/20/1"
  }
}
```
Carregue `embedUrl` direto na WebView.

Erros (`404`, mostrar `message` num alerta):
```json
{ "message": "Episódio não disponível para exibição.", "error": "Not Found", "statusCode": 404 }
{ "message": "Anime não encontrado no Kitsu.", "error": "Not Found", "statusCode": 404 }
{ "message": "Mapeamento para MyAnimeList indisponível para este anime.", "error": "Not Found", "statusCode": 404 }
```
Parâmetro inválido (`ep` não-numérico) → `400`:
```json
{ "message": "O parâmetro ep deve ser um número inteiro válido.", "error": "Bad Request", "statusCode": 400 }
```

---

## 6. Canais de TV ao vivo (IPTV)

### `GET /api/iptv/channels?page=1&limit=50&category=Notícias&country=PT&name=RTP`
Filtros opcionais. `limit` máximo 100. Resposta:
```json
{
  "page": 1,
  "limit": 50,
  "total": 1234,
  "totalPages": 25,
  "items": [
    {
      "id": 42,
      "name": "RTP 1",
      "logoUrl": "https://.../rtp1.png",
      "category": "Notícias",
      "country": "PT",
      "streamUrl": "https://.../rtp1/index.m3u8"
    }
  ]
}
```
Para reproduzir use `streamUrl` (stream HLS — no Flutter use `video_player`/`better_player`, que suportam HLS).

### `GET /api/iptv/categories`
```json
[ { "category": "Kids", "count": 210 } ]
```

### `GET /api/iptv/countries`
```json
[ { "country": "PT", "count": 55 } ]
```

*`POST /api/iptv/sync` é rota interna (pede header `x-sync-key`) — o front nunca chama.*

---

## 7. Histórico / "Continuar a Assistir" 🔒 (JWT)

Todas as rotas precisam de `Authorization: Bearer <accessToken>` (ver auth.md).

### `POST /api/watch-history`
Salva/atualiza o progresso do usuário. Chame periodicamente durante a reprodução (ex.: a cada 30 s) e ao pausar/sair.
```json
{
  "mediaId": 550,
  "mediaType": "MOVIE",
  "title": "Avatar",
  "posterUrl": "https://image.tmdb.org/t/p/w500/abc.jpg",
  "progress": 2400,
  "streamUrl": "https://stream.example.com/ep1.m3u8"
}
```
| Campo | Obrigatório | Observação |
|---|---|---|
| `mediaId` | sim | int — use o `tmdbId` (filmes/séries/novelas) ou o `kitsuId` **convertido para int** (animes) |
| `mediaType` | sim | `MOVIE`, `SERIES`, `ANIME` ou `SOAP_OPERA` |
| `title` | sim | string até 255 |
| `posterUrl` | não | string até 2048 |
| `progress` | sim | int ≥ 0 (segundos) |
| `streamUrl` | não | útil para retomar direto |

Resposta:
```json
{ "ok": true, "mediaId": 550, "progress": 2400 }
```

### `GET /api/watch-history?limit=20`
"Continuar assistindo" — mais recentes primeiro (`limit` máx. 50):
```json
{
  "items": [
    {
      "mediaId": 550,
      "type": "MOVIE",
      "title": "Avatar",
      "posterUrl": "https://.../abc.jpg",
      "streamUrl": "https://.../ep1.m3u8",
      "progress": 2400,
      "updatedAt": "2026-10-21T18:00:00.000Z"
    }
  ]
}
```

### `DELETE /api/watch-history/:mediaId`
Remove o item do histórico.
```json
{ "removed": 1 }
```
(`removed: 0` significa que não existia — trate como sucesso para a UI.)

---

## Erros comuns

| HTTP | Quando |
|---|---|
| 400 | Parâmetro inválido/sem validação (nota: campos extras no body de POST são rejeitados) |
| 401 | Token JWT ausente/expirado nos endpoints 🔒 → redirecionar para tela de login |
| 404 | Recurso não encontrado (usar `message` na UI) |
| 429 | Rate limit atingido — aguardar e tentar novamente |
