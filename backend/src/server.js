import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import multer from "multer";
import cron from "node-cron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "./db/pool.js";
import { encryptSecret, requireAuth, signToken } from "./security.js";
import { fetchSource, importRecords, parseFileImport } from "./importers.js";
import { categorySchema, channelSchema, embedMoviesBuildSchema, embedMoviesMetadataSchema, embedMoviesPublishSchema, episodeSchema, loginSchema, movieSchema, parseOrThrow, seriesSchema, sourceSchema, tmdbCompanyImportSchema, tmdbSettingsSchema, userSchema } from "./validation.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const envPath = path.join(__dirname, "..", ".env");
const customEmbedsPath = path.join(__dirname, "..", "data", "custom-embeds.json");
const embedMoviesBaseUrl = process.env.EMBEDMOVIES_BASE_URL || "https://myembed.biz";
const demoWithoutDb = process.env.DEMO_WITHOUT_DB !== "false";
const allowPublicEmbeds = process.env.ALLOW_PUBLIC_EMBEDS === "true";
const customEmbedMovies = [];
const customEmbedSeries = [];
let runtimeTmdbApiKey = process.env.TMDB_API_KEY || "";
let tmdbMovieGenresCache = null;

function isDbUnavailable(error) {
  return error?.code === "ECONNREFUSED" || error?.errors?.some?.((item) => item.code === "ECONNREFUSED");
}

const demoAdminUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Administrador Demo",
  email: "admin@streambox.app",
  role: "ADMIN"
};

const demoCategories = [
  { id: "00000000-0000-4000-8000-000000000101", name: "Open Movie", type: "MOVIE", active: true },
  { id: "00000000-0000-4000-8000-000000000102", name: "Ciencia", type: "ALL", active: true },
  { id: "00000000-0000-4000-8000-000000000103", name: "Teste HLS", type: "CHANNEL", active: true },
  { id: "00000000-0000-4000-8000-000000000104", name: "Natureza", type: "ALL", active: true }
];

const demoMovies = [
  {
    id: "demo-movie-sintel",
    title: "Sintel",
    description: "Curta aberto usado como demonstracao legal.",
    category: "Open Movie",
    categoryId: demoCategories[0].id,
    year: 2010,
    durationMinutes: 15,
    posterUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=800&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1400&q=80",
    status: "ACTIVE",
    sources: [{ url: "https://download.blender.org/durian/movies/sintel-1024-surround.mp4", type: "MP4", quality: "HD", licensed: true }]
  },
  {
    id: "demo-movie-bunny",
    title: "Big Buck Bunny",
    description: "Filme aberto/sample para testes.",
    category: "Open Movie",
    categoryId: demoCategories[0].id,
    year: 2008,
    durationMinutes: 10,
    posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80",
    status: "ACTIVE",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", type: "MP4", quality: "HD", licensed: true }]
  }
];

