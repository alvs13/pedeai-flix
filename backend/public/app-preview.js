document.documentElement.dataset.streamboxJs = "premium-home-1";

const els = {
  search: document.querySelector("#search"),
  clearSearch: document.querySelector("#clearSearch"),
  hero: document.querySelector("#hero"),
  playHero: document.querySelector("#playHero"),
  detailsHero: document.querySelector("#detailsHero"),
  favoriteHero: document.querySelector("#favoriteHero"),
  heroTitle: document.querySelector("#heroTitle"),
  heroText: document.querySelector("#heroText"),
  heroTag: document.querySelector("#heroTag"),
  heroStats: document.querySelector("#heroStats"),
  continueList: document.querySelector("#continueList"),
  spotlightSection: document.querySelector("#spotlightSection"),
  spotlightGrid: document.querySelector("#spotlightGrid"),
  topList: document.querySelector("#topList"),
  movies: document.querySelector("#movies"),
  moviesTitle: document.querySelector("#moviesTitle"),
  moviesSubtitle: document.querySelector("#moviesSubtitle"),
  moviesPager: document.querySelector("#moviesPager"),
  genreSections: document.querySelector("#genreSections"),
  series: document.querySelector("#series"),
  channels: document.querySelector("#channels"),
  tvGuide: document.querySelector("#tvGuide"),
  player: document.querySelector("#player"),
  embedPlayer: document.querySelector("#embedPlayer"),
  embedFrameSlot: document.querySelector("#embedFrameSlot"),
  embedTools: document.querySelector("#embedTools"),
  embedStatus: document.querySelector("#embedStatus"),
  reloadEmbed: document.querySelector("#reloadEmbed"),
  openEmbed: document.querySelector("#openEmbed"),
  playerTitle: document.querySelector("#playerTitle"),
  dialog: document.querySelector("#playerDialog"),
  detailsDialog: document.querySelector("#detailsDialog"),
  detailsContent: document.querySelector("#detailsContent"),
  profile: document.querySelector("#profileSection"),
  quickSection: document.querySelector("#quickSection"),
  moviesSection: document.querySelector("#moviesSection"),
  seriesSection: document.querySelector("#seriesSection"),
  channelsSection: document.querySelector("#channelsSection"),
  continueSection: document.querySelector("#continueSection"),
  topSection: document.querySelector("#topSection"),
  collectionsSection: document.querySelector("#collectionsSection"),
  guideSection: document.querySelector("#guideSection"),
  chips: document.querySelector("#chips")
};

let hlsInstance;
let currentEmbedUrl = "";
let activeView = "home";
let activeFilter = "all";
let catalog = { movies: [], series: [], channels: [] };
let heroItem = null;
let moviePage = 1;
let suppressCardClickUntil = 0;
const fallbackImage = "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80";
const directStreamPattern = /\.(m3u8|mp4|mov)(\?|#|$)/i;
const moviesPerPage = 24;

const fallbackMovies = [
  {
    title: "Sintel",
    category: "Open Movie",
    posterUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1400&q=80",
    description: "Curta aberto produzido pelo projeto Open Movie da Blender Foundation.",
    sources: [{ url: "https://download.blender.org/durian/movies/sintel-1024-surround.mp4" }]
  },
  {
    title: "Big Buck Bunny",
    category: "Open Movie",
    posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80",
    description: "Filme aberto usado como amostra legal para demonstracao.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }]
  },
  {
    title: "Tears of Steel",
    category: "Open Movie",
    posterUrl: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1400&q=80",
    description: "Filme aberto para testar a experiencia de catalogo.",
    sources: [{ url: "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov" }]
  },
  {
    title: "For Bigger Fun",
    category: "Demo MP4",
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1400&q=80",
    description: "Video sample publico para teste de reproducao.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }]
  },
  {
    title: "Elephants Dream",
    category: "Open Movie",
    posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1512149673953-1e251807ec7c?auto=format&fit=crop&w=1400&q=80",
    description: "Obra aberta usada como amostra de video MP4.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }]
  },
  {
    title: "For Bigger Blazes",
    category: "Demo MP4",
    posterUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    description: "Sample publico com visual de natureza e acao.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" }]
  },
  {
    title: "For Bigger Escapes",
    category: "Natureza",
    posterUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80",
    description: "Video sample publico para vitrine de paisagens.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }]
  },
  {
    title: "For Bigger Joyrides",
    category: "Curtas",
    posterUrl: "https://images.unsplash.com/photo-1490971688337-f2c79913ea7d?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1490971688337-f2c79913ea7d?auto=format&fit=crop&w=1400&q=80",
    description: "Sample curto para testar carrosseis e player.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" }]
  },
  {
    title: "Subaru Outback On Street",
    category: "Curtas",
    posterUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    description: "Demo MP4 publico para preencher catalogo de testes.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4" }]
  },
  {
    title: "Volkswagen GTI Review",
    category: "Curtas",
    posterUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80",
    description: "Sample MP4 publico para demonstracao de detalhes.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4" }]
  }
];

