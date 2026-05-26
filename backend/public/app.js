const state = {
  token: localStorage.getItem("streambox_admin_token"),
  view: "dashboard",
  categories: [],
  adminFilters: {},
  adminContentItems: {},
  fileRecords: []
};

const $ = (selector) => document.querySelector(selector);
const api = async (url, options = {}) => {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na requisicao.");
  return data;
};

function icon() { window.lucide?.createIcons(); }
function setStatus(text) { $("#status").textContent = text; }
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}
function jsArg(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("#email").value, password: $("#password").value })
    });
    state.token = result.token;
    localStorage.setItem("streambox_admin_token", state.token);
    boot();
  } catch (error) {
    $("#loginError").textContent = error.message;
  }
});

$("#logout").addEventListener("click", () => {
  localStorage.removeItem("streambox_admin_token");
  state.token = null;
  $("#login").classList.remove("hidden");
  $("#app").classList.add("hidden");
});

window.setAdminView = (view, button = null) => {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button || item.dataset.view === view));
  render();
};

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => window.setAdminView(button.dataset.view, button));
});

async function boot() {
  if (!state.token) return;
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  const viewFromUrl = new URLSearchParams(location.search).get("view");
  if (viewFromUrl && views[viewFromUrl]) state.view = viewFromUrl;
  await refreshCategories();
  await render();
  icon();
}

async function refreshCategories() {
  state.categories = await api("/api/admin/categories");
}

async function render() {
  const title = {
    dashboard: "Dashboard",
    movies: "Filmes",
    channels: "Canais ao vivo",
    categories: "Categorias",
    sources: "Fontes de Conteudo",
    embedmovies: "EmbedMovies",
    files: "Importar arquivo",
    users: "Usuarios",
    logs: "Logs de importacao"
  }[state.view];
  $("#viewTitle").textContent = title;
  setStatus("Carregando...");
  try {
    await views[state.view]();
    setStatus("Online");
    icon();
  } catch (error) {
    $("#content").innerHTML = `<div class="card">${escapeHtml(error.message)}</div>`;
    setStatus("Erro");
  }
}

const categoryOptions = (selected) => state.categories
  .filter((cat) => cat.active)
  .map((cat) => `<option value="${cat.id}" ${selected === cat.id ? "selected" : ""}>${escapeHtml(cat.name)} (${cat.type})</option>`)
  .join("");

const statusOptions = (selected = "DRAFT") => ["DRAFT", "ACTIVE", "INACTIVE"]
  .map((status) => `<option value="${status}" ${selected === status ? "selected" : ""}>${status}</option>`)
  .join("");

