/*!
 * bridge-brand.js v11
 * - Brand via HASH (#brand=...&brandColor=...)
 * - Sufixo “Plataforma {brand}”, cor, antitrava, preserva hash e injeta em links
 * - Visão Geral por brand: esconde item do brand errado e força rota correta
 * - Warm-up: garante filtro logo na 1ª carga (sem precisar clicar)
 */
(function () {
  const BASE = "Plataforma";
  const LOG  = (...a) => { try { console.log("[bridge-brand]", ...a); } catch {} };
  const esc  = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ====== Brand <-> sufixo (fase 1: só Visão Geral) ======
  const BRAND_SUFFIX_MAP = { "Target":"__brand-target", "Serpro Visão":"__brand-serpro" };
  const ALL_SUFFIXES = Object.values(BRAND_SUFFIX_MAP);
  const RE_VISAO = /1\.(?:Vis(?:ão|%C3%A3)o)_Geral/i;
  const isVisaoGeralPath   = p => RE_VISAO.test(p||"");
  const hrefHasBrandSuffix = href => ALL_SUFFIXES.some(s => (href||"").includes(s));
  const suffixForBrand     = b => BRAND_SUFFIX_MAP[b] || null;

  // ---------- params ----------
  function getParams(){
    const h = new URLSearchParams(location.hash.replace(/^#/,""));
    const q = new URLSearchParams(location.search);
    const pick = k => h.get(k) ?? q.get(k);
    const brandRaw = pick("brand");
    const colorRaw = pick("brandColor");
    const noBrand  = (pick("noBrand")||"")==="1";
    return { brand: brandRaw?decodeURIComponent(brandRaw):"", brandColor: colorRaw?decodeURIComponent(colorRaw):"", noBrand };
  }
  const params = getParams();
  if (params.noBrand) { LOG("noBrand=1 → desativado"); return; }

  function saveStored(p){ try { sessionStorage.setItem("__brand_params", JSON.stringify(p)); } catch {} }
  function readStored(){ try { return JSON.parse(sessionStorage.getItem("__brand_params")||"{}"); } catch { return {}; } }
  function buildDesiredHash(p){ const u=new URLSearchParams(); if(p.brand)u.set("brand",p.brand); if(p.brandColor)u.set("brandColor",p.brandColor); return u.toString()?("#"+u.toString()):""; }

  if (!params.brand && !params.brandColor) {
    const st = readStored();
    if (st.brand || st.brandColor) {
      history.replaceState(null,"",buildDesiredHash(st)||location.hash);
      params.brand=st.brand||""; params.brandColor=st.brandColor||"";
    }
  }
  saveStored(params);
  const DESIRED_HASH = buildDesiredHash(params);

  function ensureHashInUrl(){
    const st = readStored();
    const want = buildDesiredHash(st.brand?st:params);
    if (want && location.hash!==want) history.replaceState(null,"",want);
  }

  // ---------- replace text ----------
  function replaceTextNodes(root, full){
    if(!root||!full) return;
    const suf = full.split(" ").slice(1).join(" ");
    const re  = new RegExp(`\\b${BASE}\\b(?!\\s+${esc(suf)})`,"g");
    const SKIP = new Set(["PRE","CODE","KBD","SAMP","SCRIPT","STYLE","NOSCRIPT"]);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if(!n.nodeValue || n.nodeValue.indexOf(BASE)===-1) return NodeFilter.FILTER_REJECT;
        for(let p=n.parentNode;p;p=p.parentNode){ if(SKIP.has(p.nodeName)) return NodeFilter.FILTER_REJECT; }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[]; while(w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n=>{ try{ n.nodeValue = n.nodeValue.replace(re, full); }catch{} });
  }

  function setChrome(full){
    try{
      document.querySelectorAll('.md-header__title .md-ellipsis,[data-md-component="header-title"] .md-ellipsis').forEach(el=>el.textContent=full);
      document.querySelectorAll('.md-nav__title .md-ellipsis,[data-md-component="sidebar"] .md-nav__title').forEach(el=>el.textContent=full);
      const parts=document.title.split(" - "); document.title=(parts.length>=2)?[...parts.slice(0,-1),full].join(" - "):full;
      const logo=document.querySelector(".md-header__button.md-logo"); if(logo) logo.setAttribute("aria-label",full);
    }catch(e){ LOG("setChrome err:",e.message); }
  }

  function ensureCss(id, css){
    if(!css) return;
    if(document.getElementById(id)) return;
    const s=document.createElement("style"); s.id=id; s.textContent=css; document.head.appendChild(s);
  }

  // ===== preservar href original p/ filtrar antes da reescrita =====
  const getOrigHref = (a) => a.getAttribute("data-orig-href") || a.getAttribute("href") || "";

  // ---------- decora links internos ----------
  function decorateInternalLinks(root){
    const container=root||document;
    const links=container.querySelectorAll("a[href]");
    const wantHash = DESIRED_HASH || buildDesiredHash(readStored());
    links.forEach(a=>{
      const currentHref = a.getAttribute("href"); if(!currentHref) return;
      if (!a.hasAttribute("data-orig-href")) a.setAttribute("data-orig-href", currentHref);

      if (currentHref.startsWith("#") || currentHref.startsWith("mailto:") || currentHref.startsWith("tel:")) return;
      let url; try { url = new URL(currentHref, location.href); } catch { return; }
      if (url.origin !== location.origin) return;

      // Fase 1: Visão Geral — força sufixo correto com base no href ORIGINAL
      const orig = getOrigHref(a);
      if (isVisaoGeralPath(orig)) {
        const suf = suffixForBrand(params.brand);
        if (suf) {
          let p = new URL(orig, location.href).pathname;
          if (!hrefHasBrandSuffix(orig)) {
            p = p.replace(RE_VISAO, (m)=> m + "__brand-target").replace("__brand-target", suf);
          } else {
            ALL_SUFFIXES.forEach(s => { p = p.replace(s, suf); });
          }
          url.pathname = p;
        }
      }

      if (wantHash && !/([#&?])brand=/.test(url.hash)) url.hash = wantHash;
      a.setAttribute("href", url.toString());
    });
  }

  // ---------- filtro de menu (usa href ORIGINAL) ----------
  function filterVisaoGeralInNav(brand){
    const want = suffixForBrand(brand); if(!want) return;
    const links = document.querySelectorAll(".md-nav a[href]");
    let hid = 0;
    links.forEach(a=>{
      const orig = getOrigHref(a);
      if (!isVisaoGeralPath(orig)) return;       // só Visão Geral
      const has = hrefHasBrandSuffix(orig);
      if (!has) return;                          // sem sufixo? não mexe
      const matches = orig.includes(want);
      const li = a.closest("li") || a.parentElement;
      if (li) { li.style.display = matches ? "" : "none"; if (!matches) hid++; }
    });
    return hid; // retorna quantos ocultou (para o warm-up saber)
  }

  function redirectIfWrongVisaoGeral(brand){
    const want = suffixForBrand(brand); if(!want) return;
    const path = location.pathname; if(!isVisaoGeralPath(path)) return;
    const hasAny = hrefHasBrandSuffix(path);
    if (!hasAny) {
      const url = new URL(location.href);
      url.pathname = path.replace(RE_VISAO,(m)=>m+"__brand-target").replace("__brand-target", want);
      history.replaceState(null,"",url.toString()); location.reload(); return;
    }
    if (!path.includes(want)) {
      const url = new URL(location.href);
      let p = path; ALL_SUFFIXES.forEach(s=>{ p=p.replace(s,want); });
      url.pathname = p; history.replaceState(null,"",url.toString()); location.reload();
    }
  }

  // ---------- aplicação com trava + debounce ----------
  let applying = false;
  function applyOnce(){
    if (applying) return; applying = true;
    try{
      const full = params.brand ? `${BASE} ${params.brand}` : BASE;
      setChrome(full);
      const content=document.querySelector(".md-content"); if(content) replaceTextNodes(content, full);
      document.querySelectorAll(".md-sidebar,.md-nav,[data-md-component='toc'],footer").forEach(n=>replaceTextNodes(n, full));

      if (params.brandColor) {
        ensureCss("__brand_css__", `
          header.md-header.md-header--shadow { background-color: ${params.brandColor} !important; }
          .md-nav__link--active { border-left: 3px solid ${params.brandColor}; }
          :root { --brand-color: ${params.brandColor}; }
        `);
      }

      decorateInternalLinks(document);
      ensureHashInUrl();

      // FASE 1: Visão Geral
      filterVisaoGeralInNav(params.brand);
      redirectIfWrongVisaoGeral(params.brand);

      LOG("aplicado →", full, params.brandColor||"(sem cor)");
    }catch(e){ LOG("apply err:", e.message); }
    finally{ applying=false; }
  }

  // --- Warm-up: aguarda a sidebar existir e aplica filtro algumas vezes
  function navReady(){ return document.querySelectorAll(".md-nav a[href]").length > 0; }
  function warmupFilter(){
    let runs = 0;
    const tick = () => {
      runs++;
      decorateInternalLinks(document);                 // garante data-orig-href
      const hidden = filterVisaoGeralInNav(params.brand);
      if (hidden > 0 || runs >= 10) return;            // parou assim que ocultar algo, ou depois de 10 tentativas (~500ms)
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
      // warm-up: se a nav ainda não está pronta, aguarda e filtra
      if (!navReady()) {
        // roda poucas tentativas para pegar a 1ª montagem da nav
        warmupFilter();
      } else {
        // nav já existe: ainda assim roda 2 passes rápidos para garantir
        setTimeout(applyOnce, 80);
        setTimeout(applyOnce, 200);
      }
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

  LOG("carregado; params=", params);
})();
