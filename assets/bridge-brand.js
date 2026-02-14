/*!
 * bridge-brand.js v12
 * - Brands via HASH (minúsculo): #brand=target|serprovisao|whitelabel|planejar
 * - Sufixo textual (“Plataforma {DisplayName}”) – exceto whitelabel (sem sufixo)
 * - Cor por brand (opcional: #brandColor=...); se não vier, usa default do brand
 * - Páginas por brand: qualquer arquivo com __brand-<code> (nav filtra + links forçam a versão correta + redirect)
 * - Preserva hash, injeta hash nos links; antitrava (debounce + reentrância + warm-up)
 * - Scrollbar segue a cor do brand
 */

(function () {
  const BASE = "Plataforma";
  const LOG  = (...a) => { try { console.log("[bridge-brand]", ...a); } catch {} };
  const esc  = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // =========================
  //  MAPEAMENTO DE BRANDS
  // =========================
  // code: minúsculo na URL (#brand=<code>)
  // display: sufixo textual ("" para não aplicar sufixo)
  // fileSuffix: sufixo para arquivos específicos daquele brand (em nomes de arquivo)
  // color: cor default (pode ser sobrescrita via #brandColor=...)
  const BRANDS = {
    target:      { display: "Target",       fileSuffix: "__brand-target",      color: "#0a6cff" },
    serprovisao: { display: "Serpro Visão", fileSuffix: "__brand-serpro",      color: "#00A0E2" },
    whitelabel:  { display: "",             fileSuffix: "__brand-whitelabel",  color: "#0a6cff" },
    planejar:    { display: "Planejar",     fileSuffix: "__brand-planejar",    color: "#820E64" }
  };

  // — helper: obtém config do brand atual (com fallback)
  function getBrandConfig(code) {
    const c = (code || "").toLowerCase();
    return BRANDS[c] || BRANDS.target;
  }

  // ======= leitura de parâmetros (hash tem prioridade), + kill-switch =======
  function getParams(){
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    const q = new URLSearchParams(location.search);
    const pick = k => h.get(k) ?? q.get(k);
    const brandRaw = (pick("brand") || "").toLowerCase();
    const colorRaw = pick("brandColor");
    const noBrand  = (pick("noBrand") || "") === "1";
    return {
      brandCode:  brandRaw,
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
    if (p.brandCode)   u.set("brand", p.brandCode);
    if (p.brandColor)  u.set("brandColor", p.brandColor);
    return u.toString() ? ("#" + u.toString()) : "";
  }

  if (!params.brandCode && !params.brandColor) {
    const st = readStored();
    if (st.brandCode || st.brandColor) {
      history.replaceState(null, "", buildDesiredHash(st) || location.hash);
      params.brandCode  = st.brandCode  || "";
      params.brandColor = st.brandColor || "";
    }
  }
  saveStored(params);

  const CFG         = getBrandConfig(params.brandCode);
  const BRAND_NAME  = CFG.display;                 // "" para whitelabel
  const BRAND_SUFFIX= CFG.fileSuffix;
  const BRAND_COLOR = params.brandColor || CFG.color;
  const DESIRED_HASH= buildDesiredHash({ brandCode: params.brandCode || "target", brandColor: params.brandColor || "" });

  const ALL_SUFFIXES = Object.values(BRANDS).map(b => b.fileSuffix);

  const hrefHasBrandSuffix = (href="") => ALL_SUFFIXES.some(s => href.includes(s));
  const isBrandSplitPath   = (p="")    => hrefHasBrandSuffix(p);

  function ensureHashInUrl(){
    const st   = readStored();
    const want = buildDesiredHash(st.brandCode ? st : { brandCode: params.brandCode, brandColor: params.brandColor });
    if (want && location.hash !== want) history.replaceState(null, "", want);
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
        for (let p=n.parentNode; p; p=p.parentNode) if (SKIP.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { try { n.nodeValue = n.nodeValue.replace(re, full); } catch {} });
  }

  // ---------- header, título, <title>, aria ----------
  function setChrome(full){
    try {
      document.querySelectorAll('.md-header__title .md-ellipsis,[data-md-component="header-title"] .md-ellipsis')
        .forEach(el => el.textContent = full);
      document.querySelectorAll('.md-nav__title .md-ellipsis,[data-md-component="sidebar"] .md-nav__title')
        .forEach(el => el.textContent = full);
      const parts = document.title.split(" - ");
      document.title = (parts.length>=2) ? [...parts.slice(0,-1), full].join(" - ") : full;
      const logo = document.querySelector(".md-header__button.md-logo");
      if (logo) logo.setAttribute("aria-label", full);
    } catch (e) { LOG("setChrome err:", e.message); }
  }

  function ensureCss(id, css){
    if (!css) return;
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  // Scrollbar seguindo a cor
  function applyScrollbarCss(color) {
    ensureCss("__brand_scrollbar__", `
      /* Firefox */
      html { scrollbar-color: ${color} rgba(0,0,0,.1); }
      /* WebKit */
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: rgba(0,0,0,.06); }
      ::-webkit-scrollbar-thumb { background-color: ${color}; border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
      ::-webkit-scrollbar-thumb:hover { background-color: ${color}; opacity: .9; }
    `);
  }

  // ===== preservar href original p/ filtrar antes da reescrita =====
  const getOrigHref = (a) => a.getAttribute("data-orig-href") || a.getAttribute("href") || "";

  // ---------- decora links internos (preserva hash e força sufixo do brand para páginas split) ----------
  function decorateInternalLinks(root){
    const container = root || document;
    const links     = container.querySelectorAll("a[href]");
    const wantHash  = DESIRED_HASH || buildDesiredHash(readStored());
    links.forEach(a=>{
      const currentHref = a.getAttribute("href");
      if (!currentHref) return;
      if (!a.hasAttribute("data-orig-href")) a.setAttribute("data-orig-href", currentHref);

      if (currentHref.startsWith("#") || currentHref.startsWith("mailto:") || currentHref.startsWith("tel:")) return;
      let url; try { url = new URL(currentHref, location.href); } catch { return; }
      if (url.origin !== location.origin) return;

      // se o link aponta p/ página split (tem sufixo em algum brand), forçar nosso sufixo
      const orig = getOrigHref(a);
      if (hrefHasBrandSuffix(orig)) {
        const suf = BRAND_SUFFIX;
        if (suf) {
          let p = new URL(orig, location.href).pathname;
          ALL_SUFFIXES.forEach(s => { p = p.replace(s, suf); });
          url.pathname = p;
        }
      }

      if (wantHash && !/([#&?])brand=/.test(url.hash)) url.hash = wantHash;
      a.setAttribute("href", url.toString());
    });
  }

  // ---------- filtro de menu (esconde apenas itens que JÁ tenham sufixo de outro brand) ----------
  function filterBrandSplitInNav(){
    const want = BRAND_SUFFIX;
    const links = document.querySelectorAll(".md-nav a[href]");
    let hidden = 0;
    links.forEach(a=>{
      const orig = getOrigHref(a);
      if (!hrefHasBrandSuffix(orig)) return;     // itens sem sufixo (genéricos) ficam sempre visíveis
      const matches = want ? orig.includes(want) : false;
      const li = a.closest("li") || a.parentElement;
      if (li) { li.style.display = matches ? "" : "none"; if (!matches) hidden++; }
    });
    return hidden;
  }

  // ---------- redireciona se abriu uma página split do brand errado ----------
  function redirectIfWrongBrandPage(){
    const want = BRAND_SUFFIX; if (!want) return;
    const path = location.pathname; if (!isBrandSplitPath(path)) return;
    if (!path.includes(want)) {
      const url = new URL(location.href);
      let p = path; ALL_SUFFIXES.forEach(s => { p = p.replace(s, want); });
      url.pathname = p; history.replaceState(null, "", url.toString()); location.reload();
    }
  }

  // ---------- aplicação com trava + debounce ----------
  let applying = false;
  function applyOnce(){
    if (applying) return; applying = true;
    try{
      // 1) branding textual (whitelabel => não aplica sufixo)
      const full = BRAND_NAME ? `${BASE} ${BRAND_NAME}` : BASE;
      setChrome(full);
      const content = document.querySelector(".md-content"); if (content) replaceTextNodes(content, full);
      document.querySelectorAll(".md-sidebar,.md-nav,[data-md-component='toc'],footer").forEach(n => replaceTextNodes(n, full));

      // 2) cor do header + realces + scrollbar
      if (BRAND_COLOR) {
        ensureCss("__brand_css__", `
          header.md-header.md-header--shadow { background-color: ${BRAND_COLOR} !important; }
          .md-nav__link--active { border-left: 3px solid ${BRAND_COLOR}; }
          :root { --brand-color: ${BRAND_COLOR}; }
        `);
        applyScrollbarCss(BRAND_COLOR);
      }

      // 3) links e hash
      decorateInternalLinks(document);
      ensureHashInUrl();

      // 4) páginas split por brand: filtra nav + corrige rota aberta
      filterBrandSplitInNav();
      redirectIfWrongBrandPage();

      LOG("aplicado →", full, BRAND_COLOR || "(sem cor)", "brandCode:", params.brandCode);
    }catch(e){ LOG("apply err:", e.message); }
    finally{ applying=false; }
  }

  // --- Warm-up: garante filtro logo na 1ª carga
  function navReady(){ return document.querySelectorAll(".md-nav a[href]").length > 0; }
  function warmupFilter(){
    let runs = 0;
    const tick = () => {
      runs++;
      decorateInternalLinks(document);                 // garante data-orig-href
      const hidden = filterBrandSplitInNav();
      if (hidden > 0 || runs >= 10) return;            // para assim que ocultar algo, ou após ~500ms
      setTimeout(tick, 50);
    };
    tick();
  }

  // boot: espera DOM do Material
  let tries=0;
  (function waitDom(){
    const ready=document.querySelector(".md-content");
    if (ready || tries>=30) {
      observeSpa();
      applyOnce();
      if (!navReady()) warmupFilter(); else { setTimeout(applyOnce, 80); setTimeout(applyOnce, 200); }
      return;
    }
    tries++; requestAnimationFrame(waitDom);
  })();

  function observeSpa(){
    let scheduled=false;
    const schedule=()=>{ if(scheduled) return; scheduled=true; setTimeout(()=>{scheduled=false; applyOnce();},50); };
    const container=document.querySelector("[data-md-component='container']")||document.body;
    const mo=new MutationObserver(schedule); mo.observe(container,{childList:true,subtree:true});
  }

  LOG("carregado; params=", params, "→ cfg:", CFG);
})();
