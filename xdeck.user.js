// ==UserScript==
// @name         xdeck — painel para o X (Twitter)
// @namespace    xdeck
// @version      3.5
// @description  Layout full-width para o X + radar de novos posts: timeline larga, sidebar opcional, nav compacta, painel flutuante, midia como miniatura clicavel e um modal com estatisticas e lista dos posts novos.
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ==================================================================
   * 1. Estado — persistido em localStorage
   * ================================================================== */
  const KEY = 'xfw:v1';
  const DEFAULTS = {
    wide: true,         // timeline ocupa a largura livre
    hideSidebar: true,  // esconde a coluna direita (trends / quem seguir)
    compactNav: true,   // nav esquerda só com ícones
    media: 620,         // teto de largura para fotos/vídeos/cards (px)
    thumbs: true,       // mídia vira miniatura ao lado do texto
    thumb: 132,         // lado da miniatura (px)
    panelOpen: false,
  };
  const OFF = { wide: false, hideSidebar: false, compactNav: false, thumbs: false };

  let state = (() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  })();

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  /* ==================================================================
   * 2. CSS de layout
   *    Tudo condicionado a classes no <html>, então o toggle é instantâneo
   *    e o "desligado" devolve exatamente o layout original do X.
   * ================================================================== */

  // Ícone de pena do botão "Postar" (o X não usa <svg> nele, é só texto).
  const QUILL = "url('data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z"/></svg>'
  ) + "')";

  const CSS = `
:root {
  --xfw-media: ${DEFAULTS.media}px;
  --xfw-thumb: ${DEFAULTS.thumb}px;
  --xfw-quill: ${QUILL};
  --xfw-bg: #fff;
  --xfw-fg: #0f1419;
  --xfw-border: rgba(0,0,0,.14);
}
@media (prefers-color-scheme: dark) {
  :root { --xfw-bg:#16181c; --xfw-fg:#e7e9ea; --xfw-border:rgba(255,255,255,.16); }
}
/* o X guarda o tema no background inline do <body> */
body[style*="rgb(0, 0, 0)"], body[style*="rgb(21, 32, 43)"] {
  --xfw-bg:#16181c; --xfw-fg:#e7e9ea; --xfw-border:rgba(255,255,255,.16);
}

/* ---------------- coluna direita ---------------- */
html.xfw-nosidebar [data-testid="sidebarColumn"] { display: none !important; }

/* ---------------- nav esquerda compacta ---------------- */
html.xfw-compactnav header[role="banner"] {
  flex-grow: 0 !important;
  flex-basis: 88px !important;
  width: 88px !important;
}
html.xfw-compactnav header[role="banner"] > div,
html.xfw-compactnav header[role="banner"] > div > div,
html.xfw-compactnav header[role="banner"] > div > div > div { width: 88px !important; }

/* rótulos de texto dos itens de navegação */
html.xfw-compactnav header[role="banner"] nav a > div > div:nth-child(2),
html.xfw-compactnav header[role="banner"] nav button > div > div:nth-child(2),
html.xfw-compactnav header[role="banner"] [data-testid="SideNav_AccountSwitcher_Button"] > div > div:nth-child(2),
html.xfw-compactnav header[role="banner"] [data-testid="SideNav_AccountSwitcher_Button"] > div > div:nth-child(3) {
  display: none !important;
}

/* "Postar" vira botão circular com ícone */
html.xfw-compactnav header[role="banner"] [data-testid="SideNav_NewTweet_Button"] {
  width: 52px !important; min-width: 52px !important; height: 52px !important; padding: 0 !important;
}
html.xfw-compactnav header[role="banner"] [data-testid="SideNav_NewTweet_Button"] > div {
  position: relative !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  width: 52px !important; height: 52px !important;
}
html.xfw-compactnav header[role="banner"] [data-testid="SideNav_NewTweet_Button"] > div > * { visibility: hidden !important; }
html.xfw-compactnav header[role="banner"] [data-testid="SideNav_NewTweet_Button"] > div::after {
  content: ""; position: absolute; inset: 0; margin: auto;
  width: 26px; height: 26px; background: currentColor;
  -webkit-mask: var(--xfw-quill) center / 26px 26px no-repeat;
          mask: var(--xfw-quill) center / 26px 26px no-repeat;
}

/* ---------------- timeline em largura total ---------------- */
html.xfw-wide main[role="main"] { align-items: stretch !important; }
html.xfw-wide main[role="main"] > div,
html.xfw-wide main[role="main"] > div > div,
html.xfw-wide main[role="main"] > div > div > div { max-width: none !important; width: 100% !important; }
html.xfw-wide [data-testid="primaryColumn"] {
  max-width: none !important; width: 100% !important; flex-grow: 1 !important;
}
/* o X ainda aplica um teto interno de 600px em profundidades variáveis */
html.xfw-wide [data-testid="primaryColumn"] > div > div { max-width: none !important; }

/* --- mídia não acompanha a largura total (teto configurável) --- */
/* caixas de proporção (padding-bottom %/aspect-ratio inline) definem a ALTURA
   a partir da largura do PAI — por isso o teto vai no pai, não nelas. */
html.xfw-wide:not(.xfw-thumbs) [data-testid="primaryColumn"] div:has(> div[style*="padding-bottom"]),
html.xfw-wide:not(.xfw-thumbs) [data-testid="primaryColumn"] div:has(> div[style*="aspect-ratio"]),
html.xfw-wide:not(.xfw-thumbs) [data-testid="ScrollSnap-SwipeableList"],
html.xfw-wide:not(.xfw-thumbs) [data-testid="ScrollSnap-List"],
html.xfw-wide:not(.xfw-thumbs) article a:has([data-testid="tweetPhoto"]),
html.xfw-wide:not(.xfw-thumbs) article [data-testid="tweetPhoto"],
html.xfw-wide:not(.xfw-thumbs) article [data-testid="videoPlayer"],
html.xfw-wide:not(.xfw-thumbs) article [data-testid="videoComponent"],
html.xfw-wide:not(.xfw-thumbs) article [data-testid="card.wrapper"],
html.xfw-wide:not(.xfw-thumbs) article [data-testid="card.layoutLarge.media"] {
  max-width: var(--xfw-media) !important;
}
/* ---------------- mídia como miniatura ---------------- */
html.xfw-thumbs .xfw-col {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) var(--xfw-thumb) !important;
  grid-auto-rows: min-content !important;
  column-gap: 12px !important;
  align-items: start !important;
}
html.xfw-thumbs .xfw-col > * { grid-column: 1 !important; min-width: 0 !important; }
html.xfw-thumbs .xfw-col > .xfw-mediacell {
  grid-column: 2 !important;
  grid-row: 1 / span 20 !important;   /* atravessa cabeçalho, texto e ações */
  align-self: start !important;
  width: var(--xfw-thumb) !important;
  max-width: var(--xfw-thumb) !important;
  max-height: var(--xfw-thumb) !important;
  overflow: hidden !important;
  border-radius: 12px !important;
  position: relative !important;
  margin: 0 !important;
}
/* O botão cobre a miniatura inteira: em modo miniatura ninguém quer dar
   play num vídeo de 132px, e assim os controles do X não roubam o clique.
   O distintivo fica no TOPO — embaixo é onde mora a barra de progresso. */
html.xfw-thumbs .xfw-open {
  position: absolute; inset: 0; z-index: 2147480000; display: block;
  background: transparent; border: 0; padding: 0; cursor: pointer;
}
html.xfw-thumbs .xfw-open::after {
  content: "⤢"; position: absolute; right: 4px; top: 4px;
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(0,0,0,.65); color: #fff;
  font: 12px/20px system-ui, sans-serif; text-align: center;
}
html.xfw-thumbs .xfw-open:hover { background: rgba(0,0,0,.18); }
html.xfw-thumbs .xfw-open:hover::after { background: #1d9bf0; }
/* com o modo desligado o botão não pode sobrar como um retângulo solto */
html:not(.xfw-thumbs) .xfw-open { display: none !important; }

/* ---------------- visualizador de mídia ---------------- */
/* Vai no <body>: a timeline virtualizada tem ancestral com transform,
   e position:fixed lá dentro ancoraria nele, não na viewport. */
#xfw-light { position: fixed; inset: 0; z-index: 2147483640; display: flex; align-items: center; justify-content: center; }
#xfw-light[hidden] { display: none !important; }
#xfw-light .xfw-lb-bd { position: absolute; inset: 0; background: rgba(0,0,0,.88); }
#xfw-light .xfw-stage {
  position: relative; max-width: 92vw; max-height: 88vh;
  display: flex; align-items: center; justify-content: center;
  background: #000; border-radius: 12px; overflow: hidden;
}
#xfw-light .xfw-stage:fullscreen {
  width: 100vw !important; height: 100vh !important;
  max-width: 100vw; max-height: 100vh; border-radius: 0;
}
#xfw-light img.xfw-lb-img { max-width: 92vw; max-height: 88vh; display: block; object-fit: contain; }
#xfw-light .xfw-stage:fullscreen img.xfw-lb-img { max-width: 100vw; max-height: 100vh; }
/* o componente de vídeo do X é height:100% até o fim — quem dá altura é o palco */
#xfw-light .xfw-stage > [data-testid="videoComponent"] {
  width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important;
}
#xfw-light .xfw-lb-bar {
  position: absolute; top: 0; right: 0; left: 0; z-index: 3;
  display: flex; gap: 8px; align-items: center; justify-content: flex-end;
  padding: 10px 12px; background: linear-gradient(rgba(0,0,0,.55), transparent);
}
#xfw-light .xfw-lb-bar button {
  width: 34px; height: 34px; padding: 0; border: 0; border-radius: 999px;
  background: rgba(0,0,0,.55); color: #fff; font: 15px/34px system-ui, sans-serif; cursor: pointer;
}
#xfw-light .xfw-lb-bar button:hover { background: #1d9bf0; }
#xfw-light .xfw-lb-n { margin-right: auto; padding-left: 4px; color: #fff; font: 12px/1 system-ui, sans-serif; opacity: .8; }
#xfw-light .xfw-nav {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 3;
  width: 40px; height: 64px; border: 0; border-radius: 8px;
  background: rgba(0,0,0,.5); color: #fff; font: 20px/1 system-ui, sans-serif; cursor: pointer;
}
#xfw-light .xfw-nav:hover { background: #1d9bf0; }
#xfw-light .xfw-prev { left: 8px; }
#xfw-light .xfw-next { right: 8px; }
#xfw-light .xfw-nav[hidden] { display: none !important; }
/* enquanto o vídeo está emprestado ao visualizador, a linha não colapsa */
html.xfw-thumbs .xfw-mediacell.xfw-emprestado { min-height: var(--xfw-thumb) !important; background: rgba(127,127,127,.15); }

/* A UI de vídeo do X não funciona fora do <article>: só a cadeia do <video>
   fica visível, o resto sai de cena e quem controla é a barra abaixo. */
#xfw-light .xfw-stage [data-testid="videoComponent"] *:not(.xfw-vkeep) { display: none !important; }
#xfw-light .xfw-vclick { position: absolute; inset: 0; z-index: 4; cursor: pointer; }
#xfw-light .xfw-vc {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 6;
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: linear-gradient(transparent, rgba(0,0,0,.78));
  color: #fff; font: 12px/1 system-ui, sans-serif;
}
#xfw-light .xfw-vc button {
  width: 30px; height: 30px; padding: 0; border: 0; border-radius: 999px; flex: 0 0 auto;
  background: rgba(255,255,255,.15); color: #fff; font: 14px/30px system-ui, sans-serif; cursor: pointer;
}
#xfw-light .xfw-vc button:hover { background: #1d9bf0; }
#xfw-light .xfw-vc .xfw-t { flex: 0 0 auto; min-width: 36px; text-align: center; opacity: .85; font-variant-numeric: tabular-nums; }
#xfw-light .xfw-vc input[type="range"] { accent-color: #1d9bf0; cursor: pointer; height: 4px; }
#xfw-light .xfw-vc .xfw-seek { flex: 1 1 auto; min-width: 60px; }
#xfw-light .xfw-vc .xfw-vol { flex: 0 0 84px; }

/* avatar do perfil escala com a largura da capa — trava no tamanho normal */
html.xfw-wide [data-testid="primaryColumn"] [data-testid^="UserAvatar-Container"] {
  max-width: 140px !important;
}

/* ==================================================================
 * 3. Painel flutuante
 * ================================================================== */
#xfw-root {
  position: fixed; right: 18px; bottom: 150px; z-index: 2147483000;
  font: 13px/1.35 -apple-system, "Segoe UI", Roboto, system-ui, sans-serif;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
}
#xfw-toggle {
  width: 44px; height: 44px; border-radius: 999px;
  border: 1px solid var(--xfw-border); background: var(--xfw-bg); color: var(--xfw-fg);
  cursor: pointer; display: grid; place-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,.18); transition: transform .12s ease;
}
#xfw-toggle:hover { transform: scale(1.06); }
#xfw-toggle svg { width: 20px; height: 20px; display: block; }
#xfw-panel {
  width: 248px; padding: 12px 14px 14px; border-radius: 14px;
  border: 1px solid var(--xfw-border); background: var(--xfw-bg); color: var(--xfw-fg);
  box-shadow: 0 8px 28px rgba(0,0,0,.22);
}
#xfw-panel[hidden] { display: none !important; }
#xfw-panel h4 {
  margin: 0 0 10px; font-size: 12px; font-weight: 700;
  letter-spacing: .04em; text-transform: uppercase; opacity: .6;
}
#xfw-panel label { display: flex; align-items: center; gap: 9px; padding: 6px 0; cursor: pointer; user-select: none; }
#xfw-panel input[type="checkbox"] { width: 15px; height: 15px; accent-color: #1d9bf0; cursor: pointer; }
#xfw-panel .xfw-range { padding-top: 10px; margin-top: 8px; border-top: 1px solid var(--xfw-border); }
#xfw-panel .xfw-range span { display: flex; justify-content: space-between; opacity: .7; margin-bottom: 6px; }
#xfw-panel input[type="range"] { width: 100%; accent-color: #1d9bf0; cursor: pointer; }
#xfw-reset {
  margin-top: 10px; width: 100%; padding: 6px; border-radius: 8px;
  border: 1px solid var(--xfw-border); background: transparent; color: inherit;
  font: inherit; cursor: pointer; opacity: .75;
}
#xfw-reset:hover { opacity: 1; }
#xfw-hint { margin-top: 8px; font-size: 11px; opacity: .5; text-align: center; }

/* ---------------- botão de radar dentro do painel ---------------- */
#xfw-open-feed {
  margin-top: 10px; width: 100%; padding: 8px; border-radius: 8px;
  border: 1px solid transparent; background: #1d9bf0; color: #fff;
  font: 600 13px/1 inherit; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 7px;
}
#xfw-open-feed:hover { filter: brightness(1.08); }
#xfw-badge {
  position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px;
  padding: 0 5px; border-radius: 999px; background: #1d9bf0; color: #fff;
  font: 700 10px/18px -apple-system, system-ui, sans-serif; text-align: center;
  box-shadow: 0 0 0 2px var(--xfw-bg); pointer-events: none;
}
#xfw-badge[hidden] { display: none !important; }
#xfw-toggle { position: relative; }

/* ---------------- modal ---------------- */
#xfw-modal { position: fixed; inset: 0; z-index: 2147483600; }
#xfw-modal[hidden] { display: none !important; }
#xfw-modal .xfw-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); }
#xfw-modal .xfw-sheet {
  position: absolute; inset: 3vh 3vw; margin: auto; max-width: 1280px;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--xfw-bg); color: var(--xfw-fg);
  border: 1px solid var(--xfw-border); border-radius: 16px;
  box-shadow: 0 24px 70px rgba(0,0,0,.4);
  font: 14px/1.45 -apple-system, "Segoe UI", Roboto, system-ui, sans-serif;
}
#xfw-modal header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--xfw-border); flex: 0 0 auto;
}
#xfw-modal header h3 { margin: 0; font-size: 16px; font-weight: 700; }
#xfw-modal .xfw-head-actions { display: flex; gap: 8px; align-items: center; }
#xfw-modal header button {
  border: 1px solid var(--xfw-border); background: transparent; color: inherit;
  border-radius: 8px; padding: 5px 10px; font: inherit; font-size: 12px; cursor: pointer;
}
#xfw-modal header button:hover { background: rgba(127,127,127,.14); }
#xfw-modal #xfw-m-close { width: 30px; padding: 5px 0; font-size: 14px; }

/* cards de estatística */
#xfw-modal .xfw-cards {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px; padding: 14px 18px; flex: 0 0 auto;
}
#xfw-modal .xfw-card {
  border: 1px solid var(--xfw-border); border-radius: 12px; padding: 11px 13px;
  background: rgba(127,127,127,.05);
}
#xfw-modal .xfw-card h5 {
  margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .05em;
  text-transform: uppercase; opacity: .55;
}
#xfw-modal .xfw-row { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; font-size: 13px; }
#xfw-modal .xfw-row span { opacity: .7; }
#xfw-modal .xfw-row b { font-variant-numeric: tabular-nums; }
#xfw-modal .xfw-row big { font-size: 19px; font-weight: 700; }
#xfw-modal .xfw-sub { margin: 8px 0 5px; font-size: 11px; opacity: .5; text-transform: uppercase; letter-spacing: .04em; }
#xfw-modal .xfw-chips { display: flex; flex-wrap: wrap; gap: 5px; }
#xfw-modal .xfw-chips i {
  font-style: normal; font-size: 11.5px; padding: 2px 7px; border-radius: 999px;
  background: rgba(29,155,240,.12); color: #1d9bf0; white-space: nowrap;
}
#xfw-modal .xfw-chips em { font-style: normal; opacity: .6; margin-left: 3px; }
#xfw-modal .xfw-empty { opacity: .4; font-size: 12px; }
#xfw-modal .xfw-empty-big { padding: 40px 18px; text-align: center; opacity: .6; }
#xfw-modal .xfw-empty-big small { display: block; margin-top: 8px; font-size: 12px; opacity: .8; }

/* controles */
#xfw-modal .xfw-controls {
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  padding: 10px 18px; border-top: 1px solid var(--xfw-border);
  border-bottom: 1px solid var(--xfw-border); flex: 0 0 auto;
}
#xfw-modal .xfw-controls input[type="search"] { flex: 1 1 260px; min-width: 180px; }
#xfw-modal .xfw-controls input[type="search"],
#xfw-modal .xfw-controls select {
  border: 1px solid var(--xfw-border); background: transparent; color: inherit;
  border-radius: 8px; padding: 6px 9px; font: inherit; font-size: 13px;
}
#xfw-modal .xfw-check { display: flex; align-items: center; gap: 6px; font-size: 13px; opacity: .85; cursor: pointer; }
#xfw-modal .xfw-check input { accent-color: #1d9bf0; cursor: pointer; }
#xfw-modal #xfw-m-count { margin-left: auto; font-size: 12px; opacity: .55; font-variant-numeric: tabular-nums; }

/* lista */
#xfw-modal #xfw-m-list { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; }
#xfw-modal .xfw-post {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 9px 18px; border-bottom: 1px solid var(--xfw-border);
  color: inherit; text-decoration: none;
}
#xfw-modal .xfw-post:hover { background: rgba(127,127,127,.09); }
#xfw-modal .xfw-post img, #xfw-modal .xfw-noav {
  width: 26px; height: 26px; border-radius: 999px; flex: 0 0 26px;
  background: rgba(127,127,127,.2); object-fit: cover;
}
#xfw-modal .xfw-post-body { flex: 1 1 auto; min-width: 0; }
#xfw-modal .xfw-post-head { display: flex; gap: 5px; align-items: center; font-size: 12.5px; flex-wrap: wrap; }
#xfw-modal .xfw-post-head b { font-weight: 700; }
#xfw-modal .xfw-post-head span { opacity: .55; }
#xfw-modal .xfw-v { font-style: normal; color: #1d9bf0; font-size: 11px; }
#xfw-modal .xfw-tag {
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: rgba(127,127,127,.16); opacity: .8 !important;
}
#xfw-modal .xfw-post-text {
  font-size: 13.5px; white-space: pre-wrap; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}
#xfw-modal .xfw-post-metrics {
  display: flex; gap: 12px; flex: 0 0 auto; font-size: 11.5px; opacity: .6;
  font-variant-numeric: tabular-nums; padding-top: 2px;
}
@media (max-width: 900px) {
  #xfw-modal .xfw-sheet { inset: 0; border-radius: 0; }
  #xfw-modal .xfw-post-metrics { display: none; }
}

/* aviso de novos posts enquanto o modal está aberto */
#xfw-modal #xfw-m-new {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 18px; font-size: 13px;
  background: rgba(29,155,240,.12); color: #1d9bf0;
  border-bottom: 1px solid var(--xfw-border); flex: 0 0 auto;
}
#xfw-modal #xfw-m-new[hidden] { display: none !important; }
#xfw-modal #xfw-m-new b { font-weight: 700; }
#xfw-modal #xfw-m-new button {
  border: 1px solid currentColor; background: transparent; color: inherit;
  border-radius: 999px; padding: 3px 11px; font: inherit; font-size: 12px; cursor: pointer;
}
#xfw-modal #xfw-m-new button:hover { background: rgba(29,155,240,.18); }
#xfw-modal #xfw-m-new button[hidden] { display: none !important; }
#xfw-modal #xfw-m-new span { margin-right: auto; }

/* marca de não lido na linha */
#xfw-modal .xfw-new {
  font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
  padding: 1px 6px; border-radius: 999px;
  background: #1d9bf0; color: #fff; opacity: 1 !important;
}

/* destaques */
#xfw-modal .xfw-hi {
  display: block; padding: 5px 0; color: inherit; text-decoration: none;
  border-top: 1px solid var(--xfw-border);
}
#xfw-modal .xfw-hi:first-of-type { border-top: 0; }
#xfw-modal .xfw-hi:hover em { text-decoration: underline; }
#xfw-modal .xfw-hi span { display: block; font-size: 11.5px; color: #1d9bf0; }
#xfw-modal .xfw-hi em {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; font-style: normal; font-size: 12.5px;
}
#xfw-modal .xfw-hi i { font-style: normal; font-size: 11px; opacity: .55; }
`;

  /* ==================================================================
   * 4. Injeção + aplicação
   * ================================================================== */
  function injectStyle() {
    if (document.getElementById('xfw-style')) return;
    const el = document.createElement('style');
    el.id = 'xfw-style';
    el.textContent = CSS;
    (document.head || document.documentElement).appendChild(el);
  }

  function apply() {
    const r = document.documentElement;
    r.classList.toggle('xfw-wide', !!state.wide);
    r.classList.toggle('xfw-nosidebar', !!state.hideSidebar);
    r.classList.toggle('xfw-compactnav', !!state.compactNav);
    r.classList.toggle('xfw-thumbs', !!state.thumbs);
    r.style.setProperty('--xfw-media', state.media + 'px');
    r.style.setProperty('--xfw-thumb', state.thumb + 'px');
    save();
    if (state.thumbs) tagTweets();
  }

  /* ------------------------------------------------------------------
   * O teto de 600px do X vem de uma classe atômica gerada no build
   * (hoje `r-1ye8kvj`). O nome muda entre releases, então em vez de
   * fixá-lo, descobrimos em runtime qual classe produz max-width ~600px.
   * ------------------------------------------------------------------ */
  const CAP_KEY = 'xfw:capclass';
  let capApplied = false;

  function classGivesCap(cls) {
    const probe = document.createElement('div');
    probe.className = cls;
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
    document.body.appendChild(probe);
    const mw = parseFloat(getComputedStyle(probe).maxWidth);
    probe.remove();
    return mw >= 480 && mw <= 720;
  }

  function writeCapRule(classes) {
    document.getElementById('xfw-cap')?.remove();
    if (!classes.length) return;
    const sel = classes
      .map(c => `html.xfw-wide [data-testid="primaryColumn"] .${c}, html.xfw-wide [data-testid="primaryColumn"].${c}`)
      .join(',\n');
    const el = document.createElement('style');
    el.id = 'xfw-cap';
    el.textContent = `${sel} { max-width: none !important; }`;
    document.head.appendChild(el);
  }

  function detectCap() {
    if (capApplied || !document.body) return;
    const col = document.querySelector('[data-testid="primaryColumn"]');
    if (!col) return;

    // tenta o cache primeiro (evita varrer o DOM toda navegação)
    let cached = [];
    try { cached = JSON.parse(localStorage.getItem(CAP_KEY) || '[]'); } catch {}
    if (cached.length && cached.every(classGivesCap)) {
      writeCapRule(cached);
      capApplied = true;
      return;
    }

    const seen = new Set();
    [col, ...col.querySelectorAll('*')].forEach(el => {
      const cn = el.getAttribute && el.getAttribute('class');
      if (!cn) return;
      cn.split(/\s+/).forEach(c => { if (c.startsWith('r-')) seen.add(c); });
    });

    const found = [...seen].filter(classGivesCap);
    if (found.length) {
      try { localStorage.setItem(CAP_KEY, JSON.stringify(found)); } catch {}
      writeCapRule(found);
      capApplied = true;
    }
  }

  /* ==================================================================
   * 5. Painel
   * ================================================================== */
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"/><path d="M21 5v14"/><path d="M7 12h10"/><path d="M7 12l3-3"/><path d="M7 12l3 3"/><path d="M17 12l-3-3"/><path d="M17 12l-3 3"/></svg>';

  function buildPanel() {
    if (document.getElementById('xfw-root') || !document.body) return;

    const root = document.createElement('div');
    root.id = 'xfw-root';
    root.innerHTML =
      '<div id="xfw-panel"' + (state.panelOpen ? '' : ' hidden') + '>' +
        '<h4>Layout do X</h4>' +
        '<label><input type="checkbox" data-k="wide">Largura total</label>' +
        '<label><input type="checkbox" data-k="hideSidebar">Ocultar sidebar direita</label>' +
        '<label><input type="checkbox" data-k="compactNav">Nav esquerda compacta</label>' +
        '<label><input type="checkbox" data-k="thumbs">Mídia como miniatura</label>' +
        '<div class="xfw-range" id="xfw-r-media"><span>Largura máx. da mídia<b id="xfw-mediaval"></b></span>' +
        '<input type="range" id="xfw-media" min="320" max="1200" step="20"></div>' +
        '<div class="xfw-range" id="xfw-r-thumb"><span>Tamanho da miniatura<b id="xfw-thumbval"></b></span>' +
        '<input type="range" id="xfw-thumb" min="72" max="320" step="4"></div>' +
        '<button id="xfw-open-feed" type="button">Radar de novos posts</button>' +
        '<button id="xfw-reset" type="button">Restaurar padrão do X</button>' +
        '<div id="xfw-hint">Alt + W alterna tudo</div>' +
      '</div>' +
      '<button id="xfw-toggle" type="button" title="Layout do X (Alt+W)" aria-label="Opções de layout">' + ICON +
        '<span id="xfw-badge" hidden></span>' +
      '</button>';

    document.body.appendChild(root);

    const panel = root.querySelector('#xfw-panel');
    const range = root.querySelector('#xfw-media');
    const val   = root.querySelector('#xfw-mediaval');
    const tRange = root.querySelector('#xfw-thumb');
    const tVal   = root.querySelector('#xfw-thumbval');

    const sync = () => {
      root.querySelectorAll('input[data-k]').forEach(i => { i.checked = !!state[i.dataset.k]; });
      range.value = state.media;
      val.textContent = state.media + 'px';
      tRange.value = state.thumb;
      tVal.textContent = state.thumb + 'px';
      // os dois sliders controlam a mesma coisa em modos diferentes
      root.querySelector('#xfw-r-media').hidden = !!state.thumbs;
      root.querySelector('#xfw-r-thumb').hidden = !state.thumbs;
    };
    sync();
    root._sync = sync;
    updateBadge();

    root.querySelector('#xfw-toggle').addEventListener('click', () => {
      state.panelOpen = panel.hidden;
      panel.hidden = !panel.hidden;
      save();
    });

    root.querySelectorAll('input[data-k]').forEach(i => {
      i.addEventListener('change', () => { state[i.dataset.k] = i.checked; apply(); sync(); });
    });

    range.addEventListener('input', () => {
      state.media = +range.value;
      val.textContent = state.media + 'px';
      apply();
    });

    tRange.addEventListener('input', () => {
      state.thumb = +tRange.value;
      tVal.textContent = state.thumb + 'px';
      apply();
    });

    root.querySelector('#xfw-open-feed').addEventListener('click', () => {
      panel.hidden = true; state.panelOpen = false; save();
      openModal();
    });

    root.querySelector('#xfw-reset').addEventListener('click', () => {
      state = { ...state, ...OFF };
      apply(); sync();
    });

    document.addEventListener('click', (e) => {
      if (!panel.hidden && !root.contains(e.target)) {
        panel.hidden = true; state.panelOpen = false; save();
      }
    }, true);
  }

  // Alt+W: liga/desliga tudo de uma vez
  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== 'w' && e.key !== 'W') return;
    const on = !(state.wide && state.hideSidebar && state.compactNav);
    state.wide = state.hideSidebar = state.compactNav = on;
    apply();
    document.getElementById('xfw-root')?._sync?.();
  });

  /* ==================================================================
   * 6. Mídia como miniatura
   *    Em largura total, uma foto de 620px empurra a barra de ações
   *    600px para baixo e cabem 2 posts na tela. Aqui a coluna de
   *    conteúdo do tweet vira um grid de 2 colunas: texto à esquerda,
   *    miniatura à direita, ocupando a altura do post inteiro.
   *
   *    O CSS sozinho não consegue isolar essa coluna (:has() aninhado é
   *    proibido, e todo ancestral casaria com o mesmo seletor), então
   *    marcamos os dois elementos por JS.
   * ================================================================== */
  const MEDIA_SEL = '[data-testid="tweetPhoto"],[data-testid="videoComponent"],[data-testid="card.wrapper"]';

  const permalinkDe = (art) => [...art.querySelectorAll('a[href*="/status/"]')]
    .find(a => /\/status\/\d+$/.test(a.getAttribute('href') || ''));

  /* ---------- visualizador ----------
   * Abre a mídia centralizada, com tela cheia opcional.
   *  - Fotos: o X serve a miniatura como ?name=120x120; trocamos por
   *    name=large e montamos nosso próprio <img>.
   *  - Vídeos: src e <source> são blob: (MSE), então não dá para recriar o
   *    player — movemos o elemento original do X para o palco e devolvemos
   *    ao fechar. Como ele é height:100% até o fim, quem precisa ter altura
   *    é o palco, calculada da proporção real do vídeo.
   *
   *    A UI do X não sobrevive à mudança de contexto: fora do <article> o
   *    botão de play não dispara (nem com clique real) e a barra de
   *    controles sequer é montada. O elemento <video>, porém, continua
   *    íntegro — readyState 4 e play() funciona. Então escondemos a UI dele
   *    e dirigimos o <video> direto, com controles próprios.
   */
  const lightbox = (() => {
    let el = null, fotos = [], idx = 0, devolver = null, artAtual = null, vid = null;

    const grande = (src) => {
      try { const u = new URL(src); if (u.searchParams.has('name')) u.searchParams.set('name', 'large'); return u.href; }
      catch { return src; }
    };
    const palco = () => el.querySelector('.xfw-stage');

    function montar() {
      el = document.createElement('div');
      el.id = 'xfw-light';
      el.hidden = true;
      el.innerHTML =
        '<div class="xfw-lb-bd"></div>' +
        '<div class="xfw-stage">' +
          '<div class="xfw-lb-bar">' +
            '<span class="xfw-lb-n"></span>' +
            '<button class="xfw-lb-go" title="Abrir o post no X">\u2197</button>' +
            '<button class="xfw-lb-fs" title="Tela cheia (F)">\u26f6</button>' +
            '<button class="xfw-lb-cl" title="Fechar (Esc)">\u2715</button>' +
          '</div>' +
          '<button class="xfw-nav xfw-prev" hidden>\u2039</button>' +
          '<button class="xfw-nav xfw-next" hidden>\u203a</button>' +
        '</div>';
      document.body.appendChild(el);

      el.querySelector('.xfw-lb-bd').addEventListener('click', fechar);
      el.querySelector('.xfw-lb-cl').addEventListener('click', fechar);
      el.querySelector('.xfw-lb-fs').addEventListener('click', telaCheia);
      el.querySelector('.xfw-lb-go').addEventListener('click', () => {
        const a = artAtual && permalinkDe(artAtual);
        fechar();
        a?.click();
      });
      el.querySelector('.xfw-prev').addEventListener('click', (e) => { e.stopPropagation(); ir(-1); });
      el.querySelector('.xfw-next').addEventListener('click', (e) => { e.stopPropagation(); ir(1); });

      document.addEventListener('keydown', (e) => {
        if (!el || el.hidden) return;
        if (e.key === 'Escape') { if (!document.fullscreenElement) fechar(); }  // 1º Esc sai da tela cheia
        else if (e.key === 'f' || e.key === 'F') telaCheia();
        else if (e.key === ' ' && vid) { e.preventDefault(); vid.paused ? vid.play() : vid.pause(); }
        else if (e.key === 'ArrowLeft')  { if (vid) vid.currentTime = Math.max(0, vid.currentTime - 5); else ir(-1); }
        else if (e.key === 'ArrowRight') { if (vid) vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 5); else ir(1); }
      });
      addEventListener('resize', () => { if (el && !el.hidden && devolver) dimensionarVideo(); });
    }

    function telaCheia() {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else palco().requestFullscreen?.().catch(() => {});
    }

    function dimensionarVideo() {
      const v = palco().querySelector('video');
      const s = palco();
      const ar = (v && v.videoWidth && v.videoHeight) ? v.videoHeight / v.videoWidth : 9 / 16;
      let w = Math.min(innerWidth * 0.92, 1100), h = w * ar;
      if (h > innerHeight * 0.88) { h = innerHeight * 0.88; w = h / ar; }
      s.style.width = Math.round(w) + 'px';
      s.style.height = Math.round(h) + 'px';
    }

    const mmss = (n) => { n = Math.max(0, n | 0); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };

    function montarControles(v) {
      const s = palco();

      const capa = document.createElement('div');
      capa.className = 'xfw-vclick';
      s.appendChild(capa);

      const bar = document.createElement('div');
      bar.className = 'xfw-vc';
      bar.innerHTML =
        '<button class="xfw-pp" title="Reproduzir / pausar (espaço)">❚❚</button>' +
        '<span class="xfw-t xfw-tc">0:00</span>' +
        '<input class="xfw-seek" type="range" min="0" max="100" step="0.1" value="0">' +
        '<span class="xfw-t xfw-td">0:00</span>' +
        '<button class="xfw-mu" title="Mudo">🔊</button>' +
        '<input class="xfw-vol" type="range" min="0" max="1" step="0.05" value="1">';
      s.appendChild(bar);

      const pp = bar.querySelector('.xfw-pp'), seek = bar.querySelector('.xfw-seek');
      const tc = bar.querySelector('.xfw-tc'), td = bar.querySelector('.xfw-td');
      const mu = bar.querySelector('.xfw-mu'), vol = bar.querySelector('.xfw-vol');
      let arrastando = false;

      const syncPP = () => { pp.textContent = v.paused ? '▶' : '❚❚'; };
      const syncMu = () => { mu.textContent = (v.muted || v.volume === 0) ? '🔇' : '🔊'; };
      const syncT  = () => {
        if (arrastando) return;
        seek.max = v.duration || 100;
        seek.value = v.currentTime;
        tc.textContent = mmss(v.currentTime);
        td.textContent = mmss(v.duration || 0);
      };

      v.addEventListener('timeupdate', syncT);
      v.addEventListener('durationchange', syncT);
      v.addEventListener('play', syncPP);
      v.addEventListener('pause', syncPP);
      v.addEventListener('volumechange', syncMu);

      const alterna = () => { v.paused ? v.play().catch(() => {}) : v.pause(); };
      pp.addEventListener('click', alterna);
      capa.addEventListener('click', alterna);
      seek.addEventListener('pointerdown', () => { arrastando = true; });
      seek.addEventListener('pointerup',   () => { arrastando = false; v.currentTime = +seek.value; });
      seek.addEventListener('input',       () => { tc.textContent = mmss(+seek.value); });
      mu.addEventListener('click', () => {
        v.muted = !v.muted;
        if (!v.muted && v.volume === 0) v.volume = 1;
        vol.value = v.muted ? 0 : v.volume;
      });
      vol.addEventListener('input', () => { v.volume = +vol.value; v.muted = (+vol.value === 0); });

      vol.value = v.muted ? 0 : v.volume;
      syncPP(); syncMu(); syncT();
    }

    function limpar() {
      if (devolver) { try { devolver(); } catch {} devolver = null; }
      palco().querySelectorAll('img.xfw-lb-img, .xfw-vc, .xfw-vclick').forEach(n => n.remove());
      palco().style.width = '';
      palco().style.height = '';
      vid = null;
    }

    function ir(d) {
      if (fotos.length < 2) return;
      idx = (idx + d + fotos.length) % fotos.length;
      pintar();
    }

    function pintar() {
      palco().querySelectorAll('img.xfw-lb-img').forEach(n => n.remove());
      const img = document.createElement('img');
      img.className = 'xfw-lb-img';
      img.src = fotos[idx];
      palco().appendChild(img);
      el.querySelector('.xfw-lb-n').textContent = fotos.length > 1 ? (idx + 1) + ' / ' + fotos.length : '';
      el.querySelector('.xfw-prev').hidden = fotos.length < 2;
      el.querySelector('.xfw-next').hidden = fotos.length < 2;
    }

    function fechar() {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      limpar();
      artAtual = null;
      if (el) el.hidden = true;
    }

    function abrir(cell, art) {
      if (!el) montar();
      limpar();
      fotos = []; idx = 0; artAtual = art;

      const comp = cell.querySelector('[data-testid="videoComponent"]');
      if (comp) {
        const marca = document.createComment('xfw-v');
        comp.parentNode.insertBefore(marca, comp);
        cell.classList.add('xfw-emprestado');
        palco().appendChild(comp);

        const v = comp.querySelector('video');
        vid = v || null;

        // Só a cadeia do <video> fica visível; o resto da UI do X está inerte
        // aqui e apenas atrapalha (botão de play morto sobre a imagem).
        const cadeia = [];
        for (let n = v; n && n !== comp; n = n.parentElement) { n.classList.add('xfw-vkeep'); cadeia.push(n); }

        devolver = () => {
          cadeia.forEach(n => n.classList.remove('xfw-vkeep'));
          if (v) { v.pause(); v.muted = true; }        // volta ao estado da timeline
          // a timeline é virtualizada: se a célula sumiu, a marca não tem pai
          if (marca.parentNode) marca.parentNode.insertBefore(comp, marca);
          else comp.remove();
          marca.remove();
          cell.classList.remove('xfw-emprestado');
        };

        el.querySelector('.xfw-lb-n').textContent = '';
        el.querySelector('.xfw-prev').hidden = true;
        el.querySelector('.xfw-next').hidden = true;
        el.hidden = false;
        dimensionarVideo();
        // a proporção só existe depois dos metadados
        v?.addEventListener('loadedmetadata', dimensionarVideo, { once: true });

        if (v) {
          montarControles(v);
          // o clique no ⤢ é gesto do usuário, então dá para começar com som;
          // se a política do navegador recusar, cai para mudo.
          v.muted = false;
          v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
        }
        return true;
      }

      const imgs = [...cell.querySelectorAll('[data-testid="tweetPhoto"] img')].map(n => grande(n.src));
      if (imgs.length) { fotos = imgs; pintar(); el.hidden = false; return true; }

      return false;   // card de link, sem mídia própria
    }

    return { abrir, fechar };
  })();

  function abrirMidia(cell, art) {
    if (lightbox.abrir(cell, art)) return;
    // sem foto nem vídeo (card de link): abre o post. Filtramos /status/<id>
    // exato porque o artigo também contém /status/<id>/analytics e afins.
    permalinkDe(art)?.click();
  }

  function tagTweets() {
    if (!state.thumbs) return;
    for (const art of document.querySelectorAll('article[data-testid="tweet"]')) {
      if (art.querySelector('.xfw-emprestado')) continue;   // vídeo está no visualizador

      const media = art.querySelector(MEDIA_SEL);
      const ja = art.querySelector('.xfw-mediacell');

      if (ja) {
        // o X recicla os nós da timeline virtualizada; revalida antes de pular
        if (media && ja.contains(media) && ja.querySelector(':scope > .xfw-open')) continue;
        ja.classList.remove('xfw-mediacell');
        ja.querySelector(':scope > .xfw-open')?.remove();
        art.querySelector('.xfw-col')?.classList.remove('xfw-col');
      }
      if (!media) continue;

      // sobe da mídia até o nível onde ela é irmã do texto ou da barra de ações
      const txt = art.querySelector('[data-testid="tweetText"]');
      let cell = media, col = null;
      while (cell && cell.parentElement && cell.parentElement !== art) {
        const p = cell.parentElement;
        const irmaoUtil = [...p.children].some(c =>
          c !== cell && (c.querySelector('[role="group"]') || (txt && c.contains(txt))));
        if (irmaoUtil) { col = p; break; }
        cell = p;
      }
      if (!col) continue;

      col.classList.add('xfw-col');
      cell.classList.add('xfw-mediacell');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'xfw-open';
      btn.title = 'Abrir mídia';
      btn.setAttribute('aria-label', 'Abrir mídia');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirMidia(cell, art);
      }, true);
      cell.appendChild(btn);
    }
  }

  /* ==================================================================
   * 7. Radar de novos posts
   *    O X entrega a timeline por XHR em /i/api/graphql/.../HomeTimeline
   *    (e HomeLatestTimeline). Interceptamos passivamente: nada é
   *    requisitado por nós, nada no DOM é tocado. O buffer é só um
   *    espelho do que o X já baixou.
   * ================================================================== */
  const BUF_KEY  = 'xfw:buffer';
  const BUF_MAX  = 1200;          // posts guardados
  const BUF_TTL  = 36 * 3600e3;   // 36h

  let buffer = (() => {
    try { return JSON.parse(localStorage.getItem(BUF_KEY) || '[]'); } catch { return []; }
  })();

  const saveBuffer = () => { try { localStorage.setItem(BUF_KEY, JSON.stringify(buffer)); } catch {} };

  // O que conta como "novo".
  //
  // Duas tentativas anteriores falharam. Cortar por created_at não serve: a
  // timeline do X não é cronológica e um poll traz posts com horário anterior
  // ao topo já renderizado — isso descartava quase tudo (badge 5, pill 35).
  // Inferir a origem pelo cursor da requisição também não serve: medindo o
  // tráfego real, o poll do X refaz a busca do topo SEM cursor e compara do
  // lado dele, então poll e render são indistinguíveis na requisição.
  //
  // O sinal exato é outro, e é observável direto: um post está lido quando o X
  // o renderiza na timeline. Todo post entra no buffer como não lido, e some
  // da conta assim que aparece como <article> na tela. Sobra exatamente o que
  // o X baixou e ainda não mostrou — o conjunto do "Mostrar N posts".
  const isNovo = (p) => p.novo === 1;

  /* ---------- parsing ---------- */
  function instructionsOf(root) {
    const out = [];
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (Array.isArray(n.instructions)) out.push(...n.instructions);
      for (const k in n) walk(n[k]);
    };
    walk(root);
    return out;
  }

  const unwrap = (r) => (r && r.__typename === 'TweetWithVisibilityResults') ? r.tweet : r;

  function toPost(result) {
    let t = unwrap(result);
    if (!t || !t.rest_id) return null;

    // Retweet: o legacy.full_text do repost vem truncado ("RT @x: ..."),
    // então usamos o tweet original e guardamos quem repostou.
    let rb = '';
    const orig = unwrap(t.legacy?.retweeted_status_result?.result);
    if (orig && orig.rest_id) {
      rb = t.core?.user_results?.result?.core?.screen_name
        ?? t.core?.user_results?.result?.legacy?.screen_name ?? '';
      t = orig;
    }

    const lg = t.legacy || {};
    const u  = t.core?.user_results?.result || {};
    const uc = u.core || {};
    const ul = u.legacy || {};
    const text = t.note_tweet?.note_tweet_results?.result?.text ?? lg.full_text ?? '';
    const media = (lg.extended_entities?.media || lg.entities?.media || []).map(m => m.type);
    const ts = Date.parse(lg.created_at || '');
    return {
      id: t.rest_id,
      h:  uc.screen_name ?? ul.screen_name ?? '?',
      n:  uc.name ?? ul.name ?? '?',
      v:  u.is_blue_verified ? 1 : 0,
      av: u.avatar?.image_url ?? ul.profile_image_url_https ?? '',
      t:  Number.isFinite(ts) ? ts : Date.now(),
      x:  text,
      l:  lg.favorite_count | 0,
      r:  lg.retweet_count | 0,
      rp: lg.reply_count | 0,
      q:  lg.quote_count | 0,
      vw: +(t.views?.count || 0),
      lg: lg.lang || '',
      m:  media.join(','),
      hs: (lg.entities?.hashtags || []).map(x => x.text).slice(0, 6),
      rt: rb ? 1 : 0,
      rb,
      qt: t.quoted_status_result ? 1 : 0,
      ln: (lg.entities?.urls || []).length ? 1 : 0,
    };
  }

  function parseTimeline(json) {
    const posts = [];
    for (const ins of instructionsOf(json)) {
      const entries = [];
      if (Array.isArray(ins.entries)) entries.push(...ins.entries);
      if (ins.entry) entries.push(ins.entry);
      for (const e of entries) {
        const c = e.content || {};
        const push = (ic) => {
          if (!ic || ic.promotedMetadata) return;          // ignora anúncios
          const res = ic.tweet_results?.result;
          if (!res) return;
          const p = toPost(res);
          if (p) posts.push(p);
        };
        push(c.itemContent);
        (c.items || []).forEach(it => push(it.item?.itemContent));
      }
    }
    return posts;
  }

  function ingest(text) {
    let json;
    try { json = JSON.parse(text); } catch { return; }
    let posts;
    try { posts = parseTimeline(json); } catch { return; }
    if (!posts.length) return;

    const agora = Date.now();
    const conhecidos = new Set(buffer.map(p => p.id));
    let entraram = 0;

    for (const p of posts) {
      if (conhecidos.has(p.id)) continue;
      p.s = agora;   // quando nós vimos
      p.novo = 1;    // entra como não lido; marcarRenderizados() rebaixa
      buffer.push(p);
      conhecidos.add(p.id);
      entraram++;
    }
    if (!entraram) return;

    // corta por ordem de CHEGADA, para nunca descartar algo recém-visto
    const cutoff = agora - BUF_TTL;
    buffer = buffer
      .filter(p => p.t >= cutoff)
      .sort((a, b) => (b.s || b.t) - (a.s || a.t))
      .slice(0, BUF_MAX);
    saveBuffer();
    updateBadge();
    sinalizarNovos(entraram);
  }

  // Percorre os <article> montados e baixa a bandeira dos que já estão na tela.
  // Roda no mesmo tick do observer, junto com a marcação das miniaturas.
  function marcarRenderizados() {
    if (!buffer.some(p => p.novo === 1)) return;
    const porId = new Map(buffer.map(p => [p.id, p]));
    let mudou = false;
    for (const art of document.querySelectorAll('article[data-testid="tweet"]')) {
      for (const a of art.querySelectorAll('a[href*="/status/"]')) {
        const m = (a.getAttribute('href') || '').match(/\/status\/(\d+)$/);
        if (!m) continue;
        const p = porId.get(m[1]);
        if (p && p.novo === 1) { p.novo = 0; mudou = true; }
        break;
      }
    }
    if (mudou) { saveBuffer(); updateBadge(); }
  }

  function marcarTudoLido() {
    buffer.forEach(p => { p.novo = 0; });
    saveBuffer();
    updateBadge();
  }

  /* ---------- hooks (instalados em document-start) ---------- */
  const WANTED = /\/i\/api\/graphql\/[^/]+\/(HomeTimeline|HomeLatestTimeline|ListLatestTweetsTimeline)/;

  (function hookXHR() {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u, ...rest) {
      this.__xfwUrl = String(u || '');
      return open.call(this, m, u, ...rest);
    };
    XMLHttpRequest.prototype.send = function (...args) {
      if (WANTED.test(this.__xfwUrl || '')) {
        this.addEventListener('load', () => {
          try { if (this.responseText) ingest(this.responseText); } catch {}
        });
      }
      return send.apply(this, args);
    };
  })();

  (function hookFetch() {
    const of = window.fetch;
    if (typeof of !== 'function') return;
    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      const out = of.apply(this, args);
      if (WANTED.test(url)) {
        out.then(res => { res.clone().text().then(ingest).catch(() => {}); }).catch(() => {});
      }
      return out;
    };
  })();

  /* ---------- estatísticas ---------- */
  const nf = new Intl.NumberFormat('pt-BR');
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + 'M'
                   : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.', ',') + 'k'
                   : nf.format(n);

  const STOP = new Set(('de da do das dos a o as os e é em no na nos nas um uma uns umas para por com que se ao aos à às pelo pela não mais como mas ou já sou seu sua seus suas isso isto esse essa este esta ele ela eles elas foi ser tem têm the of to and in is it for on that this with you are be at as from have has was were will not your https http rt via'.split(' ')));

  function computeStats(list) {
    const s = {
      total: list.length,
      autores: new Set(list.map(p => p.h)).size,
      verificados: list.filter(p => p.v).length,
      likes: 0, rts: 0, replies: 0, views: 0,
      comMidia: 0, comLink: 0, sendoRT: 0, sendoQT: 0,
    };
    const porAutor = new Map(), hashtags = new Map(), termos = new Map(), idiomas = new Map();
    let min = Infinity, max = -Infinity;

    for (const p of list) {
      s.likes += p.l; s.rts += p.r; s.replies += p.rp; s.views += p.vw;
      if (p.m) s.comMidia++;
      if (p.ln) s.comLink++;
      if (p.rt) s.sendoRT++;
      if (p.qt) s.sendoQT++;
      if (p.t < min) min = p.t;
      if (p.t > max) max = p.t;
      porAutor.set(p.h, (porAutor.get(p.h) || 0) + 1);
      idiomas.set(p.lg || '—', (idiomas.get(p.lg || '—') || 0) + 1);
      (p.hs || []).forEach(h => hashtags.set(h, (hashtags.get(h) || 0) + 1));
      String(p.x || '').toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[^\p{L}\p{N}\s#@]/gu, ' ')
        .split(/\s+/)
        .forEach(w => { if (w.length >= 4 && !STOP.has(w)) termos.set(w, (termos.get(w) || 0) + 1); });
    }

    const horas = (max > min) ? (max - min) / 3600e3 : 0;
    s.de = min === Infinity ? null : min;
    s.ate = max === -Infinity ? null : max;
    s.janelaH = horas;
    s.porHora = horas > 0.05 ? list.length / horas : list.length;
    s.mediaLikes = list.length ? s.likes / list.length : 0;
    s.mediaViews = list.length ? s.views / list.length : 0;

    const top = (m, k = 5) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k);
    s.topAutores  = top(porAutor);
    s.topHashtags = top(hashtags, 8);
    s.topTermos   = top(termos, 10);
    s.topIdiomas  = top(idiomas, 4);
    s.topPosts    = [...list].sort((a, b) => (b.l + b.r * 2) - (a.l + a.r * 2)).slice(0, 3);
    return s;
  }

  /* ---------- modal ---------- */
  let modalEl = null;
  let pendentes = 0;

  const modalAberto = () => !!modalEl && !modalEl.hidden;

  // o pill nativo do X ("Mostrar N posts"), quando existe
  const pillDoX = () => [...document.querySelectorAll('[role="button"],button')]
    .find(b => /^\s*Mostrar\s+[\d.,]+\s+posts?/i.test(b.textContent || ''));

  function sinalizarNovos(n) {
    if (!modalAberto()) return;          // fora do modal quem avisa é o badge
    pendentes += n;
    pintarBarra();
  }

  function pintarBarra() {
    const bar = modalEl?.querySelector('#xfw-m-new');
    if (!bar) return;
    bar.hidden = pendentes === 0;
    bar.querySelector('b').textContent = pendentes;
    bar.querySelector('#xfw-m-pill').hidden = !pillDoX();
  }
  const view = { q: '', sort: 'chegada', autor: '', midia: false, soNovos: false };

  // Num post com mídia o X anexa no fim um https://t.co/... que é o link da
  // própria mídia — vira ruído puro na lista e nos destaques. Links de posts
  // sem mídia são preservados: ali o link costuma ser o conteúdo.
  const textoLimpo = (p) => {
    const t = p.m ? String(p.x).replace(/\s*https:\/\/t\.co\/\w+\s*$/, '') : String(p.x);
    return t.trim() || (p.m ? '[' + p.m.split(',')[0] + ']' : '');
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const rel = (ts) => {
    const d = (Date.now() - ts) / 1000;
    if (d < 60)   return 'agora';
    if (d < 3600) return Math.floor(d / 60) + ' min';
    if (d < 86400) return Math.floor(d / 3600) + ' h';
    return Math.floor(d / 86400) + ' d';
  };

  const escopo = () => view.soNovos ? buffer.filter(isNovo) : buffer.slice();

  function filtered() {
    let l = escopo();
    if (view.autor) l = l.filter(p => p.h === view.autor);
    if (view.midia) l = l.filter(p => p.m);
    if (view.q) {
      const q = view.q.toLowerCase();
      l = l.filter(p => p.x.toLowerCase().includes(q) || p.h.toLowerCase().includes(q) || p.n.toLowerCase().includes(q));
    }
    const by = {
      chegada: (a, b) => (b.s || b.t) - (a.s || a.t),
      recente: (a, b) => b.t - a.t,
      likes:   (a, b) => b.l - a.l,
      rts:     (a, b) => b.r - a.r,
      views:   (a, b) => b.vw - a.vw,
    };
    return l.sort(by[view.sort] || by.chegada);
  }

  function statCard(titulo, linhas) {
    return '<div class="xfw-card"><h5>' + titulo + '</h5>' + linhas.join('') + '</div>';
  }
  const row = (k, v) => '<div class="xfw-row"><span>' + k + '</span><b>' + v + '</b></div>';
  const chips = (arr, pref = '') => arr.length
    ? '<div class="xfw-chips">' + arr.map(([k, n]) => '<i>' + pref + esc(k) + ' <em>' + n + '</em></i>').join('') + '</div>'
    : '<div class="xfw-empty">—</div>';

  function renderStats() {
    const s = computeStats(escopo());
    if (!s.total) return '<div class="xfw-empty-big">Nenhum post novo.<br><small>Um post sai da conta assim que o X o mostra na timeline. Sobra o que foi baixado e ainda não apareceu — o mesmo conjunto do “Mostrar N posts”. Marque “incluir lidos” para ver todo o buffer.</small></div>';

    const janela = s.janelaH >= 1 ? s.janelaH.toFixed(1).replace('.', ',') + ' h' : Math.round(s.janelaH * 60) + ' min';
    const pct = (n) => s.total ? Math.round(n / s.total * 100) + '%' : '0%';

    return '<div class="xfw-cards">' +
      statCard('Volume e ritmo', [
        row('Posts', '<big>' + fmt(s.total) + '</big>'),
        row('Janela', janela),
        row('Por hora', fmt(Math.round(s.porHora))),
        row('Mais antigo', s.de ? rel(s.de) : '—'),
      ]) +
      statCard('Autores', [
        row('Perfis distintos', '<big>' + fmt(s.autores) + '</big>'),
        row('Verificados', pct(s.verificados)),
        '<div class="xfw-sub">Mais ativos</div>',
        chips(s.topAutores, '@'),
      ]) +
      statCard('Engajamento', [
        row('Likes', fmt(s.likes)),
        row('Reposts', fmt(s.rts)),
        row('Respostas', fmt(s.replies)),
        row('Views', fmt(s.views)),
        row('Média likes/post', fmt(Math.round(s.mediaLikes))),
      ]) +
      statCard('Vale o clique', s.topPosts.map(p =>
        '<a class="xfw-hi" href="https://x.com/' + esc(p.h) + '/status/' + p.id + '" target="_blank" rel="noopener">' +
          '<span>@' + esc(p.h) + '</span>' +
          '<em>' + esc(textoLimpo(p).slice(0, 80)) + (textoLimpo(p).length > 80 ? '…' : '') + '</em>' +
          '<i>♡ ' + fmt(p.l) + ' · 🔁 ' + fmt(p.r) + '</i>' +
        '</a>')) +
      statCard('Conteúdo', [
        row('Com mídia', pct(s.comMidia)),
        row('Com link', pct(s.comLink)),
        row('Reposts / quotes', pct(s.sendoRT) + ' / ' + pct(s.sendoQT)),
        '<div class="xfw-sub">Idiomas</div>', chips(s.topIdiomas),
        '<div class="xfw-sub">Hashtags</div>', chips(s.topHashtags, '#'),
        '<div class="xfw-sub">Termos</div>', chips(s.topTermos),
      ]) +
    '</div>';
  }

  function renderList() {
    const l = filtered();
    if (!l.length) return '<div class="xfw-empty-big">Nada bate com esse filtro.</div>';
    return l.map(p =>
      '<a class="xfw-post" href="https://x.com/' + esc(p.h) + '/status/' + p.id + '" target="_blank" rel="noopener">' +
        (p.av ? '<img src="' + esc(p.av) + '" alt="" loading="lazy">' : '<span class="xfw-noav"></span>') +
        '<div class="xfw-post-body">' +
          '<div class="xfw-post-head">' +
            '<b>' + esc(p.n) + '</b>' + (p.v ? '<i class="xfw-v">✓</i>' : '') +
            '<span>@' + esc(p.h) + '</span><span>·</span><span>' + rel(p.t) + '</span>' +
            (p.novo === 1 ? '<span class="xfw-new">novo</span>' : '') +
            (p.rb ? '<span class="xfw-tag">RT @' + esc(p.rb) + '</span>' : '') +
            (p.m ? '<span class="xfw-tag">' + esc(p.m.split(',')[0]) + '</span>' : '') +
          '</div>' +
          '<div class="xfw-post-text">' + esc(textoLimpo(p)) + '</div>' +
        '</div>' +
        '<div class="xfw-post-metrics">' +
          '<span title="respostas">💬 ' + fmt(p.rp) + '</span>' +
          '<span title="reposts">🔁 ' + fmt(p.r) + '</span>' +
          '<span title="likes">♡ ' + fmt(p.l) + '</span>' +
          '<span title="views">📊 ' + fmt(p.vw) + '</span>' +
        '</div>' +
      '</a>'
    ).join('');
  }

  function refreshModal() {
    if (!modalEl) return;
    modalEl.querySelector('#xfw-m-stats').innerHTML = renderStats();
    modalEl.querySelector('#xfw-m-list').innerHTML = renderList();
    const esc0 = escopo();
    pintarBarra();
    modalEl.querySelector('#xfw-m-count').textContent =
      filtered().length + ' de ' + esc0.length + ' · ' + buffer.filter(isNovo).length + ' novos';
    modalEl.querySelector('#xfw-m-tudo').checked = view.soNovos;
    const sel = modalEl.querySelector('#xfw-m-autor');
    const atual = sel.value;
    const autores = [...new Set(esc0.map(p => p.h))].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Todos os autores</option>' +
      autores.map(a => '<option value="' + esc(a) + '">@' + esc(a) + '</option>').join('');
    sel.value = atual;
  }

  function openModal() {
    if (modalEl) { modalEl.hidden = false; pendentes = 0; refreshModal(); return; }
    modalEl = document.createElement('div');
    modalEl.id = 'xfw-modal';
    modalEl.innerHTML =
      '<div class="xfw-backdrop"></div>' +
      '<div class="xfw-sheet" role="dialog" aria-modal="true" aria-label="Radar de novos posts">' +
        '<header>' +
          '<h3>Radar de novos posts</h3>' +
          '<div class="xfw-head-actions">' +
            '<button id="xfw-m-read" type="button">Marcar tudo como lido</button>' +
            '<button id="xfw-m-clear" type="button">Limpar buffer</button>' +
            '<button id="xfw-m-close" type="button" aria-label="Fechar">✕</button>' +
          '</div>' +
        '</header>' +
        '<div id="xfw-m-stats"></div>' +
        '<div class="xfw-controls">' +
          '<input id="xfw-m-q" type="search" placeholder="Buscar no texto, nome ou @handle…">' +
          '<select id="xfw-m-autor"></select>' +
          '<select id="xfw-m-sort">' +
            '<option value="chegada">Ordem de chegada</option>' +
            '<option value="recente">Mais recentes</option>' +
            '<option value="likes">Mais likes</option>' +
            '<option value="rts">Mais reposts</option>' +
            '<option value="views">Mais views</option>' +
          '</select>' +
          '<label class="xfw-check"><input id="xfw-m-midia" type="checkbox">só com mídia</label>' +
          '<label class="xfw-check"><input id="xfw-m-tudo" type="checkbox">só novos</label>' +
          '<span id="xfw-m-count"></span>' +
        '</div>' +
        '<div id="xfw-m-new" hidden><span><b>0</b> novos posts chegaram</span>' +
          '<button id="xfw-m-refresh" type="button">Atualizar lista</button>' +
          '<button id="xfw-m-pill" type="button">Mostrar na timeline</button></div>' +
        '<div id="xfw-m-list"></div>' +
      '</div>';
    document.body.appendChild(modalEl);

    const close = () => { modalEl.hidden = true; };
    modalEl.querySelector('.xfw-backdrop').addEventListener('click', close);
    modalEl.querySelector('#xfw-m-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl && !modalEl.hidden) close(); });

    modalEl.querySelector('#xfw-m-read').addEventListener('click', () => {
      marcarTudoLido(); refreshModal();
    });
    modalEl.querySelector('#xfw-m-clear').addEventListener('click', () => {
      buffer = []; saveBuffer(); updateBadge(); refreshModal();
    });
    modalEl.querySelector('#xfw-m-q').addEventListener('input', (e) => { view.q = e.target.value; refreshModal(); });
    modalEl.querySelector('#xfw-m-autor').addEventListener('change', (e) => { view.autor = e.target.value; refreshModal(); });
    modalEl.querySelector('#xfw-m-sort').addEventListener('change', (e) => { view.sort = e.target.value; refreshModal(); });
    modalEl.querySelector('#xfw-m-midia').addEventListener('change', (e) => { view.midia = e.target.checked; refreshModal(); });
    modalEl.querySelector('#xfw-m-tudo').addEventListener('change', (e) => { view.soNovos = e.target.checked; refreshModal(); });
    modalEl.querySelector('#xfw-m-refresh').addEventListener('click', () => { pendentes = 0; refreshModal(); });
    modalEl.querySelector('#xfw-m-pill').addEventListener('click', () => {
      pillDoX()?.click();                 // única ação que toca na timeline, e só sob clique seu
      pendentes = 0;
      setTimeout(refreshModal, 600);
    });

    refreshModal();
  }

  function updateBadge() {
    const b = document.getElementById('xfw-badge');
    if (!b) return;
    const n = buffer.filter(isNovo).length;
    b.textContent = n > 999 ? '999+' : String(n);
    b.hidden = n === 0;
  }

  /* ==================================================================
   * 8. Boot — o X é uma SPA e remonta o DOM o tempo todo
   * ================================================================== */
  injectStyle();
  apply();

  const boot = () => { injectStyle(); buildPanel(); detectCap(); updateBadge(); tagTweets(); marcarRenderizados(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!document.getElementById('xfw-style')) injectStyle();
      if (document.body && !document.getElementById('xfw-root')) buildPanel();
      if (!capApplied) detectCap();
      tagTweets();
      marcarRenderizados();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
