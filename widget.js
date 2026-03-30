/**
 * Ask Wakefield — Embeddable Widget
 * Drop one <script> tag on any page to add the Ask Wakefield chat assistant.
 * https://wakefield-demo.mediahubink.com/widget.js
 */
(function () {
  'use strict';

  const API_URL = 'https://wakefield-demo.mediahubink.com/api/chat';
  const ACCENT  = '#c8991e';
  const PRIMARY = '#1c3a28';
  const RADIUS  = '14px';

  const CSS = `
    #aw-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 58px;
      height: 58px;
      background: ${PRIMARY};
      border-radius: 50%;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(28,58,40,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99998;
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: 'Georgia', serif;
      font-size: 20px;
      font-weight: 700;
      color: ${ACCENT};
    }
    #aw-widget-btn:hover {
      transform: scale(1.07);
      box-shadow: 0 6px 28px rgba(28,58,40,0.45);
    }
    #aw-widget-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 500px;
      max-height: calc(100dvh - 120px);
      background: #ffffff;
      border-radius: ${RADIUS};
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    #aw-widget-panel.aw-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    #aw-header {
      background: ${PRIMARY};
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    #aw-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #aw-avatar {
      width: 34px;
      height: 34px;
      background: ${ACCENT};
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Georgia', serif;
      font-size: 16px;
      font-weight: 700;
      color: ${PRIMARY};
    }
    #aw-title {
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.2px;
    }
    #aw-subtitle {
      color: rgba(255,255,255,0.5);
      font-size: 11px;
      margin-top: 1px;
    }
    #aw-close {
      background: rgba(255,255,255,0.1);
      border: none;
      color: rgba(255,255,255,0.7);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    #aw-close:hover { background: rgba(255,255,255,0.2); }
    #aw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }
    #aw-messages::-webkit-scrollbar { width: 4px; }
    #aw-messages::-webkit-scrollbar-track { background: transparent; }
    #aw-messages::-webkit-scrollbar-thumb { background: #e2ddd5; border-radius: 10px; }
    .aw-msg {
      display: flex;
      gap: 8px;
      max-width: 88%;
    }
    .aw-msg.aw-bot { align-self: flex-start; }
    .aw-msg.aw-user { align-self: flex-end; flex-direction: row-reverse; }
    .aw-msg-av {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: ${PRIMARY};
      color: ${ACCENT};
      font-size: 11px;
      font-weight: 700;
      font-family: 'Georgia', serif;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .aw-msg.aw-user .aw-msg-av {
      background: ${ACCENT};
      color: ${PRIMARY};
    }
    .aw-bubble {
      padding: 9px 13px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.55;
      color: #1a1a1a;
    }
    .aw-msg.aw-bot .aw-bubble {
      background: #f5f2ec;
      border-bottom-left-radius: 4px;
    }
    .aw-msg.aw-user .aw-bubble {
      background: ${PRIMARY};
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .aw-bubble a { color: ${ACCENT}; }
    .aw-msg.aw-user .aw-bubble a { color: #f0c040; }
    .aw-typing-dots {
      display: flex;
      gap: 4px;
      padding: 2px 0;
    }
    .aw-typing-dots span {
      width: 6px; height: 6px;
      background: #9ca3af;
      border-radius: 50%;
      animation: aw-dot 1.2s infinite;
    }
    .aw-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .aw-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes aw-dot {
      0%,60%,100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }
    #aw-chips {
      padding: 8px 12px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      border-top: 1px solid #e2ddd5;
    }
    .aw-chip {
      background: #eef3ec;
      border: 1px solid #c8ddc1;
      color: ${PRIMARY};
      font-size: 11.5px;
      font-weight: 500;
      padding: 5px 11px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .aw-chip:hover {
      background: ${PRIMARY};
      color: #fff;
      border-color: ${PRIMARY};
    }
    #aw-input-row {
      display: flex;
      gap: 8px;
      padding: 10px 12px 12px;
      align-items: center;
    }
    #aw-input {
      flex: 1;
      border: 1.5px solid #e2ddd5;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13.5px;
      font-family: inherit;
      color: #1a1a1a;
      background: #f5f2ec;
      outline: none;
      transition: border-color 0.15s;
    }
    #aw-input:focus { border-color: ${PRIMARY}; }
    #aw-input::placeholder { color: #9ca3af; }
    #aw-send {
      background: ${PRIMARY};
      border: none;
      border-radius: 8px;
      width: 38px;
      height: 38px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    #aw-send:hover { background: #2a5239; }
    #aw-send:disabled { background: #9ca3af; cursor: not-allowed; }
    #aw-disclaimer {
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      padding: 0 12px 8px;
    }
  `;

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildWidget() {
    // Button
    const btn = document.createElement('button');
    btn.id = 'aw-widget-btn';
    btn.setAttribute('aria-label', 'Open Ask Wakefield chat');
    btn.textContent = 'AW';

    // Panel
    const panel = document.createElement('div');
    panel.id = 'aw-widget-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask Wakefield chat assistant');

    panel.innerHTML = `
      <div id="aw-header">
        <div id="aw-header-left">
          <div id="aw-avatar">A</div>
          <div>
            <div id="aw-title">Ask Wakefield</div>
            <div id="aw-subtitle">Independent · Not official council</div>
          </div>
        </div>
        <button id="aw-close" aria-label="Close chat">✕</button>
      </div>
      <div id="aw-messages">
        <div class="aw-msg aw-bot">
          <div class="aw-msg-av">A</div>
          <div class="aw-bubble">Hi! I can help with bins, road closures, leisure centres, Council Tax and schools. What do you need?</div>
        </div>
      </div>
      <div id="aw-chips">
        <div class="aw-chip" data-q="When is my bin collected?">Bin collections</div>
        <div class="aw-chip" data-q="How do I find road closures near me?">Road closures</div>
        <div class="aw-chip" data-q="How do I get a Council Tax discount?">Council Tax</div>
        <div class="aw-chip" data-q="When are Wakefield school holidays?">School dates</div>
      </div>
      <div id="aw-input-row">
        <input id="aw-input" type="text" placeholder="Ask something..." autocomplete="off" />
        <button id="aw-send">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div id="aw-disclaimer">Independent tool — not affiliated with Wakefield Council</div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    return { btn, panel };
  }

  function initWidget() {
    injectStyles();
    const { btn, panel } = buildWidget();

    const messagesEl = panel.querySelector('#aw-messages');
    const inputEl    = panel.querySelector('#aw-input');
    const sendEl     = panel.querySelector('#aw-send');
    const chipsEl    = panel.querySelector('#aw-chips');
    const closeEl    = panel.querySelector('#aw-close');

    let history = [];
    let chipsHidden = false;

    // Toggle
    btn.addEventListener('click', () => {
      panel.classList.toggle('aw-open');
      if (panel.classList.contains('aw-open')) inputEl.focus();
    });
    closeEl.addEventListener('click', () => panel.classList.remove('aw-open'));

    // Chips
    chipsEl.querySelectorAll('.aw-chip').forEach(chip => {
      chip.addEventListener('click', () => send(chip.dataset.q));
    });

    function hideChips() {
      if (!chipsHidden) { chipsEl.style.display = 'none'; chipsHidden = true; }
    }

    function appendMsg(role, text) {
      const wrapper = document.createElement('div');
      wrapper.className = `aw-msg aw-${role}`;

      const av = document.createElement('div');
      av.className = 'aw-msg-av';
      av.textContent = role === 'bot' ? 'A' : 'Y';

      const bubble = document.createElement('div');
      bubble.className = 'aw-bubble';
      bubble.innerHTML = fmt(text);

      wrapper.appendChild(av);
      wrapper.appendChild(bubble);
      messagesEl.appendChild(wrapper);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function fmt(t) {
      return t
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
        .replace(/\n/g,'<br />');
    }

    function showTyping() {
      const w = document.createElement('div');
      w.className = 'aw-msg aw-bot'; w.id = 'aw-typing';
      const av = document.createElement('div'); av.className = 'aw-msg-av'; av.textContent = 'A';
      const b = document.createElement('div'); b.className = 'aw-bubble';
      b.innerHTML = '<div class="aw-typing-dots"><span></span><span></span><span></span></div>';
      w.appendChild(av); w.appendChild(b);
      messagesEl.appendChild(w);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTyping() {
      const el = panel.querySelector('#aw-typing');
      if (el) el.remove();
    }

    async function send(text) {
      text = (text || inputEl.value).trim();
      if (!text) return;
      hideChips();
      inputEl.value = '';
      sendEl.disabled = true;

      appendMsg('user', text);
      history.push({ role: 'user', content: text });
      showTyping();

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history })
        });
        const data = await res.json();
        removeTyping();
        const reply = data.reply || 'Sorry, something went wrong.';
        appendMsg('bot', reply);
        history.push({ role: 'assistant', content: reply });
      } catch {
        removeTyping();
        appendMsg('bot', 'Connection error. Please try again.');
      }
      sendEl.disabled = false;
      inputEl.focus();
    }

    sendEl.addEventListener('click', () => send());
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
