import { z } from "zod";

export const urlSchema = z.string().url().refine((value) => /^https?:\/\//i.test(value), "Use http ou https.");
export const mediaUrlSchema = urlSchema.refine((value) => /\.(m3u8|mp4)(\?|$)/i.test(value), "Use uma URL HLS .m3u8 ou MP4.");

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const movieSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(""),
  categoryId: z.string().uuid().nullable().optional(),
  year: z.coerce.number().int().min(1888).max(2100).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(0).nullable().optional(),
  posterUrl: urlSchema.optional().or(z.literal("")).nullable(),
  bannerUrl: urlSchema.optional().or(z.literal("")).nullable(),
  videoUrl: mediaUrlSchema,
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT")
});

export const channelSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().uuid().nullable().optional(),
  logoUrl: urlSchema.optional().or(z.literal("")).nullable(),
  streamUrl: mediaUrlSchema,
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT")
});

export const seriesSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(""),
  categoryId: z.string().uuid().nullable().optional(),
  year: z.coerce.number().int().min(1888).max(2100).nullable().optional(),
  rating: z.string().optional().default("Livre"),
  posterUrl: urlSchema.optional().or(z.literal("")).nullable(),
  bannerUrl: urlSchema.optional().or(z.literal("")).nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT")
});

export const episodeSchema = z.object({
  seasonNumber: z.coerce.number().int().min(1).default(1),
  episodeNumber: z.coerce.number().int().min(1).default(1),
  title: z.string().min(2),
  description: z.string().optional().default(""),
  durationMinutes: z.coerce.number().int().min(0).nullable().optional(),
  videoUrl: mediaUrlSchema,
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("ACTIVE")
});

export const categorySchema = z.object({
  name: z.string().min(2),
  type: z.enum(["MOVIE", "CHANNEL", "SERIES", "ALL"]),
  active: z.boolean().default(true)
});

export const sourceSchema = z.object({
  name: z.string().min(2),
  apiUrl: urlSchema,
  apiKey: z.string().optional().default(""),
  sourceType: z.enum(["movies", "channels", "series", "all"]),
  active: z.boolean().default(true),
  reviewBeforePublish: z.boolean().default(true),
  fieldMapping: z.record(z.string()).default({})
});

export const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

const externalMovieIdSchema = z.preprocess((value) => {
  const text = String(value || "").trim();
  const imdbFromUrl = text.match(/\/title\/(tt\d+)/i)?.[1];
  return imdbFromUrl || text;
}, z.string().regex(/^(tt\d+|\d+)$/, "Use um ID TMDb numerico, IMDb iniciado por tt ou uma URL IMDb /title/tt..."));

const embedMoviesBaseSchema = z.object({
  contentType: z.enum(["movie", "series", "episode"]),
  id: externalMovieIdSchema,
  seasonNumber: z.coerce.number().int().min(1).optional(),
  episodeNumber: z.coerce.number().int().min(1).optional(),
  licenseConfirmed: z.boolean().optional().default(true)
});

export const embedMoviesBuildSchema = embedMoviesBaseSchema.refine((body) => {
  if (body.contentType !== "episode") return true;
  return Boolean(body.seasonNumber && body.episodeNumber);
}, "Episodios exigem temporada e numero do episodio.");

export const embedMoviesPublishSchema = embedMoviesBaseSchema.extend({
  title: z.string().min(2),
  description: z.string().optional().default("Conteudo externo autorizado cadastrado pelo administrador."),
  category: z.string().min(2).default("EmbedMovies"),
  year: z.coerce.number().int().min(1888).max(2100).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(0).nullable().optional(),
  posterUrl: urlSchema.optional().or(z.literal("")).nullable(),
  bannerUrl: urlSchema.optional().or(z.literal("")).nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("ACTIVE")
}).refine((body) => {
  if (body.contentType !== "episode") return true;
  return Boolean(body.seasonNumber && body.episodeNumber);
}, "Episodios exigem temporada e numero do episodio.");

export const embedMoviesMetadataSchema = z.object({
  contentType: z.enum(["movie", "series", "episode"]),
  id: externalMovieIdSchema
});

export const tmdbSettingsSchema = z.object({
  apiKey: z.string().trim().min(8, "Informe uma chave TMDb valida.")
});

export const tmdbCompanyImportSchema = z.object({
  companyIds: z.array(z.coerce.number().int().positive()).min(1).max(20),
  pagesPerCompany: z.coerce.number().int().min(1).max(5).default(1),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT")
});

export function parseOrThrow(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(" ");
    const error = new Error(message);
    error.status = 422;
    throw error;
  }
  return result.data;
}
