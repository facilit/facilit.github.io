(function () {
  const BASE = "Plataforma";

  function replaceTextNodes(root, full) {
    // varre apenas nós de TEXTO, sem mexer em atributos/links
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const re = new RegExp(`\\b${BASE}\\b`, 'g'); // palavra exata
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      if (re.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, full);
    });
  }

  function setBrandingOnChrome(full) {
    // header
    document.querySelectorAll('.md-header__title .md-ellipsis, [data-md-component="header-title"] .md-ellipsis')
      .forEach(el => el.textContent = full);

    // título do site na sidebar (topo)
    document.querySelectorAll('.md-nav__title .md-ellipsis, [data-md-component="sidebar"] .md-nav__title')
      .forEach(el => el.textContent = full);

    // <title> da aba (mantém prefixos)
    const parts = document.title.split(' - ');
    if (parts.length >= 2) {
      parts[parts.length - 1] = full;
      document.title = parts.join(' - ');
    } else {
      document.title = full;
    }

    // acessibilidade
    const logoBtn = document.querySelector('.md-header__button.md-logo');
    if (logoBtn) logoBtn.setAttribute('aria-label', full);
  }

  function applyBrand(suffix) {
    const full = suffix ? `${BASE} ${suffix}` : BASE;

    // pontos de UI fixos
    setBrandingOnChrome(full);

    // *** troca também no MENU e CONTEÚDO ***
    const content = document.querySelector('.md-content');
    if (content) replaceTextNodes(content, full);

    const sidebar = document.querySelector('.md-sidebar');
    if (sidebar) replaceTextNodes(sidebar, full);
  }

  function injectCss(cssText) {
    if (!cssText) return;
    const s = document.createElement('style');
    s.setAttribute('data-from-parent', 'brand');
    s.textContent = cssText;
    document.head.appendChild(s);
  }

  // 1) aplica por querystring
  const params = new URLSearchParams(location.search);
  let currentSuffix = params.get('brand') ? decodeURIComponent(params.get('brand')) : '';

  if (currentSuffix) applyBrand(currentSuffix);

  // 2) re-aplica ao trocar de página (SPA do Material)
  const reapply = () => { if (currentSuffix) applyBrand(currentSuffix); };
  const obs = new MutationObserver(reapply);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // 3) ponte postMessage
  const ALLOWED_ORIGINS = [
    'https://facilit.plataformatarget.com.br',
    'https://prprodutivo-homologacao.planejar.pr.gov.br',
    'http://localhost:8080',
    'https://facilit.github.io' // deixe enquanto testa
  ];

  window.addEventListener('message', (event) => {
    if (!ALLOWED_ORIGINS.includes(event.origin)) return;
    const { source, action, payload } = event.data || {};
    if (source !== 'parent') return;

    if (action === 'setBrand') {
      currentSuffix = payload?.suffix || '';
      applyBrand(currentSuffix);
    }
    if (action === 'injectCSS') {
      injectCss(payload?.css);
    }
    if (action === 'scrollTo') {
      const hash = payload?.hash;
      if (hash) {
        if (location.hash !== hash) location.hash = hash;
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, false);
})();