const views = {
  dashboard: async () => {
    const data = await api("/api/admin/dashboard");
    $("#content").innerHTML = `
      <div class="stats">
        ${stat("Filmes", data.movies, "clapperboard")}
        ${stat("Canais", data.channels, "tv")}
        ${stat("Usuarios", data.users, "users")}
        ${stat("Fontes", data.sources, "database-zap")}
        ${stat("Em revisao", data.drafts, "eye")}
      </div>
    `;
  },
  movies: async () => crudContent("movies", await api("/api/admin/movies")),
  channels: async () => crudContent("channels", await api("/api/admin/channels")),
  categories: async () => {
    await refreshCategories();
    $("#content").innerHTML = `
      <div class="toolbar">
        <button onclick="categoryForm()"><i data-lucide="plus"></i> Nova categoria</button>
      </div>
      <div id="form"></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nome</th><th>Tipo</th><th>Conteudos</th><th>Status</th><th>Acoes</th></tr></thead>
        <tbody>${state.categories.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${item.type}</td>
            <td>${categoryCountLabel(item)}</td>
            <td>${item.active ? "Ativa" : "Inativa"}</td>
            <td class="actions">
              <button class="mini" onclick="categoryFormById('${item.id}')"><i data-lucide="pencil"></i> Renomear</button>
              <button class="mini danger" onclick="deleteCategoryById('${item.id}')"><i data-lucide="trash-2"></i> Excluir categoria</button>
            </td>
          </tr>
        `).join("")}</tbody>
      </table></div>`;
  },
  sources: async () => {
    const sources = await api("/api/admin/sources");
    $("#content").innerHTML = `
      <div class="toolbar"><button onclick="sourceForm()"><i data-lucide="plus"></i> Nova fonte</button></div>
      <div id="form"></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nome</th><th>Tipo</th><th>Status</th><th>Ultima sync</th><th></th></tr></thead>
        <tbody>${sources.map((item) => `
          <tr>
            <td>${escapeHtml(item.name)}<br><small>${escapeHtml(item.api_url)}</small></td>
            <td>${item.source_type}</td><td>${item.active ? "Ativa" : "Inativa"}</td><td>${item.last_sync_at || "-"}</td>
            <td>
              <button class="mini" onclick='sourceForm(${JSON.stringify(item)})'>Editar</button>
              <button class="mini" onclick="testSource('${item.id}')">Testar</button>
              <button class="mini accent" onclick="syncSource('${item.id}')">Sincronizar</button>
              <button class="mini danger" onclick="deleteItem('sources','${item.id}')">Excluir</button>
            </td>
          </tr>`).join("")}</tbody>
      </table></div>`;
  },
  embedmovies: async () => {
    const info = await api("/api/admin/embed-providers/embedmovies/template");
    $("#content").innerHTML = `
      <div class="card">
        <h2>Provedor EmbedMovies</h2>
        <p>Digite o ID, busque os dados e adicione o filme ou serie direto ao catalogo do app.</p>
        <p>Status: <span class="badge ${info.enabled ? "ACTIVE" : "INACTIVE"}">${info.enabled ? "Ativo" : "Desativado no .env"}</span></p>
        <p>Imagens reais TMDb: <span class="badge ${info.tmdbConfigured ? "ACTIVE" : "DRAFT"}">${info.tmdbConfigured ? "Configurado" : "Nao configurado"}</span></p>
        <div class="form-grid tmdb-settings">
          <label class="wide">Chave TMDb para capas e banners reais
            <input id="tmdbApiKey" type="password" placeholder="${info.tmdbConfigured ? "Chave ja configurada no backend" : "Cole API Key v3 ou Read Access Token v4"}" autocomplete="off" />
          </label>
          <div class="toolbar" style="align-self:end"><button class="mini" type="button" onclick="saveTmdbKey()">Salvar chave TMDb</button></div>
        </div>
        <form class="form-grid" onsubmit="buildEmbedMovies(event)">
          <label>Tipo
            <select name="contentType">
              <option value="movie">Filme</option>
              <option value="series">Serie completa</option>
              <option value="episode">Episodio especifico</option>
            </select>
          </label>
          <label>ID TMDb, IMDb ou URL IMDb<input name="externalId" placeholder="550, tt0137523 ou https://www.imdb.com/title/tt0137523/" required /></label>
          <div class="toolbar" style="align-self:end"><button class="mini accent" type="button" onclick="fetchEmbedMoviesMetadata(this.form)">Buscar pelo ID</button></div>
          <label>Titulo<input name="title" placeholder="Nome do filme ou serie" required /></label>
          <label>Categoria<input name="category" placeholder="Acao, Drama, Series..." value="EmbedMovies" required /></label>
          <label>Ano<input name="year" type="number" placeholder="2026" /></label>
          <label>Duracao<input name="durationMinutes" type="number" placeholder="90" /></label>
          <label class="wide">Capa / Logo<input name="posterUrl" placeholder="https://.../poster.jpg" /></label>
          <label class="wide">Banner<input name="bannerUrl" placeholder="https://.../banner.jpg" /></label>
          <label class="wide">Sinopse<textarea name="description" placeholder="Descricao do conteudo"></textarea></label>
          <label>Temporada<input name="seasonNumber" type="number" min="1" placeholder="Apenas episodio" /></label>
          <label>Episodio<input name="episodeNumber" type="number" min="1" placeholder="Apenas episodio" /></label>
          <label>Status<select name="status">${statusOptions("ACTIVE")}</select></label>
          <div class="wide toolbar"><button class="mini">Gerar iframe</button><button class="mini accent" type="button" onclick="publishEmbedMovies(this.form)">Gerar e adicionar ao app</button></div>
        </form>
      </div>
      <div class="card">
        <h2>Importar EmbedMovies em lote</h2>
        <p>Cole varios IDs IMDb/TMDb ou URLs IMDb, um por linha. O painel busca metadados, gera o embed e adiciona ao catalogo.</p>
        <form class="form-grid" onsubmit="publishEmbedMoviesBatch(event)">
          <label>Tipo
            <select name="contentType">
              <option value="movie">Filmes</option>
              <option value="series">Series</option>
            </select>
          </label>
          <label>Status<select name="status">${statusOptions("ACTIVE")}</select></label>
          <label class="wide">IDs ou URLs
            <textarea name="ids" rows="9" placeholder="tt29552248&#10;tt32612507&#10;https://www.imdb.com/title/tt36042156/" required></textarea>
          </label>
          <div class="wide toolbar"><button class="mini accent">Importar lote</button></div>
        </form>
        <div id="embedBatchResult"></div>
      </div>
      <div class="card">
        <h2>Importar por produtoras TMDb</h2>
        <p>Use IDs da coluna <code>id</code> do arquivo companies.csv. Exemplo: 1 Lucasfilm, 2 Disney, 3 Pixar, 4 Paramount.</p>
        <form class="form-grid" onsubmit="importTmdbCompanies(event)">
          <label class="wide">IDs de empresas
            <textarea name="companyIds" rows="5" placeholder="1&#10;2&#10;3"></textarea>
          </label>
          <label>Paginas por empresa
            <input name="pagesPerCompany" type="number" min="1" max="5" value="1" />
          </label>
          <label>Status<select name="status">${statusOptions("DRAFT")}</select></label>
          <div class="wide toolbar"><button class="mini accent">Buscar e adicionar</button></div>
        </form>
        <div id="tmdbCompanyResult"></div>
      </div>
      <div id="embedResult"></div>`;
  },
  files: async () => {
    $("#content").innerHTML = `
      <div class="card">
        <h2>Importacao por CSV, JSON ou M3U</h2>
        <p>Use apenas arquivos proprios ou licenciados. A pre-visualizacao aparece antes de salvar.</p>
        <label>Arquivo<input id="importFile" type="file" accept=".csv,.json,.m3u,.m3u8,application/json,text/csv" /></label>
        <label>Tipo<select id="fileType"><option value="all">Detectar</option><option value="movies">Filmes</option><option value="channels">Canais</option></select></label>
        <label><input id="reviewBeforePublish" type="checkbox" checked /> Revisar antes de publicar</label>
        <button class="mini accent" onclick="previewFile()">Pre-visualizar</button>
      </div>
      <div id="filePreview"></div>`;
  },
  users: async () => {
    const users = await api("/api/admin/users");
    $("#content").innerHTML = `
    <div class="toolbar"><button onclick="userForm()"><i data-lucide="plus"></i> Novo usuario</button></div>
    <div id="form"></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
      <tbody>${users.map((user) => `<tr><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.email)}</td><td>${user.role}</td><td>${user.status}</td><td><button class="mini" onclick='userForm(${JSON.stringify(user)})'>Editar</button><button class="mini danger" onclick="deleteItem('users','${user.id}')">Excluir</button></td></tr>`).join("")}</tbody>
    </table></div>`;
  },
  logs: async () => {
    const logs = await api("/api/admin/import-logs");
    $("#content").innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Fonte</th><th>Nivel</th><th>Mensagem</th></tr></thead>
      <tbody>${logs.map((log) => `<tr><td>${log.created_at}</td><td>${escapeHtml(log.source_name || "-")}</td><td>${log.level}</td><td>${escapeHtml(log.message)}</td></tr>`).join("")}</tbody>
    </table></div>`;
  }
};