const fallbackChannels = [
  {
    title: "NASA Public Demo",
    category: "Ciencia",
    logoUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-Public/master.m3u8" }]
  },
  {
    title: "NASA Media Demo",
    category: "Ciencia",
    logoUrl: "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-Media/master.m3u8" }]
  },
  {
    title: "Mux HLS Test",
    category: "Teste HLS",
    logoUrl: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" }]
  },
  {
    title: "Apple BipBop Test",
    category: "Teste HLS",
    logoUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8" }]
  },
  {
    title: "Sintel Trailer HLS",
    category: "Open Movie",
    logoUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8" }]
  },
  {
    title: "Tears of Steel HLS",
    category: "Open Movie",
    logoUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }]
  }
];

const fallbackSeries = [
  {
    title: "Cosmos Aberto",
    category: "Ciencia",
    year: 2026,
    rating: "Livre",
    posterUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=1400&q=80",
    description: "Serie ficticia demo sobre ciencia, astronomia e tecnologia.",
    episodes: [
      { seasonNumber: 1, episodeNumber: 1, title: "Orbita", durationMinutes: 24, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }] },
      { seasonNumber: 1, episodeNumber: 2, title: "Sinais", durationMinutes: 27, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }] }
    ]
  },
  {
    title: "Curtas de Estudio",
    category: "Open Movie",
    year: 2025,
    rating: "10",
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1400&q=80",
    description: "Colecao serializada de curtas e samples autorizados para teste.",
    episodes: [
      { seasonNumber: 1, episodeNumber: 1, title: "Luz de Cena", durationMinutes: 12, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }] },
      { seasonNumber: 1, episodeNumber: 2, title: "Movimento", durationMinutes: 10, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" }] }
    ]
  }
];

fallbackMovies.push(
  {
    title: "Big Buck Bunny 60fps",
    category: "Open Movie",
    posterUrl: "https://images.unsplash.com/photo-1529257414772-1960b7bea4eb?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1529257414772-1960b7bea4eb?auto=format&fit=crop&w=1400&q=80",
    description: "Versao demo do open movie Big Buck Bunny para testes de catalogo.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }]
  },
  {
    title: "Natureza Livre",
    category: "Natureza",
    posterUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80",
    description: "Vitrine demo com video publico para validar carrossel de natureza.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }]
  },
  {
    title: "Horizonte Aberto",
    category: "Natureza",
    posterUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80",
    description: "Conteudo sample autorizado para demonstrar capa cinematografica.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }]
  },
  {
    title: "Cinema de Rua",
    category: "Curtas",
    posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80",
    description: "Curta demo com video sample publico.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }]
  },
  {
    title: "Noite Neon",
    category: "Curtas",
    posterUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
    description: "Item demo para preencher o visual de streaming premium.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }]
  },
  {
    title: "Viagem Eletrica",
    category: "Curtas",
    posterUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    description: "Video publico usado como sample de catalogo.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" }]
  },
  {
    title: "Estrada Livre",
    category: "Demo MP4",
    posterUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80",
    description: "Sample MP4 para testar continuar assistindo e detalhes.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4" }]
  },
  {
    title: "Teste 4K Demo",
    category: "Demo MP4",
    posterUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1400&q=80",
    description: "Conteudo sample para simular qualidade premium.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4" }]
  },
  {
    title: "Cena Aberta",
    category: "Open Movie",
    posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80",
    description: "Amostra legal para compor a secao de recomendados.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }]
  },
  {
    title: "Studio Sample",
    category: "Open Movie",
    posterUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1400&q=80",
    description: "Sample aberto para demonstrar biblioteca com muitos itens.",
    sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }]
  }
);

