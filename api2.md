# KanzaTV API — Fontes de Vídeo (api2)

Documentação do módulo de **fontes de reprodução (video sources)** — expansão do
backend para suportar múltiplos servidores de vídeo por título/episódio, separando
**Dublado (PT)** de **Legendado**.

> Base URL: `https://kanza-tv.onrender.com/api` (produção) · `http://localhost:3001/api` (local)
> Complementa `api.md` — os restantes endpoints (TMDB, IPTV, histórico) mantêm-se inalterados.

---

## 1. Modelo de dados

Nova tabela `video_sources` (criada automaticamente no arranque do servidor — bootstrap SQL idempotente):

| Coluna           | Tipo                        | Descrição                                                        |
| ---------------- | --------------------------- | ---------------------------------------------------------------- |
| `id`             | `serial` (PK)               | Identificador da fonte                                           |
| `media_id`       | `int` (FK → `medias.id`)    | ID oficial TMDB/AniList (Kitsu) do título                        |
| `season_number`  | `int?`                      | Temporada (`NULL` = fonte do título inteiro, ex: Filme)          |
| `episode_number` | `int?`                      | Episódio (`NULL` = fonte do título inteiro)                      |
| `server`         | `varchar(100)`              | Nome do servidor ("VidSrc", "Servidor 1", "Embed Dublado", ...)   |
| `language`       | `DUB` \| `SUB` \| `AUTO`    | Idioma da faixa — DUB = Dublado (PT), SUB = Legendado            |
| `quality`        | `varchar(30)`               | "1080p", "720p", "HD", "SD", ... (default `AUTO`)                |
| `url`            | `text`                      | URL do embed/iframe para o player                                |
| `priority`       | `int` (default 0)           | Ordem de apresentação — menor aparece primeiro                    |
| `created_at`     | `timestamptz`               | Data de criação                                                  |

**Chave de upsert:** `(media_id, season_number, episode_number, server, language)`.
Idiomas diferentes coexistem no mesmo servidor (Embed Dublado + Embed Legendado).

---

## 2. Endpoints públicos (só de leitura)

A resposta devolve fontes registadas por administradores (`"source": "custom"`).
Se não houver nenhuma, devolve automaticamente o embed gerado pelo TMDB ID
(`"source": "vidsrc"`, servidor "VidSrc", qualidade "HD").

### Item partilhado por todas as respostas

```jsonc
{
  "id": 3,                      // NULL se for fonte gerada automaticamente (VidSrc)
  "server": "Servidor 1",
  "language": "DUB",            // "DUB" | "SUB" | "AUTO"
  "languageLabel": "Dublado (PT)", // "Legendado" | "Automático"
  "quality": "1080p",
  "url": "https://embed.example.com/dub/97536",
  "priority": 1
}
```

### 2.1. Fontes de um Filme

```
GET /movies/:id/sources
```

- `:id` — ID TMDB do filme.
- Exemplo: `GET /movies/97536/sources`

```json
{
  "mediaId": 97536,
  "source": "custom",
  "sources": [
    { "id": 3, "server": "Servidor 1", "language": "DUB", "languageLabel": "Dublado (PT)", "quality": "1080p", "url": "https://embed.example.com/dub/97536", "priority": 1 },
    { "id": 4, "server": "Servidor 1", "language": "SUB", "languageLabel": "Legendado",   "quality": "720p",  "url": "https://embed.example.com/sub/97536", "priority": 2 }
  ]
}
```

### 2.2. Fontes de um Episódio de Série

```
GET /series/:id/episodes/:season/:episode/sources
```

- `:id` — ID TMDB da série; `:season` e `:episode` — números da temporada/episódio.
- Exemplo: `GET /series/154164/episodes/1/1/sources`

### 2.3. Fontes de um Anime (título)

```
GET /animes/:id/sources
```

### 2.4. Fontes de um Episódio de Anime

```
GET /animes/:id/episodes/:season/:episode/sources
```

- Exemplo: `GET /animes/20/episodes/1/2/sources`

### 2.5. Temporadas reais (anti-loop de 404)

Para descobrir quantas temporadas existem, usa-se **um único pedido**:
`GET /tv/{id}` da TMDB (campo `seasons` do detalhe). **Nunca adivinhe temporadas no
frontend** (ex: iterar `season/1..30` até dar 404) — isso gerava dezenas de
pedidos HTTP falhados atrasando todo o processamento.

### 2.6. Temporadas de uma Série

```
GET /series/:id/seasons
```

```json
{
  "tmdbId": 1396,
  "seasons": [
    { "seasonNumber": 0, "name": "Specials", "episodeCount": 9, "airDate": "2009-02-17" },
    { "seasonNumber": 1, "name": "Season 1", "episodeCount": 7, "airDate": "2008-01-20" }
  ]
}
```

Fluxo recomendado: `GET /series/:id/seasons` → escolher `seasonNumber` →
`GET /series/:id/episodes/:season/:episode/sources`.

### 2.7. Temporadas de um Anime

```
GET /animes/:id/seasons
```

Mesmo formato (animes usam o array `seasons` da TMDB em `/tv/{id}`), exemplo real:

```json
{
  "tmdbId": 1429,
  "seasons": [
    { "seasonNumber": 0, "name": "Specials", "episodeCount": 37, "airDate": "2013-07-07" },
    { "seasonNumber": 1, "name": "Season 1", "episodeCount": 25, "airDate": "2013-04-07" },
    { "seasonNumber": 4, "name": "The Final Season", "episodeCount": 28, "airDate": "2020-12-07" }
  ]
}
```

