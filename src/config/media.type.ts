/** Tipos de média suportados pelo catálogo (espelha o ENUM media_type da BD). */
export const MEDIA_TYPES = ['MOVIE', 'SERIES', 'ANIME', 'SOAP_OPERA'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];
