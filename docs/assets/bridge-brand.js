(function () {
  // --- util: troca "Plataforma" -> "Plataforma {suffix}" em pontos do tema e em textos gerais
  function applyBranding(suffix) {
    const base = "Plataforma";
    const full = suffix ? `${base} ${suffix}` : base;

    // 1) pontos de brand do Material for MkDocs
    const headerEl = document.querySelector(".md-header__title .md-ellipsis") || document.querySelector(".md-header .md-ellipsis");
    if (headerEl) headerEl.textContent = full;

    const sideEl = document.querySelector(".md-nav__title .md-ellipsis") || document.querySelector(".md-sidebar__inner .md-ellipsis");
    if (sideEl) sideEl.textContent = full;

    // 2) <title> (preserva título da página)
    const parts = document.title.split(" - ");
    if (parts.length >= 2) {
      parts[parts.length - 1] = full;
      document.title = parts.join(" - ");
    } else {
      document.title = full;
    }

    // 3) acessibilidade
    const logoBtn = document.querySelector(".md-header__button.md-logo");
    if (logoBtn) logoBtn.setAttribute("aria-label", full);

    // 4) (Opcional) substituir ocorrências soltas no conteúdo
    //    Descomente se quiser forçar em textos também:
    /*
    function replaceText(node) {
      if (node.nodeType === 3 && node.nodeValue.includes(base)) {
        node.nodeValue = node.nodeValue.replaceAll(base, full);
      } else {
        node.childNodes.forEach(replaceText);
      }
    }
    replaceText(document.body);
    */
  }

  // --- util: injeta CSS arbitrário no <head>
  function injectCss(cssText) {
    if (!cssText) return;
    const s = document.createElement('style');
    s.setAttribute('data-from-parent', 'brand');
    s.textContent = cssText;
    document.head.appendChild(s);
  }

  // --- aplica se vier via query (?brand=...)
  const params = new URLSearchParams(location.search);
  const brandQS = params.get('brand');
  if (brandQS) {
    applyBranding(decodeURIComponent(brandQS));
  }

  // Para navegação estilo SPA do Material, re-aplica quando mudar DOM
  const obs = new MutationObserver(() => {
    if (brandQS) applyBranding(decodeURIComponent(brandQS));
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // --- ponte de mensagens vindas do parent
  const ALLOWED_ORIGINS = [
    'https://plataformatarget.com.br',
    'https://facilit.plataformatarget.com.br',
    'https://facilit.github.io'
    // adicione domínios do Target que vão embutir seu MkDocs
  ];

  window.addEventListener('message', (event) => {
    if (!ALLOWED_ORIGINS.includes(event.origin)) return;
    const { source, action, payload } = event.data || {};
    if (source !== 'parent') return;

    if (action === 'setBrand') {
      applyBranding(payload && payload.suffix);
    }
    if (action === 'injectCSS') {
      injectCss(payload && payload.css);
    }
    if (action === 'scrollTo') {
      const hash = payload && payload.hash;
      if (hash) {
        if (location.hash !== hash) location.hash = hash;
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, false);
})();
