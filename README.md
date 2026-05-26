# StreamBox

StreamBox e uma plataforma de streaming/IPTV legal com app Android nativo, backend Node.js + Express, banco PostgreSQL e painel administrativo web responsivo.

O projeto foi desenhado para publicar somente filmes, canais e videos proprios, autorizados ou licenciados. Ele nao inclui scraping, listas publicas ilegais, pirataria ou fontes sem autorizacao.

## Estrutura

```text
StreamBox/
  app/                 App Android Kotlin + Jetpack Compose + Media3 ExoPlayer
  backend/             API Express, painel admin, PostgreSQL, JWT e importadores
  admin/               Admin antigo simples mantido como referencia local
```

## Funcionalidades

- App Android em Kotlin com tema escuro premium, home estilo streaming, banner principal, carrosseis, busca, favoritos, historico, detalhes e player HLS/MP4.
- Suporte visual para Android TV: foco, navegacao lateral e layout responsivo no app nativo.
- Backend Express com JWT, rotas publicas para o app e rotas admin protegidas.
- PostgreSQL estruturado com usuarios, categorias, filmes, canais, favoritos, historico, fontes de conteudo e logs.
- Painel admin web com login separado, dashboard, CRUD de filmes/canais/categorias, usuarios, fontes licenciadas e logs.
- Importacao por API propria/licenciada com mapeamento de campos, teste de conexao, sincronizacao manual e sincronizacao diaria.
- Importacao por CSV, JSON e M3U propria/licenciada com pre-visualizacao antes de salvar.
- Conteudos importados podem entrar como rascunho para revisao antes de publicar.
- Duplicados sao evitados por fingerprint de titulo + URL.
- Tokens/API keys das fontes sao criptografados no backend e nao sao expostos no frontend.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 14 ou superior
- Android Studio para rodar o app Android

## Configurar backend

```bash
cd backend
copy .env.example .env
npm install
```

Edite `backend/.env` se seu PostgreSQL usar outro usuario, senha ou porta:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/streambox
JWT_SECRET=troque-este-segredo-em-producao
API_TOKEN_ENCRYPTION_SECRET=use-um-segredo-forte-32-caracteres
ALLOW_EXTERNAL_EMBEDS=false
EMBEDMOVIES_BASE_URL=https://myembed.biz
```

Crie o banco `streambox` no PostgreSQL e rode:

```bash
npm run db:setup
npm run db:seed
npm run dev
```

URLs:

- Painel admin: `http://localhost:5050`
- Previa web do app do usuario: `http://localhost:5050/app`
- API do app no emulador Android: `http://10.0.2.2:5050`
- API local: `http://localhost:5050`

Credenciais iniciais:

```text
Admin: admin@streambox.app / streambox
Usuario demo: demo@streambox.app / streambox
```

## Rodar o app Android

1. Abra a pasta `StreamBox` no Android Studio.
2. Aguarde o sync do Gradle.
3. Rode a configuracao `app`.
4. Com o backend ativo em `localhost:5050`, o emulador Android acessa a API por `http://10.0.2.2:5050`.

Se o backend estiver desligado, o app usa dados ficticios locais como fallback.

## Como cadastrar filmes

No painel admin:

1. Entre em `Filmes`.
2. Clique em `Novo filme`.
3. Preencha titulo, sinopse, categoria, ano, duracao, capa, banner e URL do video.
4. Use URL `.mp4` ou `.m3u8` licenciada/autorizada.
5. Escolha `ACTIVE` para publicar ou `DRAFT` para revisar depois.
6. Salve.

## Como cadastrar canais

No painel admin:

1. Entre em `Canais ao vivo`.
2. Clique em `Novo canal`.
3. Preencha nome, categoria, logo e URL `.m3u8`.
4. Escolha status ativo, rascunho ou inativo.
5. Salve.

## Como cadastrar APIs licenciadas

No painel admin:

1. Entre em `Fontes de Conteudo`.
2. Clique em `Nova fonte`.
3. Informe nome da fonte, URL da API, token/API key, tipo e status.
4. Configure o mapeamento JSON. Exemplo:

```json
{
  "title": "title",
  "description": "description",
  "category": "category",
  "year": "year",
  "duration": "duration",
  "poster_url": "poster_url",
  "banner_url": "banner_url",
  "video_url": "video_url",
  "stream_url": "stream_url",
  "logo_url": "logo_url"
}
```

5. Use `Testar` para validar a conexao.
6. Use `Sincronizar` para importar agora.
7. Mantenha `Revisar antes de publicar` ligado para que os itens entrem como `DRAFT`.

A sincronizacao automatica roda diariamente as 03:00 no fuso `America/Fortaleza`.

## Integracao EmbedMovies

O painel inclui uma area `EmbedMovies` para gerar iframes no formato documentado por esse provedor:

- Filme: `https://myembed.biz/filme/{id}`
- Serie: `https://myembed.biz/serie/{id}`
- Episodio: `https://myembed.biz/serie/{id}/{temporada}/{episodio}`

Por seguranca juridica, essa integracao fica bloqueada por padrao. Para habilitar, defina no `backend/.env`:

```env
ALLOW_EXTERNAL_EMBEDS=true
```

Use somente com conteudos proprios, autorizados ou licenciados. O sistema exige confirmacao do administrador antes de gerar o iframe, mas a verificacao dos direitos de exibicao continua sendo responsabilidade do operador.

## Importar arquivos

No painel admin:

1. Entre em `Importar arquivo`.
2. Selecione CSV, JSON ou M3U propria/licenciada.
3. Veja a pre-visualizacao.
4. Escolha detectar tipo, filmes ou canais.
5. Salve como rascunho ou publicacao direta.

Campos aceitos:

- `title` -> titulo
- `description` -> sinopse
- `category` -> categoria
- `year` -> ano
- `duration` -> duracao
- `poster_url` -> capa
- `banner_url` -> banner
- `video_url` -> URL do filme
- `stream_url` -> URL do canal
- `logo_url` -> logo do canal

## Seguranca e operacao legal

- Nunca cadastre fontes sem autorizacao.
- Nao use scraping, listas piratas ou credenciais de terceiros.
- Troque `JWT_SECRET` e `API_TOKEN_ENCRYPTION_SECRET` antes de publicar.
- Use HTTPS em producao.
- Restrinja o painel admin por firewall, VPN ou dominio protegido.
- Valide contratos/licencas antes de publicar conteudo comercialmente.
