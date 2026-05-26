import { parse as parseCsv } from "csv-parse/sync";
import { query } from "./db/pool.js";
import { decryptSecret, fingerprint } from "./security.js";

const defaultMapping = {
  title: "title",
  description: "description",
  category: "category",
  year: "year",
  duration: "duration",
  poster_url: "posterUrl",
  banner_url: "bannerUrl",
  video_url: "videoUrl",
  stream_url: "streamUrl",
  logo_url: "logoUrl"
};

export function parseM3u(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith("#EXTINF")) continue;
    const attrs = Object.fromEntries([...lines[i].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    const streamUrl = lines[i + 1]?.startsWith("#") ? "" : lines[i + 1];
    if (!streamUrl) continue;
    items.push({
      type: "channel",
      name: attrs["tvg-name"] || lines[i].split(",").pop()?.trim() || "Canal",
      category: attrs["group-title"] || "Sem categoria",
      logoUrl: attrs["tvg-logo"] || "",
      streamUrl
    });
  }
  return items;
}

export function parseFileImport(buffer, mimetype, originalname) {
  const text = buffer.toString("utf8");
  const name = originalname.toLowerCase();
  if (name.endsWith(".m3u") || name.endsWith(".m3u8")) return parseM3u(text);
  if (name.endsWith(".csv") || mimetype.includes("csv")) return parseCsv(text, { columns: true, skip_empty_lines: true });
  return JSON.parse(text);
}

export function normalizeRecord(record, mapping = defaultMapping, forcedType = "all") {
  const get = (key) => record[mapping[key] || key] ?? record[key] ?? "";
  const hasChannelUrl = Boolean(get("stream_url"));
  const type = forcedType === "channels" || hasChannelUrl ? "channel" : "movie";
  if (type === "channel") {
    return {
      type,
      name: get("title") || get("name"),
      category: get("category") || "Sem categoria",
      logoUrl: get("logo_url"),
      streamUrl: get("stream_url")
    };
  }
  return {
    type,
    title: get("title"),
    description: get("description"),
    category: get("category") || "Sem categoria",
    year: Number(get("year")) || null,
    durationMinutes: Number(get("duration")) || null,
    posterUrl: get("poster_url"),
    bannerUrl: get("banner_url"),
    videoUrl: get("video_url")
  };
}

async function ensureCategory(name, type) {
  const result = await query(
    `INSERT INTO categories (name, type) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name || "Sem categoria", type]
  );
  return result.rows[0].id;
}

export async function importRecords(records, { sourceId = null, sourceType = "all", fieldMapping = {}, reviewBeforePublish = true } = {}) {
  const normalized = records.map((record) => normalizeRecord(record, { ...defaultMapping, ...fieldMapping }, sourceType));
  const status = reviewBeforePublish ? "DRAFT" : "ACTIVE";
  const report = { imported: 0, skipped: 0, invalid: 0 };

  for (const item of normalized) {
    try {
      if (item.type === "channel") {
        if (!item.name || !item.streamUrl) {
          report.invalid += 1;
          continue;
        }
        const categoryId = await ensureCategory(item.category, "CHANNEL");
        const fp = fingerprint("channel", item.name, item.streamUrl);
        const result = await query(
          `INSERT INTO channels (name, category_id, logo_url, stream_url, status, source_fingerprint)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (source_fingerprint) DO NOTHING`,
          [item.name, categoryId, item.logoUrl || null, item.streamUrl, status, fp]
        );
        report[result.rowCount ? "imported" : "skipped"] += 1;
      } else {
        if (!item.title || !item.videoUrl) {
          report.invalid += 1;
          continue;
        }
        const categoryId = await ensureCategory(item.category, "MOVIE");
        const fp = fingerprint("movie", item.title, item.videoUrl);
        const result = await query(
          `INSERT INTO movies (title, description, category_id, year, duration_minutes, poster_url, banner_url, video_url, status, source_fingerprint)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (source_fingerprint) DO NOTHING`,
          [item.title, item.description || "", categoryId, item.year, item.durationMinutes, item.posterUrl || null, item.bannerUrl || null, item.videoUrl, status, fp]
        );
        report[result.rowCount ? "imported" : "skipped"] += 1;
      }
    } catch {
      report.invalid += 1;
    }
  }

  if (sourceId) {
    await query("INSERT INTO import_logs (source_id, message, payload) VALUES ($1, $2, $3)", [
      sourceId,
      `Importacao concluida: ${report.imported} novos, ${report.skipped} duplicados, ${report.invalid} invalidos.`,
      report
    ]);
  }
  return report;
}

export async function fetchSource(source) {
  const headers = {};
  const token = decryptSecret(source.api_key_cipher);
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(source.api_url, { headers });
  if (!response.ok) throw new Error(`API respondeu ${response.status}`);
  return response.json();
}