const demoChannels = [
  {
    id: "demo-channel-nasa",
    title: "NASA Public Demo",
    name: "NASA Public Demo",
    category: "Ciencia",
    categoryId: demoCategories[1].id,
    logoUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=400&q=80",
    status: "ACTIVE",
    sources: [{ url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-Public/master.m3u8", type: "HLS", quality: "Auto", licensed: true }]
  },
  {
    id: "demo-channel-mux",
    title: "Mux HLS Test",
    name: "Mux HLS Test",
    category: "Teste HLS",
    categoryId: demoCategories[2].id,
    logoUrl: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=400&q=80",
    status: "ACTIVE",
    sources: [{ url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", type: "HLS", quality: "Auto", licensed: true }]
  }
];

function demoFallback(error, value) {
  if (demoWithoutDb && isDbUnavailable(error)) return value;
  throw error;
}

function hasDirectPlayableSource(item) {
  const source = item.sources?.[0];
  const url = source?.url || "";
  const type = String(source?.type || "").toUpperCase();
  return ["HLS", "MP4"].includes(type) || /\.(m3u8|mp4|mov)(\?|#|$)/i.test(url);
}

function publicPlayableItems(items) {
  if (allowPublicEmbeds) return items;
  return items.filter(hasDirectPlayableSource);
}

function movieFromAdminBody(body, id = `local-movie-${Date.now()}`) {
  const sourceType = body.videoUrl?.includes(".m3u8") ? "HLS" : "MP4";
  return {
    id,
    title: body.title,
    description: body.description || "",
    category: "Filmes",
    categoryId: body.categoryId || null,
    year: body.year,
    durationMinutes: body.durationMinutes,
    posterUrl: body.posterUrl || body.bannerUrl || "",
    bannerUrl: body.bannerUrl || body.posterUrl || "",
    backdropUrl: body.bannerUrl || body.posterUrl || "",
    status: body.status,
    sources: [{ url: body.videoUrl, type: sourceType, quality: "Auto", licensed: true }]
  };
}

function buildEmbedMoviesUrl(body) {
  return body.contentType === "movie"
    ? `${embedMoviesBaseUrl}/filme/${body.id}`
    : body.contentType === "series"
      ? `${embedMoviesBaseUrl}/serie/${body.id}`
      : `${embedMoviesBaseUrl}/serie/${body.id}/${body.seasonNumber}/${body.episodeNumber}`;
}

function tmdbApiKey() {
  return runtimeTmdbApiKey || process.env.TMDB_API_KEY || "";
}

function tmdbUrl(pathname, credential) {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  url.searchParams.set("language", "pt-BR");
  if (!credential.startsWith("eyJ")) url.searchParams.set("api_key", credential);
  return url;
}

function tmdbHeaders(credential) {
  return credential.startsWith("eyJ") ? { Authorization: `Bearer ${credential}` } : {};
}

function tmdbImage(pathValue, size = "w500") {
  return pathValue ? `https://image.tmdb.org/t/p/${size}${pathValue}` : "";
}

async function tmdbMovieGenres(tmdbKey) {
  if (tmdbMovieGenresCache) return tmdbMovieGenresCache;
  const url = tmdbUrl("/genre/movie/list", tmdbKey);
  const response = await fetch(url, { headers: tmdbHeaders(tmdbKey) });
  if (!response.ok) return new Map();
  const data = await response.json();
  tmdbMovieGenresCache = new Map((data.genres || []).map((genre) => [genre.id, genre.name]));
  return tmdbMovieGenresCache;
}

function movieFromTmdbDiscover(item, status = "DRAFT", genreMap = new Map()) {
  const tmdbId = String(item.id);
  const primaryGenreId = item.genre_ids?.[0];
  const category = genreMap.get(primaryGenreId) || "TMDb";
  return {
    id: `embedmovies-movie-${tmdbId}-0-0`,
    title: item.title || item.original_title || `Filme ${tmdbId}`,
    description: item.overview || "Conteudo encontrado no TMDb. Revise licenca e disponibilidade antes de publicar.",
    category,
    categoryId: null,
    year: Number((item.release_date || "").slice(0, 4)) || "",
    durationMinutes: "",
    posterUrl: tmdbImage(item.poster_path, "w500"),
    bannerUrl: tmdbImage(item.backdrop_path, "w1280") || tmdbImage(item.poster_path, "w780"),
    backdropUrl: tmdbImage(item.backdrop_path, "w1280") || tmdbImage(item.poster_path, "w780"),
    status,
    sources: [{ url: buildEmbedMoviesUrl({ contentType: "movie", id: tmdbId }), type: "EMBED", quality: "Embed", licensed: true }]
  };
}

async function discoverTmdbCompanyMovies(companyId, page, tmdbKey) {
  const url = tmdbUrl("/discover/movie", tmdbKey);
  url.searchParams.set("with_companies", String(companyId));
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", String(page));
  const response = await fetch(url, { headers: tmdbHeaders(tmdbKey) });
  if (!response.ok) throw new Error(`TMDb retornou ${response.status} para empresa ${companyId}, pagina ${page}.`);
  return response.json();
}

function pickPortugueseTranslation(data, titleField) {
  const translations = data.translations?.translations || [];
  return translations.find((item) => item.iso_639_1 === "pt" && item.iso_3166_1 === "BR" && item.data?.[titleField])
    || translations.find((item) => item.iso_639_1 === "pt" && item.data?.[titleField])
    || null;
}

function pickBrazilTitle(data) {
  const titles = data.alternative_titles?.titles || data.alternative_titles?.results || [];
  return titles.find((item) => item.iso_3166_1 === "BR" && item.title)?.title
    || titles.find((item) => item.iso_3166_1 === "PT" && item.title)?.title
    || "";
}

async function translateToPtBr(text) {
  if (!text) return "";
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", "en|pt-BR");
    const response = await fetch(url, { headers: { "user-agent": "StreamBoxDemo/1.0" } });
    if (!response.ok) return "";
    const data = await response.json();
    return data.responseData?.translatedText || "";
  } catch {
    return "";
  }
}

async function saveEnvValue(key, value) {
  let current = "";
  try {
    current = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const escaped = String(value).replace(/\r?\n/g, "");
  const line = `${key}=${escaped}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.trimEnd()}${current.trim() ? "\n" : ""}${line}\n`;
  await fs.writeFile(envPath, next, "utf8");
}

async function loadCustomEmbeds() {
  try {
    const data = JSON.parse(await fs.readFile(customEmbedsPath, "utf8"));
    customEmbedMovies.splice(0, customEmbedMovies.length, ...(data.movies || []));
    customEmbedSeries.splice(0, customEmbedSeries.length, ...(data.series || []));
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Nao foi possivel carregar embeds salvos:", error.message);
  }
}

async function saveCustomEmbeds() {
  await fs.mkdir(path.dirname(customEmbedsPath), { recursive: true });
  await fs.writeFile(customEmbedsPath, JSON.stringify({ movies: customEmbedMovies, series: customEmbedSeries }, null, 2), "utf8");
}

async function fetchWikidataMetadata(body) {
  if (!/^\d+$/.test(body.id)) return null;
  const property = body.contentType === "movie" ? "wdt:P4947" : "wdt:P4983";
  const sparql = `
    SELECT ?itemLabel ?image ?date ?genreLabel WHERE {
      ?item ${property} "${body.id}".
      OPTIONAL { ?item wdt:P18 ?image. }
      OPTIONAL { ?item wdt:P577 ?date. }
      OPTIONAL { ?item wdt:P136 ?genre. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
    }
    LIMIT 1
  `;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const response = await fetch(url, { headers: { "user-agent": "StreamBoxDemo/1.0" } });
  if (!response.ok) return null;
  const data = await response.json();
  const row = data.results?.bindings?.[0];
  if (!row) return null;
  const image = row.image?.value || "";
  return {
    title: row.itemLabel?.value || `${body.contentType === "movie" ? "Filme" : "Serie"} ${body.id}`,
    description: "Metadados encontrados em base publica. Revise capa, sinopse e categoria antes de publicar.",
    year: row.date?.value ? Number(row.date.value.slice(0, 4)) || "" : "",
    category: row.genreLabel?.value || (body.contentType === "movie" ? "Filmes" : "Series"),
    posterUrl: image,
    bannerUrl: image,
    notice: "Preenchi metadados publicos encontrados pelo ID. Revise antes de adicionar ao app."
  };
}

async function fetchTmdbMetadata(body, tmdbKey) {
  const requestedType = body.contentType === "movie" ? "movie" : "tv";
  let tmdbId = body.id;
  let type = requestedType;

  if (/^tt\d+$/i.test(body.id)) {
    const findUrl = tmdbUrl(`/find/${body.id}`, tmdbKey);
    findUrl.searchParams.set("external_source", "imdb_id");
    const findResponse = await fetch(findUrl, { headers: tmdbHeaders(tmdbKey) });
    if (!findResponse.ok) return null;
    const found = await findResponse.json();
    const match = requestedType === "movie"
      ? found.movie_results?.[0]
      : found.tv_results?.[0] || found.movie_results?.[0];
    if (!match) return null;
    tmdbId = match.id;
    type = match.media_type || (found.tv_results?.[0] === match ? "tv" : "movie");
  }

  const detailsUrl = tmdbUrl(`/${type}/${tmdbId}`, tmdbKey);
  detailsUrl.searchParams.set("append_to_response", type === "movie" ? "translations,alternative_titles" : "translations,alternative_titles");
  const response = await fetch(detailsUrl, { headers: tmdbHeaders(tmdbKey) });
  if (!response.ok) return null;
  const data = await response.json();
  const titleField = type === "movie" ? "title" : "name";
  const originalTitle = data.title || data.name || "";
  const ptTranslation = pickPortugueseTranslation(data, titleField);
  const translatedTitle = pickBrazilTitle(data) || ptTranslation?.data?.[titleField] || await translateToPtBr(originalTitle);
  const translatedOverview = data.overview || ptTranslation?.data?.overview || await translateToPtBr(
    data.translations?.translations?.find((item) => item.iso_639_1 === "en")?.data?.overview || ""
  );
  const posterUrl = tmdbImage(data.poster_path, "w500");
  return {
    title: translatedTitle || originalTitle,
    description: translatedOverview || "",
    year: Number((data.release_date || data.first_air_date || "").slice(0, 4)) || "",
    durationMinutes: data.runtime || data.episode_run_time?.[0] || "",
    category: data.genres?.[0]?.name || "EmbedMovies",
    posterUrl,
    bannerUrl: tmdbImage(data.backdrop_path, "w1280") || tmdbImage(data.poster_path, "w780"),
    embedId: data.imdb_id || body.id,
    notice: "Preenchi metadados, capa e banner via TMDb. Revise antes de adicionar ao app."
  };
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use((req, res, next) => {
  if (req.path === "/app" || req.path.startsWith("/app-preview")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});
app.get("/app-preview-live.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(publicDir, "app-preview.js"));
});
app.use(express.static(publicDir));
app.use("/vendor/hls", express.static(path.join(__dirname, "..", "node_modules", "hls.js", "dist")));

await loadCustomEmbeds();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function camelMovie(row) {
  const videoUrl = row.video_url || "";
  const sourceType = videoUrl.includes(".m3u8")
    ? "HLS"
    : /\.(mp4|mov)(\?|#|$)/i.test(videoUrl)
      ? "MP4"
      : "EMBED";
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category || "Sem categoria",
    categoryId: row.category_id,
    year: row.year,
    durationMinutes: row.duration_minutes,
    posterUrl: row.poster_url,
    backdropUrl: row.banner_url,
    bannerUrl: row.banner_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sources: [{ url: videoUrl, type: sourceType, quality: sourceType === "EMBED" ? "Embed" : "Auto", licensed: true }]
  };
}

function camelChannel(row) {
  return {
    id: row.id,
    title: row.name,
    name: row.name,
    category: row.category || "Sem categoria",
    categoryId: row.category_id,
    logoUrl: row.logo_url,
    description: "",
    status: row.status,
    sources: [{ url: row.stream_url, type: "HLS", quality: "Auto", licensed: true }]
  };
}

function camelSeries(row, episodes = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category || "Series",
    categoryId: row.category_id,
    year: row.year,
    rating: row.rating,
    posterUrl: row.poster_url,
    backdropUrl: row.banner_url,
    bannerUrl: row.banner_url,
    status: row.status,
    seasons: Math.max(1, ...episodes.map((episode) => episode.seasonNumber || 1), 1),
    episodes
  };
}

async function publicMovies() {
  try {
    const result = await query(`
      SELECT movies.*, categories.name AS category
      FROM movies LEFT JOIN categories ON categories.id = movies.category_id
      WHERE movies.status = 'ACTIVE'
      ORDER BY COALESCE(movies.year, 0) DESC, movies.created_at DESC, movies.title ASC
    `);
    return publicPlayableItems(result.rows.map(camelMovie));
  } catch (error) {
    const fallbackCatalog = customEmbedMovies.length ? customEmbedMovies : demoMovies;
    return demoFallback(error, publicPlayableItems(fallbackCatalog));
  }
}

async function publicChannels() {
  try {
    const result = await query(`
      SELECT channels.*, categories.name AS category
      FROM channels LEFT JOIN categories ON categories.id = channels.category_id
      WHERE channels.status = 'ACTIVE'
      ORDER BY channels.created_at DESC
    `);
    return result.rows.map(camelChannel);
  } catch (error) {
    return demoFallback(error, customEmbedMovies.length ? [] : demoChannels);
  }
}

async function publicSeries() {
  try {
    const result = await query(`
      SELECT series.*, categories.name AS category
      FROM series LEFT JOIN categories ON categories.id = series.category_id
      WHERE series.status = 'ACTIVE'
      ORDER BY series.created_at DESC
    `);
    const episodesResult = await query("SELECT * FROM episodes WHERE status = 'ACTIVE' ORDER BY season_number, episode_number");
    const episodesBySeries = new Map();
    for (const row of episodesResult.rows) {
      const list = episodesBySeries.get(row.series_id) || [];
      list.push({
        id: row.id,
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
        title: row.title,
        description: row.description,
        durationMinutes: row.duration_minutes,
        sources: [{ url: row.video_url, type: row.video_url?.includes(".m3u8") ? "HLS" : "MP4", quality: "Auto", licensed: true }]
      });
      episodesBySeries.set(row.series_id, list);
    }
    return [...customEmbedSeries, ...result.rows.map((row) => camelSeries(row, episodesBySeries.get(row.id) || []))];
  } catch (error) {
    return demoFallback(error, customEmbedSeries);
  }
}

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const body = parseOrThrow(loginSchema, req.body);
  let user;
  try {
    const result = await query("SELECT * FROM users WHERE email = $1 AND status = 'ACTIVE'", [body.email]);
    user = result.rows[0];
  } catch (error) {
    if (demoWithoutDb && isDbUnavailable(error) && body.email === "admin@streambox.app" && body.password === "streambox") {
      return res.json({ token: signToken(demoAdminUser), user: demoAdminUser, mode: "demo-without-db" });
    }
    throw error;
  }
  if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
    return res.status(401).json({ error: "Credenciais invalidas." });
  }
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.get("/api/public/config", (_req, res) => {
  res.json({
    brandTitle: "StreamBox",
    tagline: "Streaming legal com conteudo autorizado.",
    backgroundImageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
    legalNotice: "Use somente filmes, canais e videos proprios, autorizados ou licenciados."
  });
});

app.get("/api/public/movies", asyncRoute(async (_req, res) => res.json(await publicMovies())));
app.get("/api/public/channels", asyncRoute(async (_req, res) => res.json(await publicChannels())));
app.get("/api/public/series", asyncRoute(async (_req, res) => res.json(await publicSeries())));
app.get("/api/public/epg", (_req, res) => res.json([]));
app.get("/api/public/banners", asyncRoute(async (_req, res) => {
  const movies = await publicMovies();
  res.json(movies.slice(0, 4).map((movie) => ({
    id: movie.id,
    title: movie.title,
    subtitle: movie.description,
    imageUrl: movie.bannerUrl || movie.posterUrl,
    contentId: movie.id,
    contentType: "MOVIE"
  })));
}));

app.get("/app", (_req, res) => res.sendFile(path.join(publicDir, "app-preview.html")));

app.get("/config", (_req, res) => res.redirect("/api/public/config"));
app.get("/movies", asyncRoute(async (_req, res) => res.json(await publicMovies())));
app.get("/channels", asyncRoute(async (_req, res) => res.json(await publicChannels())));
app.get("/series", asyncRoute(async (_req, res) => res.json(await publicSeries())));
app.get("/epg", (_req, res) => res.json([]));
app.get("/banners", asyncRoute(async (_req, res) => {
  const movies = await publicMovies();
  res.json(movies.slice(0, 4).map((movie) => ({ id: movie.id, title: movie.title, subtitle: movie.description, imageUrl: movie.bannerUrl || movie.posterUrl, contentId: movie.id, contentType: "MOVIE" })));
}));

app.post("/favorites", requireAuth(), (_req, res) => res.json({ ok: true }));
app.post("/history", requireAuth(), (_req, res) => res.json({ ok: true }));

app.get("/api/admin/dashboard", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    const [movies, channels, users, sources, drafts] = await Promise.all([
      query("SELECT count(*)::int AS total FROM movies"),
      query("SELECT count(*)::int AS total FROM channels"),
      query("SELECT count(*)::int AS total FROM users"),
      query("SELECT count(*)::int AS total FROM content_sources"),
      query("SELECT (SELECT count(*) FROM movies WHERE status='DRAFT')::int + (SELECT count(*) FROM channels WHERE status='DRAFT')::int AS total")
    ]);
    res.json({
      movies: movies.rows[0].total,
      channels: channels.rows[0].total,
      users: users.rows[0].total,
      sources: sources.rows[0].total,
      drafts: drafts.rows[0].total
    });
  } catch (error) {
    res.json(demoFallback(error, {
      movies: demoMovies.length,
      channels: demoChannels.length,
      users: 1,
      sources: 0,
      drafts: 0
    }));
  }
}));

app.get("/api/admin/embed-providers/embedmovies/template", requireAuth("ADMIN"), (_req, res) => {
  res.json({
    provider: "EmbedMovies",
    enabled: process.env.ALLOW_EXTERNAL_EMBEDS === "true",
    tmdbConfigured: Boolean(tmdbApiKey()),
    baseUrl: embedMoviesBaseUrl,
    templates: {
      movie: `${embedMoviesBaseUrl}/filme/{id}`,
      series: `${embedMoviesBaseUrl}/serie/{id}`,
      episode: `${embedMoviesBaseUrl}/serie/{id}/{seasonNumber}/{episodeNumber}`
    },
    legalNotice: "Use este provedor somente com conteudos proprios, autorizados ou licenciados. O backend nao valida direitos autorais automaticamente."
  });
});

app.get("/api/admin/settings/tmdb", requireAuth("ADMIN"), (_req, res) => {
  res.json({ configured: Boolean(tmdbApiKey()) });
});

app.post("/api/admin/settings/tmdb", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(tmdbSettingsSchema, req.body);
  runtimeTmdbApiKey = body.apiKey;
  process.env.TMDB_API_KEY = body.apiKey;
  await saveEnvValue("TMDB_API_KEY", body.apiKey);
  res.json({ configured: true });
}));

