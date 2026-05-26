import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "..", "data", "custom-embeds.json");

function firstSource(item) {
  return item.sources?.[0]?.url || "";
}

async function categoryIdFor(name) {
  const categoryName = String(name || "Filmes").trim() || "Filmes";
  const result = await query(
    `INSERT INTO categories (name, type, active)
     VALUES ($1, 'MOVIE', true)
     ON CONFLICT (name) DO UPDATE SET active = true
     RETURNING id`,
    [categoryName]
  );
  return result.rows[0].id;
}

const raw = await fs.readFile(dataPath, "utf8");
const data = JSON.parse(raw);
const movies = Array.isArray(data.movies) ? data.movies : [];
const categoryCache = new Map();

function asDbMovie(movie, categoryId) {
  const videoUrl = firstSource(movie);
  const fingerprint = movie.id || `local-${movie.title}-${videoUrl}`;
  return [
    movie.title,
    movie.description || "",
    categoryId,
    movie.year || null,
    movie.durationMinutes || null,
    movie.posterUrl || "",
    movie.bannerUrl || movie.backdropUrl || "",
    videoUrl,
    movie.status || "DRAFT",
    fingerprint
  ];
}

async function cachedCategoryIdFor(name) {
  const categoryName = String(name || "Filmes").trim() || "Filmes";
  if (categoryCache.has(categoryName)) {
    return categoryCache.get(categoryName);
  }

  const id = await categoryIdFor(categoryName);
  categoryCache.set(categoryName, id);
  return id;
}

async function upsertMovieBatch(rows) {
  if (!rows.length) {
    return;
  }

  const columnsPerRow = 10;
  const values = rows.flat();
  const placeholders = rows
    .map((_, rowIndex) => {
      const base = rowIndex * columnsPerRow;
      return `(${Array.from({ length: columnsPerRow }, (_value, index) => `$${base + index + 1}`).join(",")})`;
    })
    .join(",");

  await query(
    `INSERT INTO movies (
      title, description, category_id, year, duration_minutes,
      poster_url, banner_url, video_url, status, source_fingerprint
    )
    VALUES ${placeholders}
    ON CONFLICT (source_fingerprint) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      category_id = EXCLUDED.category_id,
      year = EXCLUDED.year,
      duration_minutes = EXCLUDED.duration_minutes,
      poster_url = EXCLUDED.poster_url,
      banner_url = EXCLUDED.banner_url,
      video_url = EXCLUDED.video_url,
      status = EXCLUDED.status,
      updated_at = now()`,
    values
  );
}

let imported = 0;
let skipped = 0;
let batch = [];

for (const movie of movies) {
  const videoUrl = firstSource(movie);
  if (!movie.title || !videoUrl) {
    skipped += 1;
    continue;
  }

  const categoryId = await cachedCategoryIdFor(movie.category);
  batch.push(asDbMovie(movie, categoryId));
  imported += 1;

  if (batch.length >= 250) {
    await upsertMovieBatch(batch);
    batch = [];
    console.log(`${imported} filmes processados...`);
  }
}

await upsertMovieBatch(batch);
await pool.end();
console.log(`Importacao concluida. Filmes importados/atualizados: ${imported}. Ignorados: ${skipped}.`);
