(function () {
  const BASE = "Plataforma";

  // Lê sufixo da URL (fallback) e guarda em memória local
  let currentSuffix = (new URLSearchParams(location.search)).get("brand") || "";
  try { if (!currentSuffix) currentSuffix = sessionStorage.getItem("__brandSuffix") || ""; } catch(e) {}

  // Constrói regex que casa "Plataforma" como palavra e NÃO duplica se já houver sufixo
  function makeRegex(suffix){
    const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escapa
    // Plataforma (não seguida por espaço + sufixo já existente)
    return new RegExp(`\\b${BASE}\\b(?!\\s+${escaped})`, "g");
  }

  // Walker que substitui apenas nós de texto, ignorando blocos de código
  function replaceTextNodes(root, suffix) {
    if (!suffix) return;
    const full = `${BASE} ${suffix}`;
    const re = makeRegex(suffix);

    const skipTags = new Set(["PRE","CODE","KBD","SAMP","SCRIPT","STYLE"]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        // pula nós vazios e nós dentro de tags de código
        if (!node.nodeValue || !node.nodeValue.includes(BASE)) return NodeFilter.FILTER_REJECT;
        let p = node.parentNode;
        while (p) {
          if (skipTags.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { n.nodeValue = n.nodeValue.replace(re, full); });
  }

  // Pontos “cromados” do tema (header, sidebar title, <title>, aria-label)
  function setBrandingChrome(suffix){
    const full = suffix ? `${BASE} ${suffix}` : BASE;

    // Header (título)
    document.querySelectorAll('.md-header__title .md-ellipsis,[data-md-component="header-title"] .md-ellipsis')
      .forEach(el => el.textContent = full);

    // Sidebar (título do site no topo do menu)
    document.querySelectorAll('.md-nav__title .md-ellipsis,[data-md-component="sidebar"] .md-nav__title')
      .forEach(el => el.textContent = full);

    // <title> da aba (mantém o prefixo da página)
    const parts = document.title.split(' - ');
    if (parts.length >= 2) {
      parts[parts.length - 1] = full;
      document.title = parts.join(' - ');
    } else {
      document.title = full;
    }

    // Acessibilidade
    const logoBtn = document.querySelector('.md-header__button.md-logo');
    if (logoBtn) logoBtn.setAttribute('aria-label', full);
  }

  function applyBrandEverywhere(suffix){
    setBrandingChrome(suffix);

    // Conteúdo principal
    const content = document.querySelector('.md-content');
    if (content) replaceTextNodes(content, suffix);

    // Sidebar inteira (inclui árvore do menu)
    const sidebar = document.querySelector('.md-sidebar');
    if (sidebar) replaceTextNodes(sidebar, suffix);

    // Breadcrumb / TOC / Footer (quando existirem)
    const toc = document.querySelector('[data-md-component="toc"]');
    if (toc) replaceTextNodes(toc, suffix);

    const footer = document.querySelector('footer');
    if (footer) replaceTextNodes(footer, suffix);
  }

  function injectCss(cssText){
    if (!cssText) return;
    const s = document.createElement('style');
    s.setAttribute('data-from-parent','brand');
    s.textContent = cssText;
    document.head.appendChild(s);
  }

  // 1) Aplica por querystring (se veio)
  if (currentSuffix) applyBrandEverywhere(currentSuffix);

  // 2) Reaplica em navegação SPA
  const reapply = () => { if (currentSuffix) applyBrandEverywhere(currentSuffix); };
  const obs = new MutationObserver(reapply);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // 3) Ponte com o parent (Target)
  const ALLOWED_ORIGINS = [
    'https://facilit.plataformatarget.com.br',
    'https://prprodutivo-homologacao.planejar.pr.gov.br',
    'http://localhost:8080',
    'https://facilit.github.io' // pode remover em produção; útil para testes
  ];

  window.addEventListener('message', (event) => {
    if (!ALLOWED_ORIGINS.includes(event.origin)) return;
    const { source, action, payload } = event.data || {};
    if (source !== 'parent') return;

    if (action === 'setBrand') {
      currentSuffix = payload?.suffix || '';
      try { sessionStorage.setItem('__brandSuffix', currentSuffix); } catch(e) {}
      applyBrandEverywhere(currentSuffix);
    }
    if (action === 'injectCSS') injectCss(payload?.css);
    if (action === 'scrollTo') {
      const hash = payload?.hash;
      if (!hash) return;
      if (location.hash !== hash) location.hash = hash;
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, false);
})();
