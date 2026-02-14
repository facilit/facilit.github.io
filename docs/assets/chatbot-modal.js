// Chatbot Modal Script
(function() {
  const CHATBOT_URL = 'https://iahml1.plataformatarget.com.br/unified';
  const IFRAME_TIMEOUT = 5000; // 5 segundos para o iframe carregar

  // Inject HTML structure
  function injectChatbotHTML() {
    // Check if already injected
    if (document.getElementById('chatbot-overlay')) {
      return;
    }

    const html = `
      <button class="chatbot-button" id="chatbot-btn" title="Chat IA" aria-label="Abrir Chat IA">
        💬
      </button>
      <div class="chatbot-overlay" id="chatbot-overlay">
        <div class="chatbot-modal" id="chatbot-modal">
          <div class="chatbot-modal-header">
            <h2 class="chatbot-modal-title">Chat IA</h2>
            <button class="chatbot-modal-close-button" id="chatbot-modal-close" aria-label="Fechar modal" title="Fechar (ESC)">
              ✕
            </button>
          </div>
          <div class="chatbot-modal-body" id="chatbot-modal-body">
            <div class="chatbot-loading">Carregando chat...</div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  // Create and inject iframe
  function createIframe() {
    const body = document.getElementById('chatbot-modal-body');
    if (!body) return;

    // Clear existing content
    body.innerHTML = '';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'chatbot-iframe';
    iframe.src = CHATBOT_URL;
    iframe.title = 'Chat IA Assistant';
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
      console.log('Chatbot iframe loaded successfully');
    };

    iframe.onerror = () => {
      clearTimeout(errorTimeout);
      console.log('Chatbot iframe failed to load');
      showFallback();
    };

    body.appendChild(iframe);
  }

  // Show fallback link
  function showFallback() {
    const body = document.getElementById('chatbot-modal-body');
    if (!body) return;

    body.innerHTML = `
      <div class="chatbot-fallback">
        <p class="chatbot-fallback-message">
          Não foi possível carregar o chat aqui. Seu navegador ou servidor pode estar bloqueando o embed.
        </p>
        <a href="${CHATBOT_URL}" target="_blank" rel="noopener noreferrer" class="chatbot-fallback-link">
          Abrir em nova aba →
        </a>
      </div>
    `;
  }

  // Open modal
  function openModal() {
    const overlay = document.getElementById('chatbot-overlay');
    const modal = document.getElementById('chatbot-modal');
    const body = document.body;

    if (overlay && modal) {
      overlay.classList.add('active');
      body.classList.add('chatbot-modal-open');

      // Create iframe only when modal is opened
      createIframe();

      // Set focus to close button for accessibility
      setTimeout(() => {
        const closeBtn = document.getElementById('chatbot-modal-close');
        if (closeBtn) {
          closeBtn.focus();
        }
      }, 100);
    }
  }

  // Close modal
  function closeModal() {
    const overlay = document.getElementById('chatbot-overlay');
    const body = document.getElementById('chatbot-modal-body');
    const body_element = document.body;
    const chatbotBtn = document.getElementById('chatbot-btn');

    if (overlay) {
      overlay.classList.remove('active');
      body_element.classList.remove('chatbot-modal-open');

      // Remove iframe from DOM to free resources
      if (body) {
        body.innerHTML = '<div class="chatbot-loading">Carregando chat...</div>';
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
    const closeBtn = document.getElementById('chatbot-modal-close');

    // Open button
    if (chatbotBtn) {
      chatbotBtn.addEventListener('click', openModal);
    }

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (overlay && overlay.classList.contains('active')) {
          closeModal();
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
