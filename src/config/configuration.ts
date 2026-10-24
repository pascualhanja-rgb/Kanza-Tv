export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  database: { url: process.env.DATABASE_URL as string },

  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim()),

  tmdb: {
    apiKey: process.env.TMDB_API_KEY as string,
    accessToken: (process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_AUTH_TOKEN || '').replace(/^'|'$/g, ''),
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500',
    language: process.env.TMDB_LANGUAGE || 'pt-BR',
    cacheTtl: parseInt(process.env.TMDB_CACHE_TTL || '300', 10),
    soapGenreId: parseInt(process.env.TMDB_SOAP_GENRE_ID || '10766', 10),
  },

  kitsu: { baseUrl: process.env.KITSU_BASE_URL || 'https://kitsu.io/api/edge' },

  vidsrc: { baseUrl: process.env.VIDSRC_BASE_URL || 'https://vidsrc.icu/embed' },

  iptv: {
    m3uUrl: process.env.IPTV_M3U_URL || 'https://iptv-org.github.io/iptv/index.m3u',
    allowedCountries: (process.env.IPTV_ALLOWED_COUNTRIES || '')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
    syncBatchLimit: parseInt(process.env.IPTV_SYNC_BATCH_LIMIT || '0', 10),
  },

  adminSyncKey: process.env.ADMIN_SYNC_KEY as string,
});

export default configuration;
export type AppConfig = ReturnType<typeof configuration>;