app.post("/api/admin/tmdb/company-import", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(tmdbCompanyImportSchema, req.body);
  const tmdbKey = tmdbApiKey();
  if (!tmdbKey) return res.status(422).json({ error: "Configure TMDB_API_KEY antes de importar por produtora." });
  if (process.env.ALLOW_EXTERNAL_EMBEDS !== "true") {
    return res.status(403).json({ error: "Embeds externos estao desativados no .env." });
  }

  const report = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const genreMap = await tmdbMovieGenres(tmdbKey);

  for (const companyId of body.companyIds) {
    for (let page = 1; page <= body.pagesPerCompany; page += 1) {
      try {
        const data = await discoverTmdbCompanyMovies(companyId, page, tmdbKey);
        for (const item of data.results || []) {
          const movie = movieFromTmdbDiscover(item, body.status, genreMap);
          const existingIndex = customEmbedMovies.findIndex((entry) => entry.id === movie.id);
          if (existingIndex >= 0) {
            customEmbedMovies[existingIndex] = movie;
            updated += 1;
            report.push({ ok: true, companyId, page, id: item.id, title: movie.title, status: "updated" });
          } else {
            customEmbedMovies.unshift(movie);
            added += 1;
            report.push({ ok: true, companyId, page, id: item.id, title: movie.title, status: "added" });
          }
        }
        if (page >= Number(data.total_pages || 1)) break;
      } catch (error) {
        skipped += 1;
        report.push({ ok: false, companyId, page, title: "", status: "error", message: error.message });
      }
    }
  }

  await saveCustomEmbeds();
  res.json({ ok: true, added, updated, skipped, total: report.length, report });
}));

