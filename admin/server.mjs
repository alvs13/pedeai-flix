import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "catalog.json");
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 5050);
const iptvOrgBrazilUrl = "https://iptv-org.github.io/iptv/countries/br.m3u";
const demoMovieM3uUrl = "https://gist.githubusercontent.com/tricolorpaulista/aab8e2f3e7d146752ac81870f26f4722/raw/Cinema.m3u";
const safeDemoVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type"
};

async function readCatalog() {
  return JSON.parse(await readFile(catalogPath, "utf8"));
}

async function saveCatalog(catalog) {
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2), "utf8");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function parseAttributes(line) {
  const attrs = {};
  const pattern = /([\w-]+)="([^"]*)"/g;
  let match;
  while ((match = pattern.exec(line))) attrs[match[1]] = match[2];
  return attrs;
}

function parseM3uChannels(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const channels = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("#EXTINF")) continue;
    const attrs = parseAttributes(line);
    const title = line.split(",").pop()?.trim() || attrs["tvg-name"] || "Canal";
    const url = lines[i + 1]?.startsWith("#") ? "" : lines[i + 1];
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const idSeed = attrs["tvg-id"] || title;
    const id = `iptvorg-${idSeed}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    channels.push({
      id,
      title: attrs["tvg-name"] || title,
      category: attrs["group-title"] || "Brasil",
      logoUrl: attrs["tvg-logo"] || "",
      description: "Canal importado da lista publica iptv-org. Confirme a autorizacao antes de uso comercial.",
      sources: [
        {
          url,
          type: url.includes(".m3u8") ? "HLS" : "STREAM",
          quality: "Auto",
          licensed: true
        }
      ]
    });
  }
  return channels;
}

function parseM3uVodAsDemo(text, limit = 600) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const items = [];
  for (let i = 0; i < lines.length && items.length < limit; i++) {
    const line = lines[i];
    if (!line.startsWith("#EXTINF")) continue;
    const attrs = parseAttributes(line);
    const title = line.split(",").pop()?.trim() || attrs["tvg-name"] || "Titulo";
    const group = attrs["group-title"] || "Filmes";
    const subgroup = attrs["pltv-subgroup"] || "";
    const sourceUrl = lines[i + 1]?.startsWith("#") ? "" : lines[i + 1];
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) continue;

    const type = group.toLowerCase().includes("seriado") || title.match(/\bT\d+\|?EP\d+/i) ? "series" : "movies";
    const id = `demo-${type}-${title}-${subgroup}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90);

    const base = {
      id,
      title,
      category: subgroup || group || (type === "series" ? "Series" : "Filmes"),
      description: "Item importado em modo demonstracao. O link original nao foi salvo; use apenas fontes licenciadas.",
      sources: [{ url: safeDemoVideoUrl, type: "MP4", quality: "Demo", licensed: true }]
    };

    if (type === "series") {
      items.push({
        type,
        item: {
          ...base,
          posterUrl: attrs["tvg-logo"] || "",
          backdropUrl: attrs["tvg-logo"] || "",
          seasons: 1
        }
      });
    } else {
      items.push({
        type,
        item: {
          ...base,
          posterUrl: attrs["tvg-logo"] || "",
          backdropUrl: attrs["tvg-logo"] || "",
          durationMinutes: 0
        }
      });
    }
  }
  return items;
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, jsonHeaders);
  res.end(JSON.stringify(data));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  const contentType = ext === ".css" ? "text/css" : ext === ".js" ? "text/javascript" : "text/html";
  res.writeHead(200, { "content-type": `${contentType}; charset=utf-8` });
  res.end(await readFile(filePath));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return sendJson(res, {});
    const url = new URL(req.url, `http://localhost:${port}`);
    const route = url.pathname.replace(/^\/+/, "");

    if (req.method === "GET" && ["config", "channels", "movies", "series", "banners", "epg"].includes(route)) {
      const catalog = await readCatalog();
      return sendJson(res, catalog[route] ?? []);
    }

    if (req.method === "GET" && route === "catalog") {
      return sendJson(res, await readCatalog());
    }

    if (req.method === "PUT" && route === "catalog") {
      const catalog = await readBody(req);
      await saveCatalog(catalog);
      return sendJson(res, { ok: true });
    }

    if (req.method === "PUT" && ["config", "channels", "movies", "series", "banners", "epg"].includes(route)) {
      const catalog = await readCatalog();
      catalog[route] = await readBody(req);
      await saveCatalog(catalog);
      return sendJson(res, { ok: true });
    }

    if (req.method === "POST" && route === "import/iptv-org/br") {
      const response = await fetch(iptvOrgBrazilUrl);
      if (!response.ok) throw new Error(`Falha ao baixar iptv-org: ${response.status}`);
      const imported = parseM3uChannels(await response.text());
      const catalog = await readCatalog();
      const existing = new Set((catalog.channels ?? []).map(channel => channel.id));
      const fresh = imported.filter(channel => !existing.has(channel.id));
      catalog.channels = [...fresh, ...(catalog.channels ?? [])];
      await saveCatalog(catalog);
      return sendJson(res, {
        ok: true,
        source: iptvOrgBrazilUrl,
        imported: fresh.length,
        skipped: imported.length - fresh.length,
        total: catalog.channels.length
      });
    }

    if (req.method === "POST" && route === "import/demo-vod-gist") {
      const response = await fetch(demoMovieM3uUrl);
      if (!response.ok) throw new Error(`Falha ao baixar M3U demo: ${response.status}`);
      const imported = parseM3uVodAsDemo(await response.text());
      const catalog = await readCatalog();
      const existingMovies = new Set((catalog.movies ?? []).map(item => item.id));
      const existingSeries = new Set((catalog.series ?? []).map(item => item.id));
      const movies = imported.filter(entry => entry.type === "movies").map(entry => entry.item).filter(item => !existingMovies.has(item.id));
      const series = imported.filter(entry => entry.type === "series").map(entry => entry.item).filter(item => !existingSeries.has(item.id));
      catalog.movies = [...movies, ...(catalog.movies ?? [])];
      catalog.series = [...series, ...(catalog.series ?? [])];
      await saveCatalog(catalog);
      return sendJson(res, {
        ok: true,
        mode: "demo",
        note: "Links originais nao foram salvos. Todos os itens usam video demo seguro.",
        importedMovies: movies.length,
        importedSeries: series.length,
        totalMovies: catalog.movies.length,
        totalSeries: catalog.series.length
      });
    }

    if (req.method === "POST" && ["favorites", "history"].includes(route)) {
      return sendJson(res, { ok: true });
    }

    return serveStatic(req, res);
  } catch (error) {
    sendJson(res, { error: error.message }, 500);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`StreamBox Admin: http://localhost:${port}`);
  console.log(`Android emulator API: http://10.0.2.2:${port}`);
});
