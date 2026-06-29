// Chatbot Drawer - Suporte IA (Target brand only)
(function() {
  const CHATBOT_URL = 'https://iahml1.plataformatarget.com.br/unified';
  const IFRAME_TIMEOUT = 5000;

  // Detecta se a brand atual é "target"
  function isTargetBrand() {
    try {
      const stored = JSON.parse(sessionStorage.getItem('__brand_params') || '{}');
      const brandCode = stored.brandCode || 'target';
      return brandCode.toLowerCase() === 'target';
    } catch (e) {
      return true; // default target
    }
  }

  // Inject HTML structure
  function injectChatbotHTML() {
    if (document.getElementById('chatbot-overlay')) {
      return;
    }

    const html = `
      <button class="chatbot-button" id="chatbot-btn" title="Suporte IA" aria-label="Abrir Suporte IA">
        <span class="chatbot-icon">💬</span>
        <span class="chatbot-text">Suporte IA</span>
      </button>
      <div class="chatbot-overlay" id="chatbot-overlay">
        <aside class="chatbot-drawer" id="chatbot-drawer">
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

  // Create and inject iframe
  function createIframe() {
    const body = document.getElementById('chatbot-drawer-body');
    if (!body) return;

    // Clear existing content
    body.innerHTML = '';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'chatbot-iframe';
    iframe.src = CHATBOT_URL;
    iframe.title = 'Suporte IA';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write; microphone; camera; autoplay');

    // Setup error detection
    const errorTimeout = setTimeout(() => {
      if (body.contains(iframe)) {
        showFallback();
      }
    }, IFRAME_TIMEOUT);

    // Event listeners for iframe
    iframe.onload = () => {
      clearTimeout(errorTimeout);
      console.log('[chatbot] iframe loaded successfully');
    };

    iframe.onerror = () => {
      clearTimeout(errorTimeout);
      console.log('[chatbot] iframe failed to load');
      showFallback();
    };

    body.appendChild(iframe);
  }

  // Show fallback link
  function showFallback() {
    const body = document.getElementById('chatbot-drawer-body');
    if (!body) return;

    body.innerHTML = `
      <div class="chatbot-fallback">
        <a href="${CHATBOT_URL}" target="_blank" rel="noopener noreferrer" class="chatbot-fallback-link">
          Abrir em nova aba →
        </a>
      </div>
    `;
  }

  // Open drawer
  function openDrawer() {
    const overlay = document.getElementById('chatbot-overlay');
    const body = document.body;
    const btn = document.getElementById('chatbot-btn');

    if (overlay) {
      overlay.classList.add('active');
      body.classList.add('chatbot-drawer-open');
      if (btn) btn.classList.add('active');

      // Create iframe only when drawer is opened
      createIframe();

      // Set focus to close button for accessibility
      setTimeout(() => {
        const closeBtn = document.getElementById('chatbot-drawer-close');
        if (closeBtn) {
          closeBtn.focus();
        }
      }, 100);
    }
  }

  // Close drawer
  function closeDrawer() {
    const overlay = document.getElementById('chatbot-overlay');
    const body = document.getElementById('chatbot-drawer-body');
    const body_element = document.body;
    const chatbotBtn = document.getElementById('chatbot-btn');

    if (overlay) {
      overlay.classList.remove('active');
      body_element.classList.remove('chatbot-drawer-open');
      if (chatbotBtn) chatbotBtn.classList.remove('active');

      // Remove iframe from DOM to free resources
      if (body) {
        body.innerHTML = '<div class="chatbot-loading"><div class="spinner"></div><div>Carregando chat...</div></div>';
      }

      // Return focus to button for accessibility
      if (chatbotBtn) {
        chatbotBtn.focus();
      }
    }
  }

  // Event listeners setup
  function setupEventListeners() {
    const chatbotBtn = document.getElementById('chatbot-btn');
    const overlay = document.getElementById('chatbot-overlay');
    const closeBtn = document.getElementById('chatbot-drawer-close');

    // Open button
    if (chatbotBtn) {
      chatbotBtn.addEventListener('click', openDrawer);
    }

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeDrawer();
        }
      });
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (overlay && overlay.classList.contains('active')) {
          closeDrawer();
        }
      }
    });
  }

  // Initialize when DOM is ready
  function init() {
    // Only inject for target brand
    if (!isTargetBrand()) {
      console.log('[chatbot] Brand is not Target, drawer disabled');
      return;
    }

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
