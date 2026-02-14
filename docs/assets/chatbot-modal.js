// Chatbot Drawer Script - Suporte IA
(function() {
  const CHATBOT_URL = 'https://iahml1.plataformatarget.com.br/unified';
  const IFRAME_TIMEOUT = 5000; // ms

  // Injeta HTML do drawer
  function injectChatbotHTML() {
    if (document.getElementById('chatbot-overlay')) return;

    const html = `
      <button class="chatbot-button" id="chatbot-btn" title="Suporte IA" aria-label="Abrir Suporte IA">
        <span class="chatbot-icon">💬</span>
        <span class="chatbot-text">Suporte IA</span>
      </button>
      <div class="chatbot-overlay" id="chatbot-overlay" aria-hidden="true">
        <aside class="chatbot-drawer" id="chatbot-drawer" role="dialog" aria-modal="true" aria-label="Suporte IA">
          <header class="chatbot-drawer-header">
            <h3 class="chatbot-drawer-title">Suporte IA</h3>
            <button class="chatbot-drawer-close" id="chatbot-drawer-close" aria-label="Fechar painel">✕</button>
          </header>
          <div class="chatbot-drawer-body" id="chatbot-drawer-body">
            <div class="chatbot-loading">
              <div class="spinner"></div>
              <div>Carregando chat...</div>
            </div>
          </div>
        </aside>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  // Cria e injeta iframe quando drawer abre
  function createIframe() {
    const body = document.getElementById('chatbot-drawer-body');
    if (!body) return;

    // Clear and show loading
    body.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'chatbot-loading';
    loading.innerHTML = '<div class="spinner"></div><div>Carregando chat...</div>';
    body.appendChild(loading);

    const iframe = document.createElement('iframe');
    iframe.className = 'chatbot-iframe';
    iframe.title = 'Suporte IA';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write; microphone; camera; autoplay');

    let timedOut = false;
    const t = setTimeout(() => {
      timedOut = true;
      showFallback();
    }, IFRAME_TIMEOUT);

    iframe.onload = () => {
      clearTimeout(t);
      if (timedOut) return; // fallback already shown
      // replace loading with iframe
      body.innerHTML = '';
      body.appendChild(iframe);
      console.log('[chatbot] iframe loaded');
    };

    iframe.onerror = () => {
      clearTimeout(t);
      showFallback();
    };

    // Set src last to start loading after handlers are attached
    setTimeout(() => {
      iframe.src = CHATBOT_URL;
    }, 50);
  }

  // Mostra fallback se iframe falhar
  function showFallback() {
    const body = document.getElementById('chatbot-drawer-body');
    if (!body) return;
    body.innerHTML = `
      <div class="chatbot-fallback">
        <a class="chatbot-fallback-link" href="${CHATBOT_URL}" target="_blank" rel="noopener noreferrer">Abrir em nova aba →</a>
      </div>
    `;
  }

  // Abre drawer
  function openDrawer() {
    const overlay = document.getElementById('chatbot-overlay');
    const btn = document.getElementById('chatbot-btn');
    if (!overlay) return;

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('chatbot-drawer-open');

    // create iframe lazily
    createIframe();

    // move focus to close button
    setTimeout(() => {
      const close = document.getElementById('chatbot-drawer-close');
      if (close) close.focus();
    }, 120);

    // store opener for returning focus later
    overlay._opener = btn;
  }

  // Fecha drawer
  function closeDrawer() {
    const overlay = document.getElementById('chatbot-overlay');
    const body = document.getElementById('chatbot-drawer-body');
    if (!overlay) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('chatbot-drawer-open');

    // remove iframe to free resources
    if (body) {
      body.innerHTML = '<div class="chatbot-loading"><div class="spinner"></div><div>Carregando chat...</div></div>';
    }

    // return focus to opener
    try {
      const opener = overlay._opener;
      if (opener && typeof opener.focus === 'function') opener.focus();
    } catch (e) {}
  }

  // Event listeners setup
  function setupEventListeners() {
    const overlay = document.getElementById('chatbot-overlay');
    const btn = document.getElementById('chatbot-btn');
    const close = document.getElementById('chatbot-drawer-close');

    if (btn) btn.addEventListener('click', openDrawer);
    if (close) close.addEventListener('click', closeDrawer);

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        // close when clicking overlay (outside drawer)
        if (e.target === overlay) closeDrawer();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        const overlayEl = document.getElementById('chatbot-overlay');
        if (overlayEl && overlayEl.classList.contains('active')) {
          closeDrawer();
        }
      }
    });
  }

  // Initialize when DOM is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectChatbotHTML();
        setupEventListeners();
      });
    } else {
      injectChatbotHTML();
      setupEventListeners();
    }
  }

  // Start initialization
  init();

})();