fallbackChannels.push(
  {
    title: "Big Buck Bunny HLS",
    category: "Open Movie",
    logoUrl: "https://images.unsplash.com/photo-1529257414772-1960b7bea4eb?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" }]
  },
  {
    title: "Nature TV Demo",
    category: "Natureza",
    logoUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8" }]
  },
  {
    title: "Science Live Demo",
    category: "Ciencia",
    logoUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-Public/master.m3u8" }]
  },
  {
    title: "Space Media Demo",
    category: "Ciencia",
    logoUrl: "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-Media/master.m3u8" }]
  },
  {
    title: "Cinema HLS Demo",
    category: "Teste HLS",
    logoUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8" }]
  },
  {
    title: "Sample Channel 24h",
    category: "Teste HLS",
    logoUrl: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=400&q=80",
    sources: [{ url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" }]
  }
);

fallbackSeries.push(
  {
    title: "Natureza em Foco",
    category: "Natureza",
    year: 2026,
    rating: "Livre",
    posterUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80",
    description: "Serie demo de natureza usando videos sample autorizados.",
    episodes: [
      { seasonNumber: 1, episodeNumber: 1, title: "Montanhas", durationMinutes: 8, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }] },
      { seasonNumber: 1, episodeNumber: 2, title: "Estradas", durationMinutes: 9, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4" }] }
    ]
  },
  {
    title: "Open Studio",
    category: "Curtas",
    year: 2025,
    rating: "10",
    posterUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1400&q=80",
    description: "Serie demo com episodios curtos para testar temporadas.",
    episodes: [
      { seasonNumber: 1, episodeNumber: 1, title: "Camera", durationMinutes: 6, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }] },
      { seasonNumber: 1, episodeNumber: 2, title: "Luz", durationMinutes: 7, sources: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4" }] }
    ]
  }
);

function mediaUrl(item) {
  return item.sources?.[0]?.url || "";
}

function sourceType(item) {
  return String(item.sources?.[0]?.type || "").toUpperCase();
}

function isDirectStream(url, type = "") {
  const normalizedType = String(type).toUpperCase();
  return ["HLS", "MP4"].includes(normalizedType) || directStreamPattern.test(url || "");
}

function isPlayableItem(item) {
  return isDirectStream(mediaUrl(item), sourceType(item));
}

function playableItems(items) {
  const direct = items.filter(isPlayableItem);
  return direct.length ? direct : items;
}

function safe(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

function filterKey(value = "") {
  return String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function contentTime(item) {
  const updated = item.updatedAt ? Date.parse(item.updatedAt) : 0;
  if (Number.isFinite(updated) && updated) return updated;
  const created = item.createdAt ? Date.parse(item.createdAt) : 0;
  return Number.isFinite(created) ? created : 0;
}

function sortByFreshness(items) {
  return [...items].sort((a, b) => {
    const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
    if (yearDiff) return yearDiff;
    const dateDiff = contentTime(b) - contentTime(a);
    if (dateDiff) return dateDiff;
    return String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""), "pt-BR");
  });
}

function sortByRecentlyUpdated(items) {
  return [...items].sort((a, b) => {
    const dateDiff = contentTime(b) - contentTime(a);
    if (dateDiff) return dateDiff;
    return (Number(b.year) || 0) - (Number(a.year) || 0);
  });
}

function hasArtwork(item) {
  return Boolean(item?.backdropUrl || item?.bannerUrl || item?.posterUrl || item?.logoUrl);
}

function demoPenalty(item) {
  const haystack = filterKey(`${item?.title || item?.name || ""} ${item?.category || ""} ${item?.description || ""}`);
  const demoWords = ["demo", "sample", "teste", "open movie", "blender", "sintel", "big buck bunny"];
  return demoWords.some((word) => haystack.includes(filterKey(word))) ? 12000000000000 : 0;
}

function homeScore(item) {
  const year = Number(item?.year) || 0;
  const time = contentTime(item);
  const artworkBoost = hasArtwork(item) ? 800000000000 : 0;
  const streamBoost = isPlayableItem(item) ? 250000000000 : 0;
  const descriptionBoost = item?.description ? 35000000000 : 0;
  return (year * 1000000000000) + time + artworkBoost + streamBoost + descriptionBoost - demoPenalty(item);
}

function sortForHome(items) {
  return uniqueById(items)
    .filter((item) => item && (item.title || item.name))
    .sort((a, b) => {
      const scoreDiff = homeScore(b) - homeScore(a);
      if (scoreDiff) return scoreDiff;
      return String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""), "pt-BR");
    });
}

function pickHomeHero(items) {
  const ranked = sortForHome(items);
  return ranked.find(hasArtwork)
    || ranked.find(isPlayableItem)
    || ranked[0]
    || null;
}

function genreName(item) {
  return String(item.category || "Sem categoria").trim() || "Sem categoria";
}