function stat(label, value, iconName) {
  return `<article class="stat"><i data-lucide="${iconName}"></i><span>${label}</span><strong>${value}</strong></article>`;
}

function categoryCountLabel(item) {
  const movies = Number(item.movie_count || item.movieCount || 0);
  const channels = Number(item.channel_count || item.channelCount || 0);
  const series = Number(item.series_count || item.seriesCount || 0);
  const parts = [];
  if (movies) parts.push(`${movies} filmes`);
  if (channels) parts.push(`${channels} canais`);
  if (series) parts.push(`${series} series`);
  return parts.length ? parts.join(" / ") : "Sem conteudo";
}

function categoryDeleteWarning(item) {
  const count = categoryCountLabel(item);
  if (count === "Sem conteudo") return "Essa categoria sera removida.";
  return `Essa categoria sera removida, mas os conteudos ficam salvos e passam para Sem categoria. Conteudos ligados: ${count}.`;
}

function crudContent(type, items) {
  const isMovie = type === "movies";
  const title = isMovie ? "filme" : "canal";
  state.adminContentItems[type] = items;
  const term = state.adminFilters[type] || "";
  $("#content").innerHTML = `
    <div class="toolbar">
      <button onclick="contentForm('${type}')"><i data-lucide="plus"></i> ${isMovie ? "Novo filme" : "Novo canal"}</button>
      <input class="admin-search" value="${escapeHtml(term)}" placeholder="Buscar por nome, categoria ou URL" oninput="setAdminContentFilter('${type}', this.value)" />
      <span id="adminCount" class="table-count"></span>
    </div>
    <div id="form"></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Midia</th><th>Categoria</th><th>Status</th><th>URL</th><th>Acoes</th></tr></thead>
      <tbody id="adminRows"></tbody>
    </table></div>`;
  renderAdminContentRows(type);
}

