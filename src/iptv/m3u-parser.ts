/**
 * Parser M3U / M3U8 puro (sem dependências externas).
 * Suporta linhas no formato:
 *   #EXTINF:-1 tvg-id="xxtv.pt" tvg-logo="http://..." tvg-country="PT" group-title="Notícias",Nome do Canal
 *   https://servidor/stream.m3u8
 * O país é extraído de tvg-country; se ausente, tenta o 2º segmento do tvg-id.
 */
export interface M3uEntry {
  name: string;
  logoUrl: string | null;
  category: string | null;
  country: string | null;
  streamUrl: string;
}

const ATTR_RE = /([A-Za-z0-9_-]+)="([^"]*)"/g;

export function parseM3U(content: string): M3uEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: M3uEntry[] = [];
  let current: Partial<M3uEntry> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      current = {};

      // nome = texto após a última vírgula que fecha os atributos
      const commaIdx = line.lastIndexOf(',');
      const attrPart = commaIdx >= 0 ? line.slice(0, commaIdx) : line;
      const namePart = commaIdx >= 0 ? line.slice(commaIdx + 1) : '';

      let match: RegExpExecArray | null;
      ATTR_RE.lastIndex = 0;
      while ((match = ATTR_RE.exec(attrPart)) !== null) {
        const key = match[1].toLowerCase();
        const value = match[2].trim();
        switch (key) {
          case 'tvg-logo':
            current.logoUrl = value || null;
            break;
          case 'group-title':
            current.category = value || null;
            break;
          case 'tvg-country':
            current.country = finalizeCountry(value);
            break;
          case 'tvg-id': {
            if (!current.country) {
              // formato real do iptv-org: "00sReplay.us@SD" → país = "us"
              // (segmento antes do '@', última parte após o ponto)
              const beforeAt = value.split('@')[0];
              const cc = beforeAt.split('.').pop() ?? '';
              current.country = finalizeCountry(cc);
            }
            break;
 }
        }
      }

      current.name = namePart.trim() || 'Sem nome';
    } else if (!line.startsWith('#') && current) {
      if (isHttpUrl(line)) {
        entries.push({
          name: current.name || 'Sem nome',
          logoUrl: current.logoUrl ?? null,
          category: current.category ?? null,
          country: current.country ?? null,
          streamUrl: line,
        });
      }
      current = null;
    }
  }
  return entries;
}

function finalizeCountry(value: string | null | undefined): string | null {
  const cc = (value ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : null;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}
