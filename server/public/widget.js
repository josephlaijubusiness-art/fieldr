/*
 * Fieldr chat widget.
 * Served by the backend at /widget/CLIENT_ID with __CLIENT_ID__ filled in.
 * Plain JavaScript, no dependencies — safe to drop into any website.
 */
(function () {
  'use strict';

  var CLIENT_ID = '__CLIENT_ID__';

  // Work out where "home" is from the script tag itself, so the same file
  // works on localhost and on app.fieldr.ie without any configuration.
  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('/widget/') !== -1) return all[i];
      }
      return null;
    })();
  if (!script) return;
  var API_BASE = new URL(script.src).origin;

  // Each visitor gets a random session ID, remembered by their browser,
  // so the bot can keep track of the conversation.
  var sessionKey = 'fieldr_session_' + CLIENT_ID;
  var sessionId;
  try {
    sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = 'fs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(sessionKey, sessionId);
    }
  } catch (e) {
    sessionId = 'fs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  // Pick black or white text depending on how dark the brand colour is.
  function textColorFor(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111111' : '#ffffff';
  }

  function init(cfg) {
    var brand = /^#[0-9a-fA-F]{6}$/.test(cfg.brand_color) ? cfg.brand_color : '#2563EB';
    var onBrand = textColorFor(brand);

    var style = document.createElement('style');
    style.textContent =
      '#fieldr-root{position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '#fieldr-bubble{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:' + brand + ';color:' + onBrand + ';box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;transition:transform .15s ease}' +
      '#fieldr-bubble:hover{transform:scale(1.07)}' +
      '#fieldr-panel{display:none;flex-direction:column;position:absolute;bottom:72px;right:0;width:350px;height:500px;max-height:calc(100vh - 110px);background:#fff;border-radius:14px;box-shadow:0 8px 36px rgba(0,0,0,.28);overflow:hidden}' +
      '#fieldr-panel.fieldr-open{display:flex}' +
      '#fieldr-header{background:' + brand + ';color:' + onBrand + ';padding:14px 16px;font-weight:600;font-size:15px;display:flex;justify-content:space-between;align-items:center}' +
      '#fieldr-close{background:none;border:none;color:' + onBrand + ';font-size:20px;line-height:1;cursor:pointer;padding:0 2px}' +
      '#fieldr-msgs{flex:1;overflow-y:auto;padding:14px;background:#f7f7f8;display:flex;flex-direction:column;gap:8px}' +
      '.fieldr-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}' +
      '.fieldr-bot{background:#e9e9ee;color:#1a1a1a;align-self:flex-start;border-bottom-left-radius:4px}' +
      '.fieldr-visitor{background:' + brand + ';color:' + onBrand + ';align-self:flex-end;border-bottom-right-radius:4px}' +
      '.fieldr-typing span{display:inline-block;width:6px;height:6px;margin:0 1.5px;background:#999;border-radius:50%;animation:fieldr-blink 1.2s infinite}' +
      '.fieldr-typing span:nth-child(2){animation-delay:.2s}.fieldr-typing span:nth-child(3){animation-delay:.4s}' +
      '@keyframes fieldr-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}' +
      '#fieldr-form{display:flex;border-top:1px solid #e5e5ea;background:#fff}' +
      '#fieldr-input{flex:1;border:none;padding:13px 14px;font-size:14px;outline:none;font-family:inherit}' +
      '#fieldr-send{border:none;background:none;color:' + brand + ';font-weight:700;font-size:14px;padding:0 16px;cursor:pointer}' +
      '#fieldr-send:disabled{opacity:.4;cursor:default}' +
      '#fieldr-foot{text-align:center;font-size:11px;color:#9a9aa2;padding:5px 0 7px;background:#fff}' +
      '#fieldr-foot a{color:#9a9aa2;text-decoration:none}' +
      '@media (max-width:480px){#fieldr-panel{width:calc(100vw - 24px);right:-8px;height:70vh}}';
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.id = 'fieldr-root';
    root.innerHTML =
      '<div id="fieldr-panel" role="dialog" aria-label="Chat">' +
      '<div id="fieldr-header"><span></span><button id="fieldr-close" aria-label="Close">&#10005;</button></div>' +
      '<div id="fieldr-msgs"></div>' +
      '<form id="fieldr-form"><input id="fieldr-input" type="text" maxlength="4000" placeholder="Type a message..." autocomplete="off"><button id="fieldr-send" type="submit">Send</button></form>' +
      '<div id="fieldr-foot"><a href="https://fieldr.ie" target="_blank" rel="noopener">Powered by Fieldr</a></div>' +
      '</div>' +
      '<button id="fieldr-bubble" aria-label="Open chat">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
      '</button>';
    document.body.appendChild(root);

    root.querySelector('#fieldr-header span').textContent = cfg.bot_name || 'Chat';

    var panel = root.querySelector('#fieldr-panel');
    var msgs = root.querySelector('#fieldr-msgs');
    var form = root.querySelector('#fieldr-form');
    var input = root.querySelector('#fieldr-input');
    var send = root.querySelector('#fieldr-send');
    var welcomed = false;

    function addMsg(text, who) {
      var el = document.createElement('div');
      el.className = 'fieldr-msg fieldr-' + who;
      el.textContent = text; // textContent = no HTML injection, ever
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }

    function toggle(open) {
      panel.classList.toggle('fieldr-open', open);
      if (open && !welcomed) {
        welcomed = true;
        addMsg(cfg.welcome_message || 'Hi! How can I help you today?', 'bot');
      }
      if (open) input.focus();
    }

    root.querySelector('#fieldr-bubble').addEventListener('click', function () {
      toggle(!panel.classList.contains('fieldr-open'));
    });
    root.querySelector('#fieldr-close').addEventListener('click', function () {
      toggle(false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || send.disabled) return;
      input.value = '';
      addMsg(text, 'visitor');

      send.disabled = true;
      var typing = document.createElement('div');
      typing.className = 'fieldr-msg fieldr-bot fieldr-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;

      fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, session_id: sessionId, message: text }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          typing.remove();
          addMsg(data.reply || data.error || 'Sorry, something went wrong. Please try again.', 'bot');
        })
        .catch(function () {
          typing.remove();
          addMsg('Sorry, I could not connect just now. Please try again in a moment.', 'bot');
        })
        .finally(function () {
          send.disabled = false;
          input.focus();
        });
    });
  }

  // Fetch this client's look-and-feel, then build the widget.
  fetch(API_BASE + '/api/widget/' + CLIENT_ID + '/config')
    .then(function (r) {
      if (!r.ok) throw new Error('Fieldr widget: config unavailable (' + r.status + ')');
      return r.json();
    })
    .then(function (cfg) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(cfg); });
      } else {
        init(cfg);
      }
    })
    .catch(function (err) {
      console.warn(String(err));
    });
})();