app.post("/api/admin/embed-providers/embedmovies/build", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  if (process.env.ALLOW_EXTERNAL_EMBEDS !== "true") {
    return res.status(403).json({
      error: "Embeds externos estao desativados. Defina ALLOW_EXTERNAL_EMBEDS=true no .env apenas se voce tiver autorizacao/licenca."
    });
  }
  const body = parseOrThrow(embedMoviesBuildSchema, req.body);
  const embedUrl = buildEmbedMoviesUrl(body);
  res.json({
    embedUrl,
    iframe: `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allowfullscreen loading="lazy"></iframe>`,
    legalNotice: "URL gerada sob confirmacao do administrador de que o conteudo e autorizado/licenciado."
  });
}));

app.post("/api/admin/embed-providers/embedmovies/metadata", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(embedMoviesMetadataSchema, req.body);
  const tmdbKey = tmdbApiKey();
  if (tmdbKey) {
    const tmdb = await fetchTmdbMetadata(body, tmdbKey);
    if (tmdb) return res.json(tmdb);
  }

  const wikidata = await fetchWikidataMetadata(body);
  if (wikidata) return res.json(wikidata);

  res.json({
    title: `${body.contentType === "movie" ? "Filme" : "Serie"} ${body.id}`,
    description: "Metadados automaticos exigem TMDB_API_KEY no .env. Revise e complete os campos antes de publicar.",
    year: "",
    category: body.contentType === "movie" ? "Filmes" : "Series",
    posterUrl: "",
    bannerUrl: "",
    notice: "Preenchi campos basicos porque a chave TMDb nao esta configurada ou nao retornou este ID. Para capas e banners reais, salve uma TMDb API Key e use ID TMDb, ID IMDb tt... ou URL IMDb /title/tt..."
  });
}));