> `seasonNumber: 0` = "Specials" (episódios especiais) — trata como temporada especial.

### 2.8. Resposta de fallback (sem fontes registadas)

```json
{
  "mediaId": 154164,
  "season": 1,
  "episode": 1,
  "source": "vidsrc",
  "sources": [
    { "id": null, "server": "VidSrc", "language": "AUTO", "languageLabel": "Automático",
      "quality": "HD", "url": "https://vidsrc.icu/embed?tmdb=154164&season=1&episode=1", "priority": 0 }
  ]
}
```

> O base URL do fallback vem da env `VIDSRC_BASE_URL` (default `https://vidsrc.icu/embed`).
> Formato: filme `?tmdb={id}` · episódio `?tmdb={id}&season={s}&episode={e}`.

---

## 3. Gestão de fontes (admin)

Integração segura por chave — header `x-sync-key` igual ao `ADMIN_SYNC_KEY`
(mesmo mecanismo do `POST /iptv/sync`). Sem fonte válida → `401 Unauthorized`.

### 3.1. Registar / atualizar fontes

```
POST /sources
Content-Type: application/json
x-sync-key: <ADMIN_SYNC_KEY>
```

Corpo aceita um **array** de fontes (registar vários servidores de uma vez).
Cada item substitui a fonte existente com a mesma combinação
`mediaId + seasonNumber + episodeNumber + server + language`.

```json
{
  "sources": [
    {
      "mediaId": 97536,
      "mediaType": "MOVIE",          // "MOVIE" | "SERIES" | "ANIME" | "SOAP_OPERA"
      "server": "Servidor 1",
      "language": "DUB",             // "DUB" | "SUB" | "AUTO"
      "quality": "1080p",
      "url": "https://embed.example.com/dub/97536",
      "priority": 1
    },
    {
      "mediaId": 97536,
      "mediaType": "MOVIE",
      "server": "Servidor 1",
      "language": "SUB",
      "quality": "720p",
      "url": "https://embed.example.com/sub/97536",
      "priority": 2
    },
    {
      "mediaId": 20,
      "mediaType": "ANIME",
      "seasonNumber": 1,
      "episodeNumber": 2,
      "server": "Servidor 2",
      "language": "DUB",
      "url": "https://embed.example.com/anime/20/1/2/dub"
    }
  ]
}
```

Resposta:

```json
{ "upserted": 3 }
```

**Regras de validação:**

- `mediaId` — inteiro obrigatório.
- `mediaType` — obrigatório, usado para enriquecer o título da `media` (procura na **TMDB** por tipo
  `MOVIE` → `/movie/:id`; qualquer outro tipo → `/tv/:id`). Se a TMDB falhar, o título fica `#<id>` e a
  fonte continua a funcionar.
- `seasonNumber`/`episodeNumber` — opcionais; se ambos ausentes a fonte aplica-se ao título inteiro.
- `url` — URL obrigatório.
- `language` — obrigatório; `quality` e `priority` opcionais.
- Rate limit: 10 pedidos/minuto por IP.

### 3.2. Remover uma fonte

```
DELETE /sources/:id
x-sync-key: <ADMIN_SYNC_KEY>
```

- `:id` = `video_sources.id` devolvido nos endpoints de leitura.
- Resposta: `{ "removed": 1 }` · `404` se não existir.

---

## 4. Exemplos rápidos (cURL)

```bash
# Fontes de um filme
curl https://kanza-tv.onrender.com/api/movies/97536/sources

# Fontes de um episódio de anime (dublado/legendado separados)
curl https://kanza-tv.onrender.com/api/animes/20/episodes/1/2/sources

# Registar Embed Dublado + Embed Legendado no mesmo servidor
curl -X POST https://kanza-tv.onrender.com/api/sources \
  -H "Content-Type: application/json" \
  -H "x-sync-key: $ADMIN_SYNC_KEY" \
  -d '{"sources":[
        {"mediaId":97536,"mediaType":"MOVIE","server":"Servidor 1","language":"DUB","quality":"1080p","url":"https://embed.example.com/dub/97536","priority":1},
        {"mediaId":97536,"mediaType":"MOVIE","server":"Servidor 1","language":"SUB","quality":"720p","url":"https://embed.example.com/sub/97536","priority":2}]}'

# Remover fonte
curl -X DELETE https://kanza-tv.onrender.com/api/sources/5 -H "x-sync-key: $ADMIN_SYNC_KEY"
```

---

## 5. Notas de integração (frontend)

1. **Sempre `GET .../sources` antes de reproduzir** — o player deve consumir a lista em vez
   de construir o URL VidSrc manualmente.
2. Usar `language`/`languageLabel` para os separadores "Dublado"/"Legendado" e o campo
   `server` + `quality` para a lista de servidores.
3. `source: "vidsrc"` indica fonte gerada automaticamente (id `null`) — não pode ser removida
   via `DELETE /sources/:id` (só fontes `custom` têm `id` real).
4. Novelas divergem dos animes por tipo de conteúdo — usa o mesmo formato do anime,
   registando com `mediaType: "SOAP_OPERA"` e consumindo entidades de séries.

*Versão desta doc: v1 — expandir também `api.md` quando o frontend integrar.*