function contentSearchText(item) {
  return [item.title, item.name, item.category, item.sources?.[0]?.url].join(" ").toLowerCase();
}

function adminContentRow(type, item) {
  const isMovie = type === "movies";
  const title = isMovie ? "filme" : "canal";
  return `
    <tr>
      <td><img class="poster" src="${item.posterUrl || item.logoUrl || item.bannerUrl || ""}" onerror="this.style.visibility='hidden'" /> ${escapeHtml(item.title || item.name)}</td>
      <td>${escapeHtml(item.category)}</td><td><span class="badge ${item.status}">${item.status}</span></td>
      <td>${escapeHtml(item.sources?.[0]?.url || "")}</td>
      <td class="actions">
        <button class="mini" onclick="contentFormById('${type}', '${item.id}')"><i data-lucide="pencil"></i> Editar ${title}</button>
        <button class="mini danger" onclick="deleteContentById('${type}', '${item.id}')"><i data-lucide="trash-2"></i> Excluir ${title}</button>
      </td>
    </tr>`;
}

function renderAdminContentRows(type) {
  const items = state.adminContentItems[type] || [];
  const term = (state.adminFilters[type] || "").trim().toLowerCase();
  const filtered = term ? items.filter((item) => contentSearchText(item).includes(term)) : items;
  const visible = filtered.slice(0, 300);
  const label = type === "movies" ? "filmes" : "canais";
  const suffix = filtered.length > visible.length ? `, mostrando os primeiros ${visible.length}` : "";
  $("#adminRows").innerHTML = visible.map((item) => adminContentRow(type, item)).join("");
  $("#adminCount").textContent = `${filtered.length} ${label} encontrados${suffix}`;
  icon();
}

window.setAdminContentFilter = (type, value = "") => {
  state.adminFilters[type] = value;
  renderAdminContentRows(type);
};

window.contentFormById = (type, id) => {
  const item = (state.adminContentItems[type] || []).find((entry) => entry.id === id);
  contentForm(type, item || {});
};

window.categoryFormById = (id) => {
  const item = state.categories.find((entry) => entry.id === id);
  categoryForm(item || {});
};

window.deleteContentById = (type, id) => {
  const item = (state.adminContentItems[type] || []).find((entry) => entry.id === id);
  deleteItem(type, id, item?.title || item?.name || "este item");
};

window.deleteCategoryById = (id) => {
  const item = state.categories.find((entry) => entry.id === id);
  deleteItem("categories", id, item?.name || "esta categoria", item ? categoryDeleteWarning(item) : "");
};

