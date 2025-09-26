(function () {
  const BASE = "Plataforma";
  const LOG = (...a) => { try { console.log("[bridge-brand]", ...a); } catch {} };

  // --- utils ---
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function replaceTextNodes(root, full) {
    if (!root || !full) return;
    const suf = full.split(" ").slice(1).join(" ");
    const re  = new RegExp(`\\b${BASE}\\b(?!\\s+${esc(suf)})`, "g");

    const SKIP = new Set(["PRE","CODE","KBD","SAMP","SCRIPT","STYLE","NOSCRIPT"]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || n.nodeValue.indexOf(BASE) === -1) return NodeFilter.FILTER_REJECT;
        for (let p=n.parentNode; p; p=p.parentNode) if (SKIP.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
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
    } catch (e) { LOG("setChrome err:", e.message); }
  }

  function ensureCss(id, css){
    if (!css) return;
    if (document.getElementById(id)) return; // já injetado
    const s = document.createElement("style");
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  // --- leitura de parâmetros (hash tem prioridade) ---
  function getParams(){
    const h = new URLSearchParams(location.hash.replace(/^#/,""));
    const q = new URLSearchParams(location.search);
    const pick = k => h.get(k) ?? q.get(k);
    const brandRaw = pick("brand");
    const colorRaw = pick("brandColor");
    const noBrand  = (pick("noBrand") || "") === "1";
    return {
      brand: brandRaw ? decodeURIComponent(brandRaw) : "",
      brandColor: colorRaw ? decodeURIComponent(colorRaw) : "",
      noBrand
    };
  }

  const params = getParams();
  if (params.noBrand) { LOG("noBrand=1 → desativado"); return; }

  // --- aplicação com trava + debounce ---
  let applying = false;
  function applyOnce() {
    if (applying) return;
    applying = true;
    try {
      const full = params.brand ? `${BASE} ${params.brand}` : BASE;

      setChrome(full);

      // apenas áreas relevantes (evita varrer o DOM todo)
      const content = document.querySelector(".md-content");
      if (content) replaceTextNodes(content, full);

      const sidebars = document.querySelectorAll(".md-sidebar,.md-nav,[data-md-component='toc'],footer");
      sidebars.forEach(n => replaceTextNodes(n, full));

      if (params.brandColor) {
        ensureCss("__brand_css__", `
          header.md-header.md-header--shadow { background-color: ${params.brandColor} !important; }
          .md-nav__link--active { border-left: 3px solid ${params.brandColor}; }
          :root { --brand-color: ${params.brandColor}; }
        `);
      }
      LOG("aplicado →", full, params.brandColor || "(sem cor)");
    } catch (e) {
      LOG("apply err:", e.message);
    } finally {
      applying = false;
    }
  }

  // aplica na carga (depois que o Material montar o DOM)
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
    // observar apenas o container principal, não o documento inteiro
    const container = document.querySelector("[data-md-component='container']") || document.body;
    const mo = new MutationObserver(schedule);
    mo.observe(container, { childList: true, subtree: true });
  }

  LOG("carregado; params=", params);
})();