function groupedByGenre(items) {
  const groups = new Map();
  for (const item of items) {
    const name = genreName(item);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  return [...groups.entries()]
    .map(([name, groupItems]) => ({ name, items: sortByFreshness(groupItems) }))
    .sort((a, b) => {
      const newestDiff = contentTime(b.items[0]) - contentTime(a.items[0]);
      if (newestDiff) return newestDiff;
      return b.items.length - a.items.length;
    });
}

function movieCard(movie) {
  return `<article class="movie" tabindex="0" data-kind="movie" data-title="${safe(movie.title)}" data-url="${safe(mediaUrl(movie))}">
    <span class="badge">HD</span>
    <img src="${safe(movie.posterUrl || movie.backdropUrl || fallbackImage)}" alt="" onerror="this.src='${fallbackImage}'" />
    <div><h3>${safe(movie.title)}</h3><p>${safe(movie.category || "Filmes")}</p></div>
  </article>`;
}

function wideCard(movie) {
  const meta = [movie.category, movie.year].filter(Boolean).join(" - ") || "Atualizado";
  return `<article class="wide-card" tabindex="0" data-kind="movie" data-title="${safe(movie.title)}" data-url="${safe(mediaUrl(movie))}" style="background-image:url('${safe(movie.backdropUrl || movie.posterUrl || "")}')">
    <div><h3>${safe(movie.title)}</h3><p class="card-meta">${safe(meta)}</p></div>
  </article>`;
}

function topCard(movie, index) {
  return `<article class="top-card" tabindex="0" data-kind="movie" data-title="${safe(movie.title)}" data-url="${safe(mediaUrl(movie))}">
    <img src="${safe(movie.posterUrl || movie.backdropUrl || fallbackImage)}" alt="" onerror="this.src='${fallbackImage}'" />
    <strong>${index + 1}</strong>
    <span>${safe(movie.title)}</span>
  </article>`;
}

function spotlightCard(movie, index) {
  const isLead = index === 0;
  return `<article class="spotlight-card ${isLead ? "lead" : ""}" tabindex="0" data-kind="movie" data-title="${safe(movie.title)}" data-url="${safe(mediaUrl(movie))}" style="--cover:url('${safe(movie.backdropUrl || movie.bannerUrl || movie.posterUrl || fallbackImage)}')">
    <span>${safe(movie.category || "Filme")} ${movie.year ? `- ${safe(movie.year)}` : ""}</span>
    <strong>${safe(movie.title)}</strong>
    ${isLead ? `<p>${safe(movie.description || "Novo no catalogo.")}</p>` : ""}
    <button type="button">Assistir</button>
  </article>`;
}

function channelCard(channel) {
  const title = channel.title || channel.name;
  return `<article class="channel" tabindex="0" data-kind="channel" data-title="${safe(title)}" data-url="${safe(mediaUrl(channel))}">
    <img src="${safe(channel.logoUrl || fallbackImage)}" alt="" onerror="this.src='${fallbackImage}'" />
    <div><h3>${safe(title)}</h3><p>${safe(channel.category || "Ao vivo")}</p></div>
  </article>`;
}

function guideRow(channel, index) {
  const title = channel.title || channel.name;
  const shows = ["Jornal ao vivo", "Documentario", "Especial", "Sessao livre", "Bastidores"];
  return `<div class="guide-row">
    <div class="guide-channel"><img src="${safe(channel.logoUrl || "")}" alt="" /><span>${safe(title)}</span></div>
    <div class="guide-slot"><span>Agora</span>${shows[index % shows.length]}</div>
    <div class="guide-slot"><span>A seguir</span>${shows[(index + 2) % shows.length]}</div>
  </div>`;
}

function seriesCard(item) {
  return `<article class="movie" tabindex="0" data-kind="series" data-title="${safe(item.title)}" data-url="${safe(mediaUrl(item.episodes?.[0] || {}))}">
    <span class="badge">${item.episodes?.length || 1} EP</span>
    <img src="${safe(item.posterUrl || item.backdropUrl || fallbackImage)}" alt="" onerror="this.src='${fallbackImage}'" />
    <div><h3>${safe(item.title)}</h3><p>${safe(item.category || "Series")}</p></div>
  </article>`;
}

function filtered() {
  const term = filterKey(els.search.value);
  const activeKey = filterKey(activeFilter);
  const categoryMatch = (item) => activeFilter === "all" || filterKey(item.category) === activeKey;
  const textMatch = (item) => !term || filterKey(`${item.title || item.name} ${item.category || ""}`).includes(term);
  return {
    movies: catalog.movies.filter((item) => categoryMatch(item) && textMatch(item)),
    series: catalog.series.filter((item) => categoryMatch(item) && textMatch(item)),
    channels: catalog.channels.filter((item) => categoryMatch(item) && textMatch(item))
  };
}

function pageItems(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    totalPages
  };
}

function renderMoviePager(totalItems, page, totalPages) {
  if (!els.moviesPager) return;
  if (totalItems <= moviesPerPage) {
    els.moviesPager.hidden = true;
    els.moviesPager.innerHTML = "";
    return;
  }
  els.moviesPager.hidden = false;
  els.moviesPager.innerHTML = `
    <button type="button" ${page <= 1 ? "disabled" : ""} onclick="window.changeMoviePage(${page - 1})">Anterior</button>
    <span>Pagina ${page} de ${totalPages}</span>
    <button type="button" ${page >= totalPages ? "disabled" : ""} onclick="window.changeMoviePage(${page + 1})">Proxima</button>
  `;
}

