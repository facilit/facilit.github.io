(function () {
  const BASE = "Plataforma";

  function log(){ try{ console.log("[bridge-brand]", ...arguments); }catch{} }

  function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function replaceTextNodes(root, full) {
    // substitui a palavra isolada "Plataforma" sem duplicar o sufixo
    const suf = full.split(' ').slice(1).join(' ');
    const re  = new RegExp(`\\b${BASE}\\b(?!\\s+${escapeRe(suf)})`, 'g');
    const skip = new Set(["PRE","CODE","KBD","SAMP","SCRIPT","STYLE"]);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || !n.nodeValue.includes(BASE)) return NodeFilter.FILTER_REJECT;
        for (let p=n.parentNode; p; p=p.parentNode) if (skip.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => n.nodeValue = n.nodeValue.replace(re, full));
  }

  function setChrome(full){
    // header / brand
    document.querySelectorAll('.md-header__title .md-ellipsis,[data-md-component="header-title"] .md-ellipsis')
      .forEach(el => el.textContent = full);
    // título do site na sidebar
    document.querySelectorAll('.md-nav__title .md-ellipsis,[data-md-component="sidebar"] .md-nav__title')
      .forEach(el => el.textContent = full);
    // <title>
    const parts = document.title.split(' - ');
    document.title = (parts.length>=2) ? [...parts.slice(0,-1), full].join(' - ') : full;
    // acessibilidade
    const logo = document.querySelector('.md-header__button.md-logo');
    if (logo) logo.setAttribute('aria-label', full);
  }

  function injectCss(css){
    if (!css) return;
    const s = document.createElement('style');
    s.setAttribute('data-brand', 'true');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function applyBrand(brand, color){
    const full = brand ? `${BASE} ${brand}` : BASE;
    setChrome(full);
    // conteúdo + menus + toc + footer
    const content = document.querySelector('.md-content'); if (content) replaceTextNodes(content, full);
    document.querySelectorAll('.md-sidebar,.md-nav,[data-md-component="toc"],footer')
      .forEach(n => replaceTextNodes(n, full));

    if (color) {
      // cor do header + realces básicos
      injectCss(`
        header.md-header.md-header--shadow { background-color: ${color} !important; }
        .md-nav__link--active { border-left: 3px solid ${color}; }
        :root { --brand-color: ${color}; }
      `);
    }
    log("applyBrand OK →", full, color || '(sem cor)');
  }

  // Ler parâmetros da URL
  const qs = new URLSearchParams(location.search);
  const brand      = qs.get('brand') ? decodeURIComponent(qs.get('brand')) : '';
  const brandColor = qs.get('brandColor'); // ex.: %230a6cff

  if (brand || brandColor) applyBrand(brand, brandColor);

  // Reaplica em navegação SPA
  const obs = new MutationObserver(() => { if (brand || brandColor) applyBrand(brand, brandColor); });
  obs.observe(document.documentElement, { childList:true, subtree:true });

  log("bridge-brand.js carregado; brand=", brand, "color=", brandColor);
})();