window.contentForm = (type, item = {}) => {
  const isMovie = type === "movies";
  $("#form").innerHTML = `<form class="card form-grid" onsubmit="saveContent(event,'${type}','${item.id || ""}')">
    <label>${isMovie ? "Titulo" : "Nome"}<input name="${isMovie ? "title" : "name"}" value="${escapeHtml(item.title || item.name || "")}" required /></label>
    <label>Categoria<select name="categoryId"><option value="">Sem categoria</option>${categoryOptions(item.categoryId)}</select></label>
    ${isMovie ? `
      <label>Ano<input name="year" type="number" value="${item.year || ""}" /></label>
      <label>Duracao<input name="durationMinutes" type="number" value="${item.durationMinutes || ""}" /></label>
      <label>Capa<input name="posterUrl" value="${escapeHtml(item.posterUrl || "")}" /></label>
      <label>Banner<input name="bannerUrl" value="${escapeHtml(item.bannerUrl || "")}" /></label>
      <label class="wide">Sinopse<textarea name="description">${escapeHtml(item.description || "")}</textarea></label>
      <label class="wide">URL do video<input name="videoUrl" value="${escapeHtml(item.sources?.[0]?.url || "")}" required /></label>` : `
      <label>Logo<input name="logoUrl" value="${escapeHtml(item.logoUrl || "")}" /></label>
      <label>URL .m3u8<input name="streamUrl" value="${escapeHtml(item.sources?.[0]?.url || "")}" required /></label>`}
    <label>Status<select name="status">${statusOptions(item.status)}</select></label>
    <div class="wide toolbar"><button class="mini accent">Salvar</button></div>
  </form>`;
  icon();
};

