/*!
 * bridge-brand.js v8
 * - Aplica sufixo de brand (“Plataforma {brand}”) em header, menu, conteúdo, TOC e footer
 * - Aplica cor (brandColor) no header e realces
 * - Usa HASH (#brand=...&brandColor=...) para não interferir no SPA do Material
 * - Antitrava: reentrância + debounce + escopo de observação reduzido
 * - Persiste brand/brandColor em sessionStorage e preserva hash em navegação interna
 * - Kill-switch: #noBrand=1 ou ?noBrand=1
 */
(function () {
  const BASE = "Plataforma";
  const LOG  = (...a) => { try { console.log("[bridge-brand]", ...a); } catch {} };
  const esc  = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ---------- leitura de parâmetros (hash tem prioridade), + kill-switch ----------
  function getParams(){
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    const q = new URLSearchParams(location.search);
    const pick = k => h.get(k) ?? q.get(k);
    const brandRaw = pick("brand");
    const colorRaw = pick("brandColor");
    const noBrand  = (pick("noBrand") || "") === "1";
    return {
      brand:      brandRaw ? decodeURIComponent(brandRaw) : "",
      brandColor: colorRaw ? decodeURIComponent(colorRaw) : "",
      noBrand
    };
  }
  const params = getParams();
  if (params.noBrand) { LOG("noBrand=1 → desativado"); return; }

  // ---------- storage do brand (para restaurar se hash sumir) ----------
  function saveStored(p){ try { sessionStorage.setItem("__brand_params", JSON.stringify(p)); } catch {} }
  function readStored(){ try { return JSON.parse(sessionStorage.getItem("__brand_params") || "{}"); } catch { return {}; } }
  function buildDesiredHash(p){
    const u = new URLSearchParams();
    if (p.brand)      u.set("brand", p.brand);
    if (p.brandColor) u.set("brandColor", p.brandColor);
    return u.toString() ? ("#" + u.toString()) : "";
  }

  // Se entrou sem brand/brandColor, tenta restaurar do storage
  if (!params.brand && !params.brandColor) {
    const st = readStored();
    if (st.brand || st.brandColor) {
      history.replaceState(null, "", buildDesiredHash(st) || location.hash);
      params.brand      = st.brand      || "";
      params.brandColor = st.brandColor || "";
    }
  }
  // sempre que definimos params, persistimos
  saveStored(params);

  const DESIRED_HASH = buildDesiredHash(params);

  // ---------- util: garante o hash desejado na URL atual ----------
  function ensureHashInUrl() {
    const st = readStored();
    const want = buildDesiredHash(st.brand ? st : params);
    if (!want) return;
    if (location.hash !== want) {
      history.replaceState(null, "", want); // não recarrega
    }
  }

  // ---------- aplica sufixo nos nós de texto (sem tocar em <code>/<pre>) ----------
  function replaceTextNodes(root, full) {
    if (!root || !full) return;
    const suf = full.split(" ").slice(1).join(" ");
    const re  = new RegExp(`\\b${BASE}\\b(?!\\s+${esc(suf)})`, "g");
    const SKIP = new Set(["PRE","CODE","KBD","SAMP","SCRIPT","STYLE","NOSCRIPT"]);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || n.nodeValue.indexOf(BASE) === -1) return NodeFilter.FILTER_REJECT;
        for (let p=n.parentNode; p; p=p.parentNode) { if (SKIP.has(p.nodeName)) return NodeFilter.FILTER_REJECT; }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { try { n.nodeValue = n.nodeValue.replace(re, full); } catch {} });
  }

  // ---------- atualiza header, título da sidebar, <title> e aria-label ----------
  function setChrome(full){
    try {
      document
        .querySelectorAll('.md-header__title .md-ellipsis,[data-md-component="header-title"] .md-ellipsis')
        .forEach(el => el.textContent = full);

      document
        .querySelectorAll('.md-nav__title .md-ellipsis,[data-md-component="sidebar"] .md-nav__title')
        .forEach(el => el.textContent = full);

      const parts = document.title.split(" - ");
      document.title = (parts.length>=2) ? [...parts.slice(0,-1), full].join(" - ") : full;

      const logo = document.querySelector(".md-header__button.md-logo");
      if (logo) logo.setAttribute("aria-label", full);
    } catch (e) { LOG("setChrome err:", e.message); }
  }

  // ---------- injeta CSS apenas uma vez ----------
  function ensureCss(id, css){
    if (!css) return;
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- decora links internos para sempre manter o hash ----------
  function decorateInternalLinks(root) {
    const container = root || document;
    const links = container.querySelectorAll("a[href]");
    const want = DESIRED_HASH || buildDesiredHash(readStored());
    if (!want) return;

    links.forEach(a => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url;
      try { url = new URL(href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;

      // se já há brand no hash, mantém; senão, aplica
      if (!/([#&?])brand=/.test(url.hash)) {
        url.hash = want;
        a.setAttribute("href", url.toString());
      }
    });
  }

  // intercepta cliques (para elementos inseridos pelo SPA)
  document.addEventListener("click", (ev) => {
    const a = ev.target && ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    const want = DESIRED_HASH || buildDesiredHash(readStored());
    if (!want) return;
    try {
      const url = new URL(a.getAttribute("href"), location.href);
      if (url.origin === location.origin && !/([#&?])brand=/.test(url.hash)) {
        url.hash = want;
        a.setAttribute("href", url.toString());
      }
    } catch {}
  }, true);

  // ---------- aplicação com trava + debounce ----------
  let applying = false;
  function applyOnce() {
    if (applying) return;
    applying = true;
    try {
      const full = params.brand ? `${BASE} ${params.brand}` : BASE;

      setChrome(full);

      // apenas áreas relevantes (evita varrer o doc todo)
      const content = document.querySelector(".md-content");
      if (content) replaceTextNodes(content, full);

      document
        .querySelectorAll(".md-sidebar,.md-nav,[data-md-component='toc'],footer")
        .forEach(n => replaceTextNodes(n, full));

      if (params.brandColor) {
        ensureCss("__brand_css__", `
          header.md-header.md-header--shadow { background-color: ${params.brandColor} !important; }
          .md-nav__link--active { border-left: 3px solid ${params.brandColor}; }
          :root { --brand-color: ${params.brandColor}; }
        `);
      }

      // mantém hash e links
      decorateInternalLinks(document);
      ensureHashInUrl();

      LOG("aplicado →", full, params.brandColor || "(sem cor)");
    } catch (e) {
      LOG("apply err:", e.message);
    } finally {
      applying = false;
    }
  }

  // aplica na carga (espera o DOM do Material existir)
  let tries = 0;
  (function waitDom(){
    const ready = document.querySelector(".md-content");
    if (ready || tries >= 30) { applyOnce(); observeSpa(); return; }
    tries++;
    requestAnimationFrame(waitDom);
  })();

  // observa mudanças do SPA com debounce (evita loop)
  function observeSpa(){
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => { scheduled = false; applyOnce(); }, 50);
    };
    const container = document.querySelector("[data-md-component='container']") || document.body;
    const mo = new MutationObserver(schedule);
    mo.observe(container, { childList: true, subtree: true });
  }

  LOG("carregado; params=", params);
})();