function renderGenreFilters() {
  if (!els.chips) return;
  const genres = groupedByGenre(catalog.movies)
    .filter((group) => group.name !== "Sem categoria")
    .slice(0, 12)
    .map((group) => group.name);

  els.chips.innerHTML = [
    `<button class="${activeFilter === "all" ? "active" : ""}" data-filter="all" onclick="window.applyGenreFilter('all')">Tudo</button>`,
    ...genres.map((genre) => {
      const count = catalog.movies.filter((item) => filterKey(item.category) === filterKey(genre)).length;
      const active = activeFilter !== "all" && filterKey(activeFilter) === filterKey(genre);
      return `<button class="${active ? "active" : ""}" data-filter="${safe(genre)}" onclick="window.applyGenreFilter('${safe(genre)}')">${safe(genre)} <span>${count}</span></button>`;
    })
  ].join("");

  els.chips.querySelectorAll("[data-filter]").forEach((button) => {
    const run = (event) => {
      event.preventDefault();
      event.stopPropagation();
      applyGenreFilter(button.dataset.filter);
    };
    button.addEventListener("click", run);
    button.addEventListener("pointerup", run);
  });
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || `${item.title}-${mediaUrl(item)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderShowcaseSections(items) {
  if (!els.genreSections) return;
  const term = els.search.value.trim();
  if (activeView !== "home" || activeFilter !== "all" || term) {
    els.genreSections.hidden = true;
    els.genreSections.innerHTML = "";
    return;
  }

  const homeItems = sortForHome(items);
  const newestYear = Math.max(...items.map((item) => Number(item.year) || 0));
  const updated = homeItems.slice(12, 34);
  const releases = sortForHome(items.filter((item) => Number(item.year) === newestYear)).slice(0, 18);
  const strongGenres = groupedByGenre(items)
    .filter((group) => ["Drama", "Comedia", "Acao", "Terror", "Documentario", "Thriller"].some((name) => filterKey(name) === filterKey(group.name)))
    .slice(0, 3);
  const sections = [
    { title: "Destaques recentes", label: "Atualizados agora", items: updated },
    { title: `Filmes de ${newestYear}`, label: "Ano mais novo", items: releases },
    ...strongGenres.map((group) => ({ title: `Novos em ${group.name}`, label: `${group.items.length} titulos`, items: sortForHome(group.items).slice(0, 18) }))
  ].filter((section) => section.items.length);

  els.genreSections.hidden = !sections.length;
  els.genreSections.innerHTML = sections.map((section) => `
    <section class="content-section showcase-block">
      <div class="section-title">
        <h2>${safe(section.title)}</h2>
        <span>${safe(section.label)}</span>
      </div>
      <div class="poster-grid">${uniqueById(section.items).slice(0, 14).map(movieCard).join("")}</div>
    </section>
  `).join("");
}

function renderSpotlight(items) {
  if (!els.spotlightGrid) return;
  const spotlightItems = sortForHome(items)
    .filter((item) => item.backdropUrl || item.bannerUrl || item.posterUrl)
    .slice(0, 6);

  els.spotlightSection.hidden = activeView !== "home" || activeFilter !== "all" || !spotlightItems.length;
  els.spotlightGrid.innerHTML = spotlightItems.map(spotlightCard).join("");
}

function sectionCover(items, fallback = fallbackImage) {
  const item = items.find((entry) => entry.backdropUrl || entry.bannerUrl || entry.posterUrl || entry.logoUrl);
  return item?.backdropUrl || item?.bannerUrl || item?.posterUrl || item?.logoUrl || fallback;
}

function renderQuickHub() {
  if (!els.quickSection) return;
  const movieGenres = groupedByGenre(catalog.movies).slice(0, 4).map((group) => group.name).join(" - ");
  const homeMovies = sortForHome(catalog.movies);
  const hubs = [
    {
      view: "movies",
      label: "Filmes",
      meta: `${catalog.movies.length} titulos`,
      text: movieGenres || "Lancamentos, ação, drama e mais",
      cover: sectionCover(homeMovies),
      sample: homeMovies.slice(0, 3).map((item) => item.title).join(" - ")
    },
    {
      view: "series",
      label: "Series",
      meta: `${catalog.series.length} series`,
      text: "Temporadas, episodios e colecoes",
      cover: sectionCover(catalog.series, "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=900&q=80"),
      sample: catalog.series.slice(0, 3).map((item) => item.title).join(" - ")
    },
    {
      view: "channels",
      label: "TV ao vivo",
      meta: `${catalog.channels.length} canais`,
      text: "Canais HLS, grade e transmissoes",
      cover: sectionCover(catalog.channels, "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=900&q=80"),
      sample: catalog.channels.slice(0, 3).map((item) => item.title || item.name).join(" - ")
    }
  ];

  els.quickSection.innerHTML = hubs.map((hub) => `
    <button class="hub-card" data-view="${hub.view}" style="--cover:url('${safe(hub.cover)}')">
      <span>${safe(hub.meta)}</span>
      <strong>${safe(hub.label)}</strong>
      <small>${safe(hub.text)}</small>
      <em>${safe(hub.sample || "Abrir secao")}</em>
    </button>
  `).join("");

  els.quickSection.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });
}
function render() {
  renderGenreFilters();
  renderQuickHub();
  const items = filtered();
  const homeMode = activeView === "home" && activeFilter === "all";
  const homeMovies = sortForHome(catalog.movies);
  const hero = homeMode ? pickHomeHero(catalog.movies) : (sortForHome(items.movies)[0] || homeMovies[0]);
  heroItem = hero || null;
  if (hero) {
    els.heroTitle.textContent = hero.title;
    els.heroText.textContent = hero.description || "Conteudo autorizado disponivel agora.";
    els.heroTag.textContent = hero.category || "Filme em destaque";
    if (els.heroStats) {
      const year = hero.year ? `<span>${safe(hero.year)}</span>` : "";
      const category = hero.category ? `<span>${safe(hero.category)}</span>` : "";
      els.heroStats.innerHTML = `${category}${year}<span>${catalog.movies.length} filmes no catalogo</span>`;
    }
    els.hero.style.backgroundImage = `linear-gradient(0deg, #07070a 0%, rgba(7,7,10,.2) 54%), linear-gradient(90deg, rgba(7,7,10,.9), rgba(7,7,10,.18) 58%, rgba(7,7,10,.66)), url("${hero.backdropUrl || hero.bannerUrl || hero.posterUrl || fallbackImage}")`;
  }

  const moviePageData = pageItems(items.movies, moviePage, moviesPerPage);
  const visibleMovies = homeMode ? homeMovies.slice(0, 30) : moviePageData.items;
  moviePage = moviePageData.page;
  if (els.moviesTitle) els.moviesTitle.textContent = activeFilter !== "all" ? activeFilter : homeMode ? "Lancamentos e novidades" : "Todos os filmes";
  if (els.moviesSubtitle) els.moviesSubtitle.textContent = activeFilter !== "all" ? `${items.movies.length} filmes encontrados` : homeMode ? "Mais recentes" : `${items.movies.length} titulos`;
  els.continueList.innerHTML = homeMovies.slice(6, 16).map(wideCard).join("");
  els.movies.innerHTML = items.movies.length ? visibleMovies.map(movieCard).join("") : `<div class="empty">Nenhum filme encontrado.</div>`;
  renderMoviePager(homeMode ? 0 : items.movies.length, moviePageData.page, moviePageData.totalPages);
  renderSpotlight(catalog.movies);
  renderShowcaseSections(catalog.movies);
  els.series.innerHTML = items.series.length ? items.series.map(seriesCard).join("") : `<div class="empty">Nenhuma serie encontrada.</div>`;
  els.topList.innerHTML = homeMovies.slice(0, 10).map(topCard).join("");
  els.channels.innerHTML = items.channels.length ? items.channels.map(channelCard).join("") : `<div class="empty">Nenhum canal encontrado.</div>`;
  els.tvGuide.innerHTML = catalog.channels.slice(0, 5).map(guideRow).join("");
  bindCards();
  enhanceHorizontalRails();
  applyView();
}