window.saveContent = async (event, type, id) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target).entries());
  await api(`/api/admin/${type}${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
  render();
};

window.categoryForm = (item = {}) => {
  $("#form").innerHTML = `<form class="card form-grid" onsubmit="saveCategory(event,'${item.id || ""}')">
    <h2 class="wide">${item.id ? "Editar categoria" : "Nova categoria"}</h2>
    <label>Nome<input name="name" value="${escapeHtml(item.name || "")}" required /></label>
    <label>Tipo<select name="type">${["MOVIE","CHANNEL","SERIES","ALL"].map((t) => `<option ${item.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label><input type="checkbox" name="active" ${item.active !== false ? "checked" : ""} /> Ativa</label>
    <div class="wide toolbar"><button class="mini accent">${item.id ? "Salvar alteracoes" : "Criar categoria"}</button></div>
  </form>`;
};

window.saveCategory = async (event, id) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const body = { name: data.get("name"), type: data.get("type"), active: data.get("active") === "on" };
  await api(`/api/admin/categories${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
  await refreshCategories();
  render();
};

window.sourceForm = (item = {}) => {
  $("#form").innerHTML = `<form class="card form-grid" onsubmit="saveSource(event,'${item.id || ""}')">
    <label>Nome da fonte<input name="name" value="${escapeHtml(item.name || "")}" required /></label>
    <label>Tipo<select name="sourceType">${["movies","channels","series","all"].map((t) => `<option value="${t}" ${item.source_type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="wide">URL da API<input name="apiUrl" value="${escapeHtml(item.api_url || "")}" required /></label>
    <label>Token/API Key<input name="apiKey" placeholder="${item.id ? "Deixe vazio para manter" : ""}" /></label>
    <label><input type="checkbox" name="active" ${item.active !== false ? "checked" : ""} /> Ativa</label>
    <label><input type="checkbox" name="reviewBeforePublish" ${item.review_before_publish !== false ? "checked" : ""} /> Revisar antes de publicar</label>
    <label class="wide">Mapeamento JSON<textarea name="fieldMapping">${escapeHtml(JSON.stringify(item.field_mapping || {
      title: "title", description: "description", category: "category", year: "year", duration: "duration",
      poster_url: "poster_url", banner_url: "banner_url", video_url: "video_url", stream_url: "stream_url", logo_url: "logo_url"
    }, null, 2))}</textarea></label>
    <div class="wide toolbar"><button class="mini accent">Salvar fonte</button></div>
  </form>`;
};

window.saveSource = async (event, id) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const body = {
    name: data.get("name"),
    apiUrl: data.get("apiUrl"),
    apiKey: data.get("apiKey"),
    sourceType: data.get("sourceType"),
    active: data.get("active") === "on",
    reviewBeforePublish: data.get("reviewBeforePublish") === "on",
    fieldMapping: JSON.parse(data.get("fieldMapping") || "{}")
  };
  await api(`/api/admin/sources${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
  render();
};

window.buildEmbedMovies = async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const body = {
        contentType: data.get("contentType"),
        id: data.get("externalId"),
    seasonNumber: data.get("seasonNumber") || undefined,
    episodeNumber: data.get("episodeNumber") || undefined,
    licenseConfirmed: true
  };
  const target = $("#embedResult");
  try {
    const result = await api("/api/admin/embed-providers/embedmovies/build", {
      method: "POST",
      body: JSON.stringify(body)
    });
    target.innerHTML = `<div class="card"><h2>Iframe gerado</h2><label>URL<input value="${escapeHtml(result.embedUrl)}" readonly /></label><label>Iframe<textarea readonly>${escapeHtml(result.iframe)}</textarea></label><p>${escapeHtml(result.legalNotice)}</p></div>`;
  } catch (error) {
    target.innerHTML = `<div class="card"><h2>Integração bloqueada</h2><p>${escapeHtml(error.message)}</p><p>Ative somente em ambiente autorizado com <code>ALLOW_EXTERNAL_EMBEDS=true</code>.</p></div>`;
  }
};

window.fetchEmbedMoviesMetadata = async (form) => {
  const target = $("#embedResult");
  const data = new FormData(form);
  const setField = (name, value) => {
    const field = form.elements.namedItem(name);
    if (field && value !== undefined && value !== null && String(value).trim() !== "") {
      field.value = value;
    }
  };
  try {
    const meta = await api("/api/admin/embed-providers/embedmovies/metadata", {
      method: "POST",
      body: JSON.stringify({
        contentType: data.get("contentType"),
        id: data.get("externalId")
      })
    });
    setField("title", meta.title);
    setField("description", meta.description);
    setField("category", meta.category);
    setField("year", meta.year);
    setField("durationMinutes", meta.durationMinutes);
    setField("posterUrl", meta.posterUrl);
    setField("bannerUrl", meta.bannerUrl);
    setField("externalId", meta.embedId);
    target.innerHTML = `<div class="card"><h2>Campos preenchidos</h2><p>${escapeHtml(meta.notice || "Revise as informacoes e clique em Gerar e adicionar ao app.")}</p></div>`;
  } catch (error) {
    target.innerHTML = `<div class="card"><h2>Nao encontrei metadados</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
};

window.saveTmdbKey = async () => {
  const target = $("#embedResult");
  const input = $("#tmdbApiKey");
  try {
    await api("/api/admin/settings/tmdb", {
      method: "POST",
      body: JSON.stringify({ apiKey: input.value.trim() })
    });
    input.value = "";
    target.innerHTML = `<div class="card"><h2>TMDb configurado</h2><p>Agora clique em Buscar pelo ID para preencher capas e banners reais pelo TMDb.</p></div>`;
    render();
  } catch (error) {
    target.innerHTML = `<div class="card"><h2>Nao foi possivel salvar a chave</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
};

function embedMoviesBody(form) {
  const data = new FormData(form);
  return {
    contentType: data.get("contentType"),
    id: data.get("externalId"),
    title: data.get("title"),
    description: data.get("description") || "Conteudo externo autorizado cadastrado pelo administrador.",
    category: data.get("category") || "EmbedMovies",
    year: data.get("year") || undefined,
    durationMinutes: data.get("durationMinutes") || undefined,
    posterUrl: data.get("posterUrl") || "",
    bannerUrl: data.get("bannerUrl") || "",
    seasonNumber: data.get("seasonNumber") || undefined,
    episodeNumber: data.get("episodeNumber") || undefined,
    status: data.get("status") || "ACTIVE",
    licenseConfirmed: true
  };
}

window.publishEmbedMovies = async (form) => {
  const target = $("#embedResult");
  try {
    const result = await api("/api/admin/embed-providers/embedmovies/publish", {
      method: "POST",
      body: JSON.stringify(embedMoviesBody(form))
    });
    target.innerHTML = `<div class="card"><h2>Adicionado ao app</h2><p>${escapeHtml(result.item.title)} foi adicionado como ${escapeHtml(result.contentType)}.</p><p>Abra <a href="/app" target="_blank">/app</a> para ver no catalogo.</p></div>`;
  } catch (error) {
    target.innerHTML = `<div class="card"><h2>Nao foi possivel adicionar</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
};

function parseEmbedBatchIds(value = "") {
  return [...new Set(String(value)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean))];
}

function batchRow(result) {
  const status = result.ok ? "ACTIVE" : "INACTIVE";
  const label = result.ok ? (result.updated ? "Atualizado" : "Adicionado") : "Erro";
  return `<tr>
    <td>${escapeHtml(result.id)}</td>
    <td>${escapeHtml(result.title || "-")}</td>
    <td><span class="badge ${status}">${label}</span></td>
    <td>${escapeHtml(result.message || "")}</td>
  </tr>`;
}

window.publishEmbedMoviesBatch = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const target = $("#embedBatchResult");
  const data = new FormData(form);
  const ids = parseEmbedBatchIds(data.get("ids"));
  const contentType = data.get("contentType");
  const status = data.get("status") || "ACTIVE";

  if (!ids.length) {
    target.innerHTML = `<div class="card"><p>Informe pelo menos um ID ou URL.</p></div>`;
    return;
  }

  const submit = form.querySelector("button");
  submit.disabled = true;
  const results = [];
  target.innerHTML = `<div class="card"><h2>Importando lote</h2><p>0 de ${ids.length} processados...</p></div>`;

  for (const [index, rawId] of ids.entries()) {
    try {
      target.innerHTML = `<div class="card"><h2>Importando lote</h2><p>${index + 1} de ${ids.length}: ${escapeHtml(rawId)}</p></div>`;
      const meta = await api("/api/admin/embed-providers/embedmovies/metadata", {
        method: "POST",
        body: JSON.stringify({ contentType, id: rawId })
      });
      const publishBody = {
        contentType,
        id: meta.embedId || rawId,
        title: meta.title || `${contentType === "movie" ? "Filme" : "Serie"} ${rawId}`,
        description: meta.description || "Conteudo externo autorizado cadastrado pelo administrador.",
        category: meta.category || "EmbedMovies",
        year: meta.year || undefined,
        durationMinutes: meta.durationMinutes || undefined,
        posterUrl: meta.posterUrl || "",
        bannerUrl: meta.bannerUrl || "",
        status,
        licenseConfirmed: true
      };
      const published = await api("/api/admin/embed-providers/embedmovies/publish", {
        method: "POST",
        body: JSON.stringify(publishBody)
      });
      results.push({
        ok: true,
        id: rawId,
        title: published.item?.title || publishBody.title,
        updated: published.updated,
        message: published.updated ? "Ja existia e foi atualizado." : "Publicado no catalogo."
      });
    } catch (error) {
      results.push({ ok: false, id: rawId, title: "", message: error.message });
    }
  }

  submit.disabled = false;
  const successCount = results.filter((item) => item.ok).length;
  target.innerHTML = `<div class="card">
    <h2>Resultado do lote</h2>
    <p>${successCount} de ${results.length} itens adicionados ou atualizados.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Titulo</th><th>Status</th><th>Detalhe</th></tr></thead>
      <tbody>${results.map(batchRow).join("")}</tbody>
    </table></div>
  </div>`;
};

function parseNumericList(value = "") {
  return [...new Set(String(value)
    .split(/[\n,; ]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter((item) => Number.isInteger(item) && item > 0))];
}

window.importTmdbCompanies = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const target = $("#tmdbCompanyResult");
  const data = new FormData(form);
  const companyIds = parseNumericList(data.get("companyIds"));
  if (!companyIds.length) {
    target.innerHTML = `<div class="card"><p>Cole pelo menos um ID numerico de produtora.</p></div>`;
    return;
  }

  const submit = form.querySelector("button");
  submit.disabled = true;
  target.innerHTML = `<div class="card"><h2>Buscando no TMDb</h2><p>Importando filmes das produtoras selecionadas...</p></div>`;
  try {
    const result = await api("/api/admin/tmdb/company-import", {
      method: "POST",
      body: JSON.stringify({
        companyIds,
        pagesPerCompany: data.get("pagesPerCompany") || 1,
        status: data.get("status") || "DRAFT"
      })
    });
    target.innerHTML = `<div class="card">
      <h2>Importacao por produtoras concluida</h2>
      <p>${result.added} adicionados, ${result.updated} atualizados, ${result.skipped} erros.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Empresa</th><th>Pagina</th><th>ID TMDb</th><th>Titulo</th><th>Status</th></tr></thead>
        <tbody>${result.report.slice(0, 150).map((item) => `<tr>
          <td>${escapeHtml(item.companyId || "-")}</td>
          <td>${escapeHtml(item.page || "-")}</td>
          <td>${escapeHtml(item.id || "-")}</td>
          <td>${escapeHtml(item.title || item.message || "-")}</td>
          <td><span class="badge ${item.ok ? "ACTIVE" : "INACTIVE"}">${escapeHtml(item.status || "")}</span></td>
        </tr>`).join("")}</tbody>
      </table></div>
      ${result.report.length > 150 ? `<p>Mostrando os primeiros 150 de ${result.report.length} itens.</p>` : ""}
    </div>`;
  } catch (error) {
    target.innerHTML = `<div class="card"><h2>Importacao falhou</h2><p>${escapeHtml(error.message)}</p></div>`;
  } finally {
    submit.disabled = false;
  }
};

window.userForm = (item = {}) => {
  $("#form").innerHTML = `<form class="card form-grid" onsubmit="saveUser(event,'${item.id || ""}')">
    <label>Nome<input name="name" value="${escapeHtml(item.name || "")}" required /></label>
    <label>E-mail<input name="email" type="email" value="${escapeHtml(item.email || "")}" required /></label>
    <label>Senha<input name="password" type="password" placeholder="${item.id ? "Deixe vazio para manter" : "Minimo 6 caracteres"}" ${item.id ? "" : "required"} /></label>
    <label>Perfil<select name="role">${["USER","ADMIN"].map((role) => `<option value="${role}" ${item.role === role ? "selected" : ""}>${role}</option>`).join("")}</select></label>
    <label>Status<select name="status">${["ACTIVE","INACTIVE"].map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
    <div class="wide toolbar"><button class="mini accent">Salvar usuario</button></div>
  </form>`;
};

window.saveUser = async (event, id) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target).entries());
  await api(`/api/admin/users${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
  render();
};

window.testSource = async (id) => {
  setStatus("Testando...");
  const result = await api(`/api/admin/sources/${id}/test`, { method: "POST" });
  alert(`Conexao OK. Amostra: ${result.sampleSize}`);
  setStatus("Online");
};

window.syncSource = async (id) => {
  setStatus("Sincronizando...");
  const result = await api(`/api/admin/sources/${id}/sync`, { method: "POST" });
  alert(`Importados: ${result.imported}. Duplicados: ${result.skipped}. Invalidos: ${result.invalid}.`);
  render();
};

window.deleteItem = async (type, id, label = "este item", detail = "") => {
  const message = `Excluir ${label}?${detail ? `\n\n${detail}` : ""}`;
  if (!confirm(message)) return;
  await api(`/api/admin/${type}/${id}`, { method: "DELETE" });
  render();
};

window.previewFile = async () => {
  const file = $("#importFile").files[0];
  if (!file) return alert("Selecione um arquivo.");
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/admin/import-file/preview", { method: "POST", headers: { authorization: `Bearer ${state.token}` }, body });
  const result = await response.json();
  if (!response.ok) return alert(result.error);
  state.fileRecords = result.records;
  $("#filePreview").innerHTML = `<div class="card"><h2>${result.count} itens encontrados</h2><pre class="preview-box">${escapeHtml(JSON.stringify(result.preview, null, 2))}</pre><button class="mini accent" onclick="commitFile()">Salvar como rascunho/publicacao</button></div>`;
};

window.commitFile = async () => {
  const result = await api("/api/admin/import-file/commit", {
    method: "POST",
    body: JSON.stringify({
      records: state.fileRecords,
      sourceType: $("#fileType").value,
      reviewBeforePublish: $("#reviewBeforePublish").checked
    })
  });
  alert(`Importados: ${result.imported}. Duplicados: ${result.skipped}. Invalidos: ${result.invalid}.`);
  render();
};

boot();