app.post("/api/admin/embed-providers/embedmovies/publish", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  if (process.env.ALLOW_EXTERNAL_EMBEDS !== "true") {
    return res.status(403).json({ error: "Embeds externos estao desativados no .env." });
  }
  const body = parseOrThrow(embedMoviesPublishSchema, req.body);
  const embedUrl = buildEmbedMoviesUrl(body);
  const itemId = `embedmovies-${body.contentType}-${body.id}-${body.seasonNumber || 0}-${body.episodeNumber || 0}`;
  const source = { url: embedUrl, type: "EMBED", quality: "Embed", licensed: true };

  if (body.contentType === "movie") {
    const movie = {
      id: itemId,
      title: body.title,
      description: body.description,
      category: body.category,
      categoryId: null,
      year: body.year,
      durationMinutes: body.durationMinutes,
      posterUrl: body.posterUrl || body.bannerUrl || "",
      bannerUrl: body.bannerUrl || body.posterUrl || "",
      backdropUrl: body.bannerUrl || body.posterUrl || "",
      status: body.status,
      sources: [source]
    };
    const existingIndex = customEmbedMovies.findIndex((item) => item.id === itemId);
    if (existingIndex >= 0) {
      customEmbedMovies[existingIndex] = movie;
      await saveCustomEmbeds();
      return res.json({ ok: true, contentType: "movie", item: movie, updated: true });
    }
    customEmbedMovies.unshift(movie);
    await saveCustomEmbeds();
    return res.status(201).json({ ok: true, contentType: "movie", item: movie, updated: false });
  }

  const series = {
    id: itemId,
    title: body.title,
    description: body.description,
    category: body.category,
    categoryId: null,
    year: body.year,
    rating: "Livre",
    posterUrl: body.posterUrl || body.bannerUrl || "",
    bannerUrl: body.bannerUrl || body.posterUrl || "",
    backdropUrl: body.bannerUrl || body.posterUrl || "",
    status: body.status,
    seasons: body.contentType === "episode" ? body.seasonNumber : 1,
    episodes: [{
      id: `${itemId}-ep`,
      seasonNumber: body.seasonNumber || 1,
      episodeNumber: body.episodeNumber || 1,
      title: body.contentType === "episode" ? `${body.title} - Episodio ${body.episodeNumber}` : "Assistir",
      description: body.description,
      durationMinutes: body.durationMinutes,
      sources: [source]
    }]
  };
  const existingIndex = customEmbedSeries.findIndex((item) => item.id === itemId);
  if (existingIndex >= 0) {
    customEmbedSeries[existingIndex] = series;
    await saveCustomEmbeds();
    return res.json({ ok: true, contentType: "series", item: series, updated: true });
  }
  customEmbedSeries.unshift(series);
  await saveCustomEmbeds();
  res.status(201).json({ ok: true, contentType: "series", item: series, updated: false });
}));