window.changeMoviePage = (page) => {
  moviePage = page;
  render();
  els.moviesSection?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function bindCards() {
  document.querySelectorAll("[data-url]").forEach((card) => {
    card.onclick = () => {
      if (Date.now() < suppressCardClickUntil) return;
      openDetails(card.dataset.kind, card.dataset.title);
    };
    card.onkeydown = (event) => {
      if (event.key === "Enter") openDetails(card.dataset.kind, card.dataset.title);
    };
  });
}

function enhanceHorizontalRails() {
  document.querySelectorAll(".wide-row, .top-row, .poster-grid").forEach((rail) => {
    if (rail.dataset.railReady) return;
    rail.dataset.railReady = "true";

    rail.addEventListener("wheel", (event) => {
      if (rail.scrollWidth <= rail.clientWidth) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      rail.scrollBy({ left: event.deltaY * 1.15, behavior: "smooth" });
    }, { passive: false });

    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;

    rail.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch" || rail.scrollWidth <= rail.clientWidth) return;
      isDragging = true;
      startX = event.clientX;
      scrollLeft = rail.scrollLeft;
      rail.classList.add("is-dragging");
      rail.setPointerCapture(event.pointerId);
    });

    rail.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 6) suppressCardClickUntil = Date.now() + 250;
      rail.scrollLeft = scrollLeft - distance;
    });

    const stopDrag = () => {
      isDragging = false;
      rail.classList.remove("is-dragging");
    };
    rail.addEventListener("pointerup", stopDrag);
    rail.addEventListener("pointercancel", stopDrag);
    rail.addEventListener("pointerleave", stopDrag);
  });
}

