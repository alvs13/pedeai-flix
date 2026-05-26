# Deploy definitivo no Render

Este projeto sobe como um unico servico:

- Admin: `/`
- App/site do usuario: `/app`
- API: `/api`
- Banco: Supabase PostgreSQL que ja guarda seus filmes

## Passos

1. Suba a pasta `StreamBox` para um repositorio GitHub.
2. Entre em https://dashboard.render.com/blueprints.
3. Clique em `New Blueprint Instance`.
4. Selecione o repositorio do StreamBox.
5. Confirme o arquivo `render.yaml`.
6. Em `DATABASE_URL`, use o pooler IPv4 do Supabase no Render. Para este projeto, o formato correto e:

```text
postgresql://postgres.pkxcatwxvgsjywygaxmk:SUA-SENHA-CODIFICADA@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

Nao use a URL direta `db.pkxcatwxvgsjywygaxmk.supabase.co:5432` no Render free, porque ela resolve por IPv6 e pode falhar com `ENETUNREACH`.

7. Em `TMDB_API_KEY`, coloque sua chave se quiser buscar metadados pelo painel. Pode deixar vazio para publicar sem TMDb.
8. Clique em `Apply`.

O Render vai criar:

- Web service `streambox`
- Variaveis seguras para JWT e criptografia
- Tabelas faltantes no Supabase, sem apagar os filmes existentes

## URLs depois do deploy

O Render gera uma URL parecida com:

```text
https://streambox.onrender.com
```

Use:

```text
Admin: https://streambox.onrender.com
App:   https://streambox.onrender.com/app
API:   https://streambox.onrender.com/api/public/config
```

Essa URL `onrender.com` e o dominio gratis fixo. Depois, se voce comprar um dominio proprio, pode apontar para o mesmo servico.

## Login inicial

```text
Admin: admin@streambox.app
Senha: streambox
```

Troque a senha no painel antes de usar em producao.

## Conteudo

Como o deploy usa `DATABASE_URL` do Supabase, os filmes ja cadastrados continuam no banco. Nao use banco local nem banco novo do Render se quiser manter o catalogo atual.

No plano gratis do Render, o app pode demorar cerca de um minuto para acordar depois de ficar parado.
