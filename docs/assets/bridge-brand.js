(function () {
  const BASE = "Plataforma";
  const ORIGENS_OK = [
    "https://facilit.plataformatarget.com.br", // domínio do Target em produção
    "http://localhost:8080",                   // se você testa local
    "https://facilit.github.io"                // útil p/ testes; pode remover depois
  ];

  function log(){ try{ console.log('[bridge-brand]', ...arguments); }catch{} }

  function replaceTextNodes(root, full){
    const esc = full.split(' ').slice(1).join(' ');
    const re = new RegExp(`\\b${BASE}\\b(?!\\s+${esc})`,'g');
    const skip = new Set(["PRE","CODE","KBD","SAMP","SCRIPT","STYLE"]);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || !n.nodeValue.includes(BASE)) return NodeFilter.FILTER_REJECT;
        for (let p=n.parentNode; p; p=p.parentNode){ if (skip.has(p.nodeName)) return NodeFilter.FILTER_REJECT; }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[]; while(w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => n.nodeValue = n.nodeValue.replace(re, full));
  }

  function setChrome(full){
    document.querySelectorAll('.md-header__title .md-ellipsis,[data-md-component="header-title"] .md-ellipsis')
      .forEach(el => el.textContent = full);
    document.querySelectorAll('.md-nav__title .md-ellipsis,[data-md-component="sidebar"] .md-nav__title')
      .forEach(el => el.textContent = full);
    const parts = document.title.split(' - ');
    document.title = (parts.length>=2) ? [...parts.slice(0,-1), full].join(' - ') : full;
    const logo = document.querySelector('.md-header__button.md-logo');
    if (logo) logo.setAttribute('aria-label', full);
  }

  function applyAll(suf){
    const full = suf ? `${BASE} ${suf}` : BASE;
    setChrome(full);
    const content = document.querySelector('.md-content'); if (content) replaceTextNodes(content, full);
    document.querySelectorAll('.md-sidebar,.md-nav,[data-md-component="toc"],footer').forEach(n => replaceTextNodes(n, full));
    log('applyAll OK →', full);
  }

  function injectCss(css){
    if (!css) return;
    const s = document.createElement('style');
    s.setAttribute('data-from-parent','brand');
    s.textContent = css;
    document.head.appendChild(s);
    log('CSS injetado');
  }

  // 1) por querystring
  const qs = new URLSearchParams(location.search);
  const qsBrand = qs.get('brand');
  if (qsBrand){ log('brand via URL:', qsBrand); applyAll(qsBrand); }

  // 2) reaplica em SPA
  const obs = new MutationObserver(() => { if (qsBrand) applyAll(qsBrand); });
  obs.observe(document.documentElement, { childList:true, subtree:true });

  // 3) ouvir parent
  window.addEventListener('message', (ev) => {
    if (!ORIGENS_OK.includes(ev.origin)) return;
    const { source, action, payload } = ev.data || {};
    if (source !== 'parent') return;
    if (action === 'setBrand')  { log('setBrand', payload?.suffix); applyAll(payload?.suffix || ''); }
    if (action === 'injectCSS') { log('injectCSS'); injectCss(payload?.css); }
  });

  log('bridge-brand.js carregado');
})();