function findItem(kind, title) {
  if (kind === "series") return catalog.series.find((item) => item.title === title);
  if (kind === "channel") return catalog.channels.find((item) => (item.title || item.name) === title);
  return catalog.movies.find((item) => item.title === title);
}

function openDetails(kind, title) {
  const item = findItem(kind, title);
  if (!item) return;
  const isSeries = kind === "series";
  const isChannel = kind === "channel";
  const firstUrl = isSeries ? mediaUrl(item.episodes?.[0] || {}) : mediaUrl(item);
  const recommendations = [...catalog.movies, ...catalog.series]
    .filter((entry) => entry.title !== item.title)
    .slice(0, 4);
  els.detailsContent.innerHTML = `<div class="details-shell">
    <img class="details-poster" src="${safe(item.posterUrl || item.logoUrl || item.backdropUrl || "")}" alt="" />
    <div>
      <h1>${safe(item.title || item.name)}</h1>
      <div class="details-meta">
        <span>${safe(isChannel ? "Ao vivo" : item.year || "2026")}</span>
        <span>${safe(item.category || "Catalogo")}</span>
        <span>${safe(item.rating || "Livre")}</span>
        <span>${isSeries ? `${item.episodes?.length || 1} episodios` : isChannel ? "HLS" : "HD"}</span>
      </div>
      <p>${safe(item.description || "Conteudo autorizado cadastrado para demonstracao.")}</p>
      <div class="details-actions">
        <button class="watch-primary" onclick="window.playFromDetails('${safe(firstUrl)}','${safe(item.title || item.name)}')">â–¶ Assistir agora</button>
        <button onclick="window.fakeToast('Adicionado aos favoritos')">Favoritar</button>
        <button onclick="window.fakeToast('Link de compartilhamento copiado')">Compartilhar</button>
      </div>
      ${isSeries ? `<h2>Episodios</h2><div class="episodes">${item.episodes.map((episode) => `<article class="episode"><strong>S${episode.seasonNumber}E${episode.episodeNumber}</strong><span>${safe(episode.title)}</span><button onclick="window.playFromDetails('${safe(mediaUrl(episode))}','${safe(episode.title)}')">Play</button></article>`).join("")}</div>` : ""}
      <h2>Recomendados</h2>
      <div class="recommendations">${recommendations.map((entry) => `<article style="--cover:url('${safe(entry.backdropUrl || entry.posterUrl || "")}')"><strong>${safe(entry.title)}</strong></article>`).join("")}</div>
    </div>
  </div>`;
  els.detailsDialog.showModal();
}

function setActiveView(view) {
  activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
}

function applyView() {
  const showHome = activeView === "home";
  const shell = document.querySelector(".phone-shell");
  if (shell) shell.dataset.view = activeView;
  const setHidden = (element, hidden) => {
    if (element) element.hidden = hidden;
  };
  setHidden(els.hero, !showHome);
  setHidden(els.spotlightSection, !showHome || activeFilter !== "all");
  setHidden(els.chips, activeView === "profile");
  setHidden(els.quickSection, activeView === "profile");
  setHidden(els.continueSection, !showHome);
  setHidden(els.moviesSection, !(showHome || activeView === "movies"));
  setHidden(els.seriesSection, !(showHome || activeView === "series"));
  setHidden(els.topSection, !(showHome || activeView === "movies"));
  setHidden(els.channelsSection, !(showHome || activeView === "channels"));
  setHidden(els.guideSection, !(showHome || activeView === "channels"));
  setHidden(els.collectionsSection, activeView === "profile");
  setHidden(els.profile, activeView !== "profile");
}

async function getHls() {
  if (window.Hls) return window.Hls;
  const module = await import("/vendor/hls/hls.mjs");
  return module.default;
}

function ensureEmbedFrame() {
  let iframe = els.embedFrameSlot.querySelector("#embedPlayer");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "embedPlayer";
    iframe.title = "Embed player";
    iframe.width = "100%";
    iframe.height = "600";
    iframe.frameBorder = "0";
    iframe.allowFullscreen = true;
    iframe.loading = "eager";
    iframe.referrerPolicy = "no-referrer";
    iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media; picture-in-picture");
    els.embedFrameSlot.replaceChildren(iframe);
  }
  els.embedPlayer = iframe;
  return iframe;
}

function showEmbedFrame(src, { forceReload = false } = {}) {
  const iframe = ensureEmbedFrame();
  iframe.style.display = "block";
  if (forceReload || iframe.src !== src) iframe.src = src;
  return iframe;
}

function hideEmbedFrame({ clear = false } = {}) {
  const iframe = ensureEmbedFrame();
  iframe.style.display = "none";
  if (clear) iframe.removeAttribute("src");
}