app.get("/api/admin/categories", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        categories.*,
        COUNT(DISTINCT movies.id)::int AS movie_count,
        COUNT(DISTINCT channels.id)::int AS channel_count,
        COUNT(DISTINCT series.id)::int AS series_count
      FROM categories
      LEFT JOIN movies ON movies.category_id = categories.id
      LEFT JOIN channels ON channels.category_id = categories.id
      LEFT JOIN series ON series.category_id = categories.id
      GROUP BY categories.id, categories.name, categories.type, categories.active, categories.created_at
      ORDER BY categories.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.json(demoFallback(error, demoCategories));
  }
}));

app.post("/api/admin/categories", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(categorySchema, req.body);
  const result = await query("INSERT INTO categories (name, type, active) VALUES ($1, $2, $3) RETURNING *", [body.name, body.type, body.active]);
  res.status(201).json(result.rows[0]);
}));

app.put("/api/admin/categories/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(categorySchema, req.body);
  const result = await query("UPDATE categories SET name=$1, type=$2, active=$3 WHERE id=$4 RETURNING *", [body.name, body.type, body.active, req.params.id]);
  res.json(result.rows[0]);
}));

app.delete("/api/admin/categories/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const result = await query("DELETE FROM categories WHERE id=$1", [req.params.id]);
  res.json({ ok: true, deleted: result.rowCount });
}));

app.get("/api/admin/movies", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    const result = await query("SELECT movies.*, categories.name AS category FROM movies LEFT JOIN categories ON categories.id=movies.category_id ORDER BY movies.created_at DESC");
    res.json(result.rows.map(camelMovie));
  } catch (error) {
    res.json(demoFallback(error, [...customEmbedMovies, ...demoMovies]));
  }
}));

