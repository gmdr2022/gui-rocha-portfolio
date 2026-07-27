# Gui Rocha — portal de produtos

Site estático do Guilherme Rocha e catálogo de ClubAL, Maeve Roscaern, Demonyza, Codex Checkpoint, NEXUS e projetos públicos selecionados.

Produção: [gui-rocha.pages.dev](https://gui-rocha.pages.dev/)

## Princípios

- sem framework, telemetria, anúncios ou dependências de runtime;
- catálogo orientado por `assets/data/projects.json`;
- páginas curtas com navegação direta, teclado, toque e redução de movimento;
- tema, acessibilidade e consentimento funcionais no navegador;
- conceitos de Maeve sempre identificados como conceito, nunca como captura do jogo;
- build estático compatível com Cloudflare Pages no plano gratuito.

## Identidade e mídia

- a marca pessoal canônica fica em `assets/img/brand/`; o cabeçalho alterna assinaturas vetoriais conforme tema e largura;
- `assets/data/project-assets.json` registra a origem e informa quando um ícone é oficial, motivo visual ou apenas ilustração de catálogo;
- a galeria do ClubAL usa capturas locais da interface com dados demonstrativos; artes de Maeve mantêm o rótulo explícito “Imagem conceito”;
- CSS, JavaScript e capturas mutáveis exigem revalidação no `_headers`; o service worker usa rede primeiro para navegação e recursos de layout.

## Desenvolvimento

Requer Node.js 20 ou superior.

```powershell
npm run check
npm run serve -- --port 4173
```

`npm run build` cria `dist/` com apenas os arquivos públicos. Na Cloudflare Pages, use:

- comando de build: `npm run build`
- diretório de saída: `dist`
- branch de produção: `main`

## Privacidade

Não há analytics, formulário, banco de dados ou scripts externos. O cookie `gui_consent` registra somente a escolha de privacidade; preferências visuais persistem localmente quando autorizadas.
