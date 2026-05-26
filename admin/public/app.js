let catalog;
let tab = "config";

const schema = {
  channels: ["id", "title", "category", "logoUrl", "description", "url", "type", "quality"],
  movies: ["id", "title", "category", "posterUrl", "backdropUrl", "description", "durationMinutes", "url", "type", "quality"],
  series: ["id", "title", "category", "posterUrl", "backdropUrl", "description", "seasons", "url", "type", "quality"],
  banners: ["id", "title", "subtitle", "imageUrl", "contentId", "contentType"],
  epg: ["id", "channelId", "title", "startsAt", "endsAt"]
};

const emptyItem = {
  channels: () => ({ id: crypto.randomUUID(), title: "", category: "", logoUrl: "", description: "", sources: [{ url: "", type: "HLS", quality: "Auto", licensed: true }] }),
  movies: () => ({ id: crypto.randomUUID(), title: "", category: "", posterUrl: "", backdropUrl: "", description: "", durationMinutes: 90, sources: [{ url: "", type: "MP4", quality: "1080p", licensed: true }] }),
  series: () => ({ id: crypto.randomUUID(), title: "", category: "", posterUrl: "", backdropUrl: "", description: "", seasons: 1, sources: [{ url: "", type: "MP4", quality: "1080p", licensed: true }] }),
  banners: () => ({ id: crypto.randomUUID(), title: "", subtitle: "", imageUrl: "", contentId: "", contentType: "MOVIE" }),
  epg: () => ({ id: crypto.randomUUID(), channelId: "", title: "", startsAt: "08:00", endsAt: "09:00" })
};

async function load() {
  catalog = await fetch("/catalog").then(r => r.json());
  document.querySelector("#status").textContent = "Online";
  render();
}

async function save() {
  await fetch("/catalog", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(catalog)
  });
  document.querySelector("#status").textContent = "Salvo";
  setTimeout(() => document.querySelector("#status").textContent = "Online", 1400);
}

function setValue(item, field, value) {
  if (["url", "type", "quality"].includes(field)) {
    item.sources ??= [{ url: "", type: "MP4", quality: "1080p", licensed: true }];
    item.sources[0][field] = value;
    return;
  }
  if (field === "durationMinutes" || field === "seasons") item[field] = Number(value || 0);
  else item[field] = value;
}

function getValue(item, field) {
  if (["url", "type", "quality"].includes(field)) return item.sources?.[0]?.[field] ?? "";
  return item[field] ?? "";
}

function renderConfig() {
  document.querySelector("#title").textContent = "Aparencia";
  const c = catalog.config;
  return `
    <div class="card">
      <img class="preview" src="${c.backgroundImageUrl || ""}" onerror="this.style.display='none'" />
      ${input("brandTitle", "Nome do app", c.brandTitle)}
      ${input("tagline", "Subtitulo", c.tagline)}
      ${input("backgroundImageUrl", "Imagem de fundo do app (URL)", c.backgroundImageUrl)}
      ${textarea("legalNotice", "Aviso legal", c.legalNotice)}
    </div>
  `;
}

function renderList() {
  const label = { channels: "Canais", movies: "Filmes", series: "Series", banners: "Banners", epg: "EPG" }[tab];
  document.querySelector("#title").textContent = label;
  const items = catalog[tab] ?? [];
  return `
    <button class="add" onclick="addItem()">+ Adicionar ${label}</button>
    <div class="grid">
      ${items.map((item, index) => card(item, index)).join("")}
    </div>
  `;
}

function card(item, index) {
  const img = item.logoUrl || item.posterUrl || item.backdropUrl || item.imageUrl || "";
  return `
    <article class="card">
      ${img ? `<img class="preview" src="${img}" />` : ""}
      ${schema[tab].map(field => input(field, field, getValue(item, field), index)).join("")}
      <div class="row">
        <button class="danger" onclick="removeItem(${index})">Remover</button>
      </div>
    </article>
  `;
}

function input(name, label, value, index = null) {
  const oninput = index === null
    ? `catalog.config.${name}=this.value`
    : `setValue(catalog.${tab}[${index}], '${name}', this.value)`;
  return `<label>${label}<input value="${escapeHtml(value)}" oninput="${oninput}" /></label>`;
}

function textarea(name, label, value) {
  return `<label>${label}<textarea oninput="catalog.config.${name}=this.value">${escapeHtml(value)}</textarea></label>`;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function addItem() {
  catalog[tab].unshift(emptyItem[tab]());
  render();
}

function removeItem(index) {
  catalog[tab].splice(index, 1);
  render();
}

function render() {
  document.querySelector("#editor").innerHTML = tab === "config" ? renderConfig() : renderList();
  document.querySelectorAll("aside button[data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
}

document.querySelectorAll("aside button[data-tab]").forEach(btn => {
  btn.addEventListener("click", () => {
    tab = btn.dataset.tab;
    render();
  });
});
document.querySelector("#saveAll").addEventListener("click", save);
document.querySelector("#importBrazil").addEventListener("click", async () => {
  document.querySelector("#status").textContent = "Importando...";
  const result = await fetch("/import/iptv-org/br", { method: "POST" }).then(r => r.json());
  if (result.error) {
    document.querySelector("#status").textContent = result.error;
    return;
  }
  catalog = await fetch("/catalog").then(r => r.json());
  tab = "channels";
  render();
  document.querySelector("#status").textContent = `Importados ${result.imported}`;
  setTimeout(() => document.querySelector("#status").textContent = "Online", 1800);
});
document.querySelector("#importVodDemo").addEventListener("click", async () => {
  document.querySelector("#status").textContent = "Importando demo...";
  const result = await fetch("/import/demo-vod-gist", { method: "POST" }).then(r => r.json());
  if (result.error) {
    document.querySelector("#status").textContent = result.error;
    return;
  }
  catalog = await fetch("/catalog").then(r => r.json());
  tab = "movies";
  render();
  document.querySelector("#status").textContent = `${result.importedMovies} filmes, ${result.importedSeries} series`;
  setTimeout(() => document.querySelector("#status").textContent = "Online", 2200);
});
load();
