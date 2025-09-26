(function () {
  const BASE = "Plataforma";

  const log = (...a) => { try { console.log("[bridge-brand]", ...a); } catch {} };

  // --- helpers ---
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const getParams = () => {
    // prioridade para HASH (#brand=...&brandColor=...), fallback para QUERY (?brand=...)
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    const q = new URLSearchParams(location.search);
    const pick = (k) => h.get(k) ?? q.get(k);
    const brandRaw = pick("brand");
    const colorRaw = pick("brandColor");
    const noBrand  = (pick("noBrand") || "") === "1";
    return {
      brand: brandRaw ? decodeURIComponent(brandRaw) : "",
      brandColor: colorRaw ? decodeURIComponent(colorRaw) : "",
      noBrand
    };
  };

  function replaceTextNodes(root, full) {
    if (!root || !full) return;
    const suf = full.split(" ").slice(1).join(" ");
    const re  = new RegExp(`\\b${BASE}\\b(?!\\s+${escapeRe(suf)})`, "g");

    const SKIP = new Set(["PRE","CODE","KBD","SAMP","SCRIPT","STYLE","NOSCRIPT"]);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || n.nodeValue.indexOf(BASE) === -1) return NodeFilter.FILTER_REJECT;
        for (let p=n.parentNode; p; p=p.parentNode) if (SKIP.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[]; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => { try { n.nodeValue = n.nodeValue.replace(re, full); } catch {} });
  }

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
    } catch (e) { log("setChrome err:", e.message); }
  }

  function injectCss(css){
    if (!css) return;
    try {
      const s = document.createElement("style");
      s.setAttribute("data-brand", "true");
      s.textContent = css;
      document.head.appendChild(s);
    } catch (e) { log("injectCss err:", e.message); }
  }

  function applyBrand({ brand, brandColor }){
    const full = brand ? `${BASE} ${brand}` : BASE;
    setChrome(full);
    // conteúdo + menus + toc + footer
    try {
      const content = document.querySelector(".md-content");
      if (content) replaceTextNodes(content, full);
      document
        .querySelectorAll(".md-sidebar,.md-nav,[data-md-component='toc'],footer")
        .forEach(n => replaceTextNodes(n, full));
    } catch (e) { log("replaceTextNodes err:", e.message); }

    if (brandColor) {
      injectCss(`
        header.md-header.md-header--shadow { background-color:${brandColor} !important; }
        .md-nav__link--active { border-left:3px solid ${brandColor}; }
        :root { --brand-color:${brandColor}; }
      `);
    }
    log("aplicado →", full, brandColor||"(sem cor)");
  }

  // --- boot (com tolerância) ---
  const params = getParams();
  if (params.noBrand) { log("noBrand=1, ignorando"); return; }

  log("carregado; params=", params);

  // espere alguns frames para o Material montar o DOM
  let tries = 0;
  const start = () => {
    try {
      applyBrand(params);
    } catch (e) { log("apply err:", e.message); }
    // reobserve SPA updates
    const mo = new MutationObserver(() => applyBrand(params));
    mo.observe(document.documentElement, { childList:true, subtree:true });
  };

  const waitDom = () => {
    const ready = document.querySelector(".md-content");
    if (ready || tries >= 20) return start();
    tries++;
    requestAnimationFrame(waitDom);
  };
  waitDom();
})();