async function openPlayer(url, title = "Player") {
  if (!url) return;
  els.playerTitle.textContent = title;
  els.player.style.display = "";
  els.embedTools.hidden = true;
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  if (!isDirectStream(url)) {
    els.player.pause();
    els.player.removeAttribute("src");
    els.player.style.display = "none";
    currentEmbedUrl = url;
    els.embedStatus.textContent = "Carregando player...";
    els.embedTools.hidden = false;
    if (!els.dialog.open) els.dialog.showModal();
    requestAnimationFrame(() => showEmbedFrame(url));
    return;
  }

  currentEmbedUrl = "";
  hideEmbedFrame({ clear: true });
  if (url.includes(".m3u8")) {
    const HlsCtor = await getHls();
    if (HlsCtor?.isSupported()) {
      hlsInstance = new HlsCtor();
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(els.player);
    } else {
      els.player.src = url;
    }
  } else {
    els.player.src = url;
  }
  if (!els.dialog.open) els.dialog.showModal();
}

window.openPlayer = openPlayer;
globalThis.openPlayer = openPlayer;
document.documentElement.dataset.streamboxPlayerReady = "true";

document.querySelector("#closePlayer").addEventListener("click", () => {
  els.player.pause();
  els.embedTools.hidden = true;
  hideEmbedFrame({ clear: true });
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  els.player.removeAttribute("src");
  els.dialog.close();
});

els.reloadEmbed.addEventListener("click", () => {
  if (!currentEmbedUrl) return;
  els.embedStatus.textContent = "Tentando recarregar iframe externo...";
  requestAnimationFrame(() => window.tryEmbedFrame());
});

els.openEmbed.addEventListener("click", () => {
  if (currentEmbedUrl) window.open(currentEmbedUrl, "_blank", "noopener,noreferrer");
});

window.tryEmbedFrame = () => {
  if (!currentEmbedUrl) return;
  showEmbedFrame(currentEmbedUrl, { forceReload: true });
};

document.querySelector("#closeDetails").addEventListener("click", () => {
  els.detailsDialog.close();
});

window.playFromDetails = (url, title) => {
  els.detailsDialog.close();
  openPlayer(url, title);
};

window.fakeToast = (message) => {
  const previous = document.querySelector(".toast");
  previous?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
};

function playHero() {
  const item = heroItem || catalog.movies.find(isPlayableItem) || catalog.movies[0];
  openPlayer(mediaUrl(item), item?.title);
}

function openHeroDetails() {
  const item = heroItem || catalog.movies.find(isPlayableItem) || catalog.movies[0];
  openDetails("movie", item?.title);
}

els.playHero.onclick = playHero;
els.detailsHero.onclick = openHeroDetails;
els.favoriteHero.onclick = () => fakeToast("Adicionado aos favoritos");

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "play-hero") playHero();
  if (action === "details-hero") openHeroDetails();
  if (action === "favorite-hero") fakeToast("Adicionado aos favoritos");
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.view));
});

function applyGenreFilter(filter) {
  activeFilter = filter || "all";
  activeView = activeFilter === "all" ? "home" : "movies";
  moviePage = 1;
  render();
  if (activeFilter !== "all") {
    els.moviesSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
window.applyGenreFilter = applyGenreFilter;

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-filter]");
  if (!filterButton) return;
  event.preventDefault();
  applyGenreFilter(filterButton.dataset.filter);
});

els.search.addEventListener("input", () => {
  moviePage = 1;
  render();
});
els.clearSearch.addEventListener("click", () => {
  els.search.value = "";
  applyGenreFilter("all");
});

async function load() {
  let movies = [];
  let series = [];
  let channels = [];
  try {
    [movies, series, channels] = await Promise.all([
      fetch("/api/public/movies").then((r) => {
        if (!r.ok) throw new Error("movies api failed");
        return r.json();
      }),
      fetch("/api/public/series").then((r) => r.ok ? r.json() : []),
      fetch("/api/public/channels").then((r) => r.ok ? r.json() : [])
    ]);
  } catch (error) {
    console.error("Falha ao carregar catalogo", error);
    catalog = { movies: [], series: [], channels: [] };
    if (els.movies) {
      els.movies.innerHTML = `<div class="empty">Nao consegui carregar o catalogo agora. Verifique se o servidor esta online.</div>`;
    }
    return;
  }
  const hasPublishedMovies = movies.length > 0;
  catalog = {
    movies: sortByFreshness(movies.length ? movies : fallbackMovies),
    series: sortByFreshness(hasPublishedMovies ? series : (series.length ? series : fallbackSeries)),
    channels: hasPublishedMovies ? channels : (channels.length ? channels : fallbackChannels)
  };
  renderGenreFilters();
  render();
}

load();
