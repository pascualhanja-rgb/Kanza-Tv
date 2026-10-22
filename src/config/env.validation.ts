import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string()
    .pattern(/^postgresql:\/\/.+/)
    .required()
    .messages({ 'string.pattern.base': 'DATABASE_URL deve ser uma connection string PostgreSQL válida' }),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGINS: Joi.string().default('*'),

  TMDB_API_KEY: Joi.string().required(),
  TMDB_AUTH_TOKEN: Joi.string().required(),
  TMDB_BASE_URL: Joi.string().uri().default('https://api.themoviedb.org/3'),
  TMDB_IMAGE_BASE_URL: Joi.string().uri().default('https://image.tmdb.org/t/p/w500'),
  TMDB_LANGUAGE: Joi.string().default('pt-BR'),
  TMDB_CACHE_TTL: Joi.number().integer().min(0).default(300),
  TMDB_SOAP_GENRE_ID: Joi.number().integer().default(10766),

  KITSU_BASE_URL: Joi.string().uri().default('https://kitsu.io/api/edge'),
  VIDSRC_BASE_URL: Joi.string().uri().default('https://vidsrc.icu/embed'),

  IPTV_M3U_URL: Joi.string().uri().default('https://iptv-org.github.io/iptv/index.m3u'),
  IPTV_ALLOWED_COUNTRIES: Joi.string().allow('').default(''),
  IPTV_SYNC_BATCH_LIMIT: Joi.number().integer().min(0).default(0),

  ADMIN_SYNC_KEY: Joi.string().min(8).required(),
});