app.post("/api/admin/movies", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(movieSchema, req.body);
  try {
    const result = await query(
      `INSERT INTO movies (title, description, category_id, year, duration_minutes, poster_url, banner_url, video_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [body.title, body.description, body.categoryId, body.year, body.durationMinutes, body.posterUrl, body.bannerUrl, body.videoUrl, body.status]
    );
    res.status(201).json(camelMovie(result.rows[0]));
  } catch (error) {
    if (!demoWithoutDb || !isDbUnavailable(error)) throw error;
    const movie = movieFromAdminBody(body);
    customEmbedMovies.unshift(movie);
    await saveCustomEmbeds();
    res.status(201).json(movie);
  }
}));

app.put("/api/admin/movies/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(movieSchema, req.body);
  try {
    const result = await query(
      `UPDATE movies SET title=$1, description=$2, category_id=$3, year=$4, duration_minutes=$5, poster_url=$6, banner_url=$7, video_url=$8, status=$9, updated_at=now()
       WHERE id=$10 RETURNING *`,
      [body.title, body.description, body.categoryId, body.year, body.durationMinutes, body.posterUrl, body.bannerUrl, body.videoUrl, body.status, req.params.id]
    );
    res.json(camelMovie(result.rows[0]));
  } catch (error) {
    if (!demoWithoutDb || !isDbUnavailable(error)) throw error;
    const existingIndex = customEmbedMovies.findIndex((item) => item.id === req.params.id);
    const movie = movieFromAdminBody(body, req.params.id);
    if (existingIndex >= 0) customEmbedMovies[existingIndex] = movie;
    else customEmbedMovies.unshift(movie);
    await saveCustomEmbeds();
    res.json(movie);
  }
}));

app.delete("/api/admin/movies/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  try {
    const result = await query("DELETE FROM movies WHERE id=$1", [req.params.id]);
    if (!result.rowCount) {
      const index = customEmbedMovies.findIndex((item) => item.id === req.params.id);
      if (index >= 0) {
        customEmbedMovies.splice(index, 1);
        await saveCustomEmbeds();
      }
    }
    res.json({ ok: true, deleted: result.rowCount });
  } catch (error) {
    if (!demoWithoutDb || !isDbUnavailable(error)) throw error;
    const index = customEmbedMovies.findIndex((item) => item.id === req.params.id);
    if (index >= 0) {
      customEmbedMovies.splice(index, 1);
      await saveCustomEmbeds();
    }
    res.json({ ok: true });
  }
}));

app.get("/api/admin/channels", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    const result = await query("SELECT channels.*, categories.name AS category FROM channels LEFT JOIN categories ON categories.id=channels.category_id ORDER BY channels.created_at DESC");
    res.json(result.rows.map(camelChannel));
  } catch (error) {
    res.json(demoFallback(error, demoChannels));
  }
}));

app.post("/api/admin/channels", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(channelSchema, req.body);
  const result = await query(
    `INSERT INTO channels (name, category_id, logo_url, stream_url, status)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [body.name, body.categoryId, body.logoUrl, body.streamUrl, body.status]
  );
  res.status(201).json(result.rows[0]);
}));

app.put("/api/admin/channels/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(channelSchema, req.body);
  const result = await query(
    `UPDATE channels SET name=$1, category_id=$2, logo_url=$3, stream_url=$4, status=$5, updated_at=now()
     WHERE id=$6 RETURNING *`,
    [body.name, body.categoryId, body.logoUrl, body.streamUrl, body.status, req.params.id]
  );
  res.json(result.rows[0]);
}));

app.delete("/api/admin/channels/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  await query("DELETE FROM channels WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/admin/series", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    const result = await query("SELECT series.*, categories.name AS category FROM series LEFT JOIN categories ON categories.id=series.category_id ORDER BY series.created_at DESC");
    const episodes = await query("SELECT * FROM episodes ORDER BY season_number, episode_number");
    const episodesBySeries = new Map();
    for (const row of episodes.rows) {
      const list = episodesBySeries.get(row.series_id) || [];
      list.push({
        id: row.id,
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
        title: row.title,
        description: row.description,
        durationMinutes: row.duration_minutes,
        status: row.status,
        sources: [{ url: row.video_url, type: row.video_url?.includes(".m3u8") ? "HLS" : "MP4", quality: "Auto", licensed: true }]
      });
      episodesBySeries.set(row.series_id, list);
    }
    res.json(result.rows.map((row) => camelSeries(row, episodesBySeries.get(row.id) || [])));
  } catch (error) {
    res.json(demoFallback(error, []));
  }
}));

app.post("/api/admin/series", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(seriesSchema, req.body);
  const result = await query(
    `INSERT INTO series (title, description, category_id, year, rating, poster_url, banner_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [body.title, body.description, body.categoryId, body.year, body.rating, body.posterUrl, body.bannerUrl, body.status]
  );
  res.status(201).json(result.rows[0]);
}));

app.put("/api/admin/series/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(seriesSchema, req.body);
  const result = await query(
    `UPDATE series SET title=$1, description=$2, category_id=$3, year=$4, rating=$5, poster_url=$6, banner_url=$7, status=$8, updated_at=now()
     WHERE id=$9 RETURNING *`,
    [body.title, body.description, body.categoryId, body.year, body.rating, body.posterUrl, body.bannerUrl, body.status, req.params.id]
  );
  res.json(result.rows[0]);
}));

app.delete("/api/admin/series/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  await query("DELETE FROM series WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

app.post("/api/admin/series/:id/episodes", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(episodeSchema, req.body);
  const result = await query(
    `INSERT INTO episodes (series_id, season_number, episode_number, title, description, duration_minutes, video_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (series_id, season_number, episode_number)
     DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, duration_minutes=EXCLUDED.duration_minutes, video_url=EXCLUDED.video_url, status=EXCLUDED.status
     RETURNING *`,
    [req.params.id, body.seasonNumber, body.episodeNumber, body.title, body.description, body.durationMinutes, body.videoUrl, body.status]
  );
  res.status(201).json(result.rows[0]);
}));

app.delete("/api/admin/episodes/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  await query("DELETE FROM episodes WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/admin/users", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    res.json((await query("SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC")).rows);
  } catch (error) {
    res.json(demoFallback(error, [{ ...demoAdminUser, status: "ACTIVE", created_at: new Date().toISOString() }]));
  }
}));

app.post("/api/admin/users", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(userSchema, req.body);
  if (!body.password) return res.status(422).json({ error: "Senha obrigatoria para novo usuario." });
  const passwordHash = await bcrypt.hash(body.password, 10);
  const result = await query(
    "INSERT INTO users (name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, status, created_at",
    [body.name, body.email, passwordHash, body.role, body.status]
  );
  res.status(201).json(result.rows[0]);
}));

app.put("/api/admin/users/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(userSchema, req.body);
  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
  const result = await query(
    `UPDATE users
     SET name=$1, email=$2, password_hash=COALESCE($3, password_hash), role=$4, status=$5
     WHERE id=$6
     RETURNING id, name, email, role, status, created_at`,
    [body.name, body.email, passwordHash, body.role, body.status, req.params.id]
  );
  res.json(result.rows[0]);
}));

app.delete("/api/admin/users/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  if (req.user.sub === req.params.id) return res.status(422).json({ error: "Voce nao pode excluir seu proprio usuario logado." });
  await query("DELETE FROM users WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/admin/sources", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    const result = await query("SELECT id, name, api_url, source_type, active, field_mapping, review_before_publish, last_sync_at, created_at FROM content_sources ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    res.json(demoFallback(error, []));
  }
}));

app.post("/api/admin/sources", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(sourceSchema, req.body);
  const result = await query(
    `INSERT INTO content_sources (name, api_url, api_key_cipher, source_type, active, field_mapping, review_before_publish)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [body.name, body.apiUrl, encryptSecret(body.apiKey), body.sourceType, body.active, body.fieldMapping, body.reviewBeforePublish]
  );
  res.status(201).json({ id: result.rows[0].id });
}));

