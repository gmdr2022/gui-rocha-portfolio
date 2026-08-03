# Gui Rocha — portal de produto e criação digital

Site estático multilíngue de Guilherme Rocha. As raízes localizadas apresentam sua atuação; as rotas de Projetos reúnem ClubAL, Maeve Roscaern, Sites, Codex Checkpoint, NEXUS, Local First Checklist e C7 Engineering System.

Produção: [gui-rocha.pages.dev](https://gui-rocha.pages.dev/)

## Princípios

- sem framework, telemetria, anúncios ou dependências de runtime;
- página Sobre canônica em `/`, `/en/` e `/es/`, com Projetos em rotas próprias;
- catálogo principal e cases de sites separados por `kind` e `catalogGroup` nos dados;
- catálogo orientado por `assets/data/projects.json`, com paridade localizada;
- coleção de sites orientada por `assets/data/sites.json`, com paridade em `sites.en.json` e `sites.es.json`;
- páginas curtas com navegação direta, teclado, toque e redução de movimento;
- tema, acessibilidade e consentimento funcionais no navegador;
- conceitos de Maeve sempre identificados como conceito, nunca como captura do jogo;
- build estático compatível com Cloudflare Pages no plano gratuito.

## Identidade e mídia

- a marca pessoal canônica fica em `assets/img/brand/`; o cabeçalho alterna assinaturas vetoriais conforme tema e largura;
- `assets/data/project-assets.json` registra a origem e informa quando um ícone é oficial, motivo visual ou apenas ilustração de catálogo;
- o ClubAL apresenta o aplicativo Windows como base atual, o Operador Web em validação e o clima como recurso integrado; a referência web é conceitual e genérica, e as telas legadas permanecem identificadas;
- CSS e JavaScript recebem versão de conteúdo; os demais assets usam a revalidação padrão da Cloudflare. O service worker atual apenas remove registros e caches legados.
- o portal não anuncia instalação nem mantém manifestos PWA; ele funciona como site de apresentação.

## Desenvolvimento

Requer Node.js 20 ou superior.

```powershell
npm run check
npm run serve -- --port 4173
```

`npm run build` cria `dist/` com apenas os arquivos públicos. Na Cloudflare Pages, use:

`npm run serve` recompila esse artefato e serve somente `dist/` em `127.0.0.1`; fontes, configuração e metadados Git não ficam expostos pelo preview.

- comando de build: `npm run build`
- diretório de saída: `dist`
- branch de produção: `main`

O domínio canônico e o e-mail público ficam centralizados em `content/pages.mjs`, no objeto `siteConfig`.

## Adicionar um site à coleção

1. Adicione o registro localizado aos três arquivos `assets/data/sites*.json`, mantendo o mesmo `id`, `slug` e `order`.
2. Armazene capa, galeria e ícone em `assets/img/`; não use imagens remotas em runtime.
3. Quando houver case próprio, inclua o bloco `case`. Sem esse bloco, `route` deve apontar para uma apresentação interna já existente.
4. Execute `npm run check`. Contagem, ordem, catálogo, navegação entre sites, rotas localizadas e sitemap são derivados dos dados.

## Privacidade

Não há analytics, formulário, banco de dados ou scripts externos. O cookie `gui_consent` registra somente a escolha de privacidade; preferências visuais persistem localmente quando autorizadas.