app.put("/api/admin/sources/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const body = parseOrThrow(sourceSchema, req.body);
  await query(
    `UPDATE content_sources SET name=$1, api_url=$2, api_key_cipher=COALESCE($3, api_key_cipher), source_type=$4, active=$5, field_mapping=$6, review_before_publish=$7
     WHERE id=$8`,
    [body.name, body.apiUrl, body.apiKey ? encryptSecret(body.apiKey) : null, body.sourceType, body.active, body.fieldMapping, body.reviewBeforePublish, req.params.id]
  );
  res.json({ ok: true });
}));

app.delete("/api/admin/sources/:id", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  await query("DELETE FROM content_sources WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

app.post("/api/admin/sources/:id/test", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const source = (await query("SELECT * FROM content_sources WHERE id=$1", [req.params.id])).rows[0];
  if (!source) return res.status(404).json({ error: "Fonte nao encontrada." });
  const data = await fetchSource(source);
  res.json({ ok: true, sampleSize: Array.isArray(data) ? data.length : Array.isArray(data.items) ? data.items.length : 1 });
}));

app.post("/api/admin/sources/:id/sync", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const source = (await query("SELECT * FROM content_sources WHERE id=$1", [req.params.id])).rows[0];
  if (!source) return res.status(404).json({ error: "Fonte nao encontrada." });
  const data = await fetchSource(source);
  const records = Array.isArray(data) ? data : data.items || data.movies || data.channels || [];
  const report = await importRecords(records, {
    sourceId: source.id,
    sourceType: source.source_type,
    fieldMapping: source.field_mapping,
    reviewBeforePublish: source.review_before_publish
  });
  await query("UPDATE content_sources SET last_sync_at=now() WHERE id=$1", [source.id]);
  res.json(report);
}));

app.get("/api/admin/import-logs", requireAuth("ADMIN"), asyncRoute(async (_req, res) => {
  try {
    const result = await query("SELECT import_logs.*, content_sources.name AS source_name FROM import_logs LEFT JOIN content_sources ON content_sources.id=import_logs.source_id ORDER BY import_logs.created_at DESC LIMIT 100");
    res.json(result.rows);
  } catch (error) {
    res.json(demoFallback(error, [{
      id: "demo-log",
      source_name: "Modo demo",
      level: "WARN",
      message: "PostgreSQL indisponivel. Painel rodando em modo demo temporario.",
      created_at: new Date().toISOString()
    }]));
  }
}));

app.post("/api/admin/import-file/preview", requireAuth("ADMIN"), upload.single("file"), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(422).json({ error: "Arquivo ausente." });
  const records = parseFileImport(req.file.buffer, req.file.mimetype, req.file.originalname);
  res.json({ count: records.length, preview: records.slice(0, 10), records });
}));

app.post("/api/admin/import-file/commit", requireAuth("ADMIN"), asyncRoute(async (req, res) => {
  const report = await importRecords(req.body.records || [], {
    sourceType: req.body.sourceType || "all",
    reviewBeforePublish: req.body.reviewBeforePublish ?? true
  });
  res.json(report);
}));

cron.schedule("0 3 * * *", async () => {
  const sources = await query("SELECT * FROM content_sources WHERE active = true");
  for (const source of sources.rows) {
    try {
      const data = await fetchSource(source);
      const records = Array.isArray(data) ? data : data.items || data.movies || data.channels || [];
      await importRecords(records, { sourceId: source.id, sourceType: source.source_type, fieldMapping: source.field_mapping, reviewBeforePublish: source.review_before_publish });
      await query("UPDATE content_sources SET last_sync_at=now() WHERE id=$1", [source.id]);
    } catch (error) {
      await query("INSERT INTO import_logs (source_id, level, message, payload) VALUES ($1, 'ERROR', $2, $3)", [source.id, error.message, { job: "daily-sync" }]);
    }
  }
}, { timezone: "America/Fortaleza" });

app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || "Erro interno." });
});

const port = Number(process.env.PORT || 5050);
app.listen(port, "0.0.0.0", () => {
  console.log(`StreamBox API/Admin: http://localhost:${port}`);
  console.log(`Android emulator: http://10.0.2.2:${port}`);
});
