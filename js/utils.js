/* =========================================================
   6726.Bet — utils.js
   Helpers globais: formatação, validação, toast, sons, DOM.
   ========================================================= */
(function (global) {
  "use strict";

  var U = {};

  /* ---------- Moeda / Números ---------- */
  U.formatBRL = function (value) {
    var n = Number(value || 0);
    try {
      return n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (e) {
      return "R$ " + n.toFixed(2).replace(".", ",");
    }
  };

  U.parseBRL = function (str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    return Number(String(str).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(,|$))/g, "").replace(",", ".")) || 0;
  };

  U.round2 = function (n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  };

  U.clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };

  U.randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  U.weighted = function (items) {
    // items = [{v, w}]
    var sum = 0;
    for (var i = 0; i < items.length; i++) sum += items[i].w;
    var r = Math.random() * sum;
    for (var j = 0; j < items.length; j++) {
      r -= items[j].w;
      if (r <= 0) return items[j].v;
    }
    return items[items.length - 1].v;
  };

  /* ---------- Datas ---------- */
  U.now = function () { return Date.now(); };
  U.today = function () {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  U.fmtDateTime = function (ts) {
    var d = new Date(ts);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };
  U.fmtTime = function (ts) {
    var d = new Date(ts);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  /* ---------- IDs ---------- */
  U.uid = function (prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  };

  /* ---------- Sanitização ---------- */
  U.escapeHtml = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  U.slug = function (s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  /* ---------- Validação ---------- */
  U.validateUsername = function (u) {
    if (!u) return "Informe um usuário.";
    if (u.length < 3) return "Usuário precisa de ao menos 3 caracteres.";
    if (u.length > 24) return "Usuário muito longo (máx 24).";
    if (!/^[a-zA-Z0-9_.-]+$/.test(u)) return "Use apenas letras, números, . _ -";
    return null;
  };
  U.validatePassword = function (p) {
    if (!p) return "Informe uma senha.";
    if (p.length < 4) return "Senha precisa de ao menos 4 caracteres.";
    if (p.length > 64) return "Senha muito longa.";
    return null;
  };
  U.validateEmail = function (e) {
    if (!e) return null; // opcional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "E-mail inválido.";
    return null;
  };
  U.validateAmount = function (a, min, max) {
    var n = U.parseBRL(a);
    if (!(n > 0)) return "Informe um valor válido.";
    if (min != null && n < min) return "Valor mínimo: " + U.formatBRL(min);
    if (max != null && n > max) return "Valor máximo: " + U.formatBRL(max);
    return null;
  };

  /* ---------- Hash (SHA-256) ---------- */
  U.sha256 = async function (text) {
    try {
      var enc = new TextEncoder().encode(String(text));
      var buf = await crypto.subtle.digest("SHA-256", enc);
      var arr = Array.from(new Uint8Array(buf));
      return arr.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    } catch (e) {
      // Fallback simples (não criptograficamente seguro)
      var h = 0, s = String(text);
      for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return "fallback_" + Math.abs(h).toString(16);
    }
  };

  /* ---------- DOM helpers ---------- */
  U.qs = function (sel, root) { return (root || document).querySelector(sel); };
  U.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  U.el = function (tag, opts) {
    var e = document.createElement(tag);
    if (!opts) return e;
    if (opts.cls) e.className = opts.cls;
    if (opts.text != null) e.textContent = opts.text;
    if (opts.html != null) e.innerHTML = opts.html;
    if (opts.attrs) for (var k in opts.attrs) e.setAttribute(k, opts.attrs[k]);
    if (opts.style) for (var s in opts.style) e.style[s] = opts.style[s];
    if (opts.on) for (var ev in opts.on) e.addEventListener(ev, opts.on[ev]);
    if (opts.children) opts.children.forEach(function (c) { e.appendChild(c); });
    return e;
  };
  U.on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };

  /* ---------- Toast ---------- */
  function ensureToastWrap() {
    var w = document.querySelector(".toast-wrap");
    if (!w) {
      w = document.createElement("div");
      w.className = "toast-wrap";
      document.body.appendChild(w);
    }
    return w;
  }
  U.toast = function (msg, kind, duration) {
    var wrap = ensureToastWrap();
    var t = document.createElement("div");
    t.className = "toast " + (kind || "info");
    t.textContent = String(msg || "");
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.animation = "fadeOut .25s forwards";
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, duration || 2600);
  };

  /* ---------- Modal ---------- */
  U.modal = function (opts) {
    opts = opts || {};
    var bd = document.createElement("div");
    bd.className = "modal-backdrop" + (opts.centered ? " center" : "");
    var m = document.createElement("div");
    m.className = "modal" + (opts.centered ? " centered" : "");
    if (opts.title || opts.closable !== false) {
      var h = document.createElement("div");
      h.className = "modal-header";
      var ht = document.createElement("h3");
      ht.textContent = opts.title || "";
      h.appendChild(ht);
      if (opts.closable !== false) {
        var c = document.createElement("button");
        c.className = "modal-close";
        c.innerHTML = "&times;";
        c.addEventListener("click", close);
        h.appendChild(c);
      }
      m.appendChild(h);
    }
    var body = document.createElement("div");
    if (typeof opts.content === "string") body.innerHTML = opts.content;
    else if (opts.content) body.appendChild(opts.content);
    m.appendChild(body);

    if (opts.actions && opts.actions.length) {
      var ab = document.createElement("div");
      ab.className = "row mt-16";
      ab.style.gap = "8px";
      opts.actions.forEach(function (a) {
        var b = document.createElement("button");
        b.className = "btn " + (a.kind || "primary") + " full";
        b.textContent = a.label || "OK";
        b.addEventListener("click", function () {
          try { a.onClick && a.onClick(close); } catch (e) { console.error(e); }
          if (a.auto !== false) close();
        });
        ab.appendChild(b);
      });
      m.appendChild(ab);
    }

    bd.appendChild(m);
    bd.addEventListener("click", function (e) { if (e.target === bd && opts.backdropClose !== false) close(); });
    document.body.appendChild(bd);

    function close() {
      bd.style.animation = "fadeOut .18s forwards";
      setTimeout(function () { if (bd.parentNode) bd.parentNode.removeChild(bd); }, 200);
    }
    return { close: close, body: body, root: bd };
  };

  U.confirm = function (msg, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      U.modal({
        title: opts.title || "Confirmação",
        centered: true,
        content: '<p style="color:var(--text-dim)">' + U.escapeHtml(msg) + "</p>",
        actions: [
          { label: opts.no || "Cancelar", kind: "secondary", onClick: function () { resolve(false); } },
          { label: opts.yes || "Confirmar", kind: "primary", onClick: function () { resolve(true); } }
        ],
        backdropClose: false,
      });
    });
  };

  U.prompt = function (msg, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var input = document.createElement("input");
      input.type = opts.type || "text";
      input.value = opts.value || "";
      input.placeholder = opts.placeholder || "";
      var body = document.createElement("div");
      if (msg) {
        var p = document.createElement("p");
        p.style.color = "var(--text-dim)";
        p.style.marginBottom = "10px";
        p.textContent = msg;
        body.appendChild(p);
      }
      body.appendChild(input);
      var m = U.modal({
        title: opts.title || "Informação",
        centered: true,
        content: body,
        actions: [
          { label: "Cancelar", kind: "secondary", onClick: function () { resolve(null); } },
          { label: opts.okLabel || "OK", kind: "primary", onClick: function () { resolve(input.value); } }
        ],
        backdropClose: false,
      });
      setTimeout(function () { input.focus(); }, 50);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { resolve(input.value); m.close(); }
      });
    });
  };

  /* ---------- Sons (Web Audio API) ---------- */
  var actx = null;
  function getACtx() {
    if (actx) return actx;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    return actx;
  }
  U.sound = {
    enabled: true,
    setEnabled: function (b) { U.sound.enabled = !!b; },
    beep: function (freq, dur, type, vol) {
      if (!U.sound.enabled) return;
      var ctx = getACtx(); if (!ctx) return;
      try {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || "sine";
        o.frequency.value = freq || 600;
        g.gain.value = vol != null ? vol : 0.08;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (dur || 0.15));
        o.stop(ctx.currentTime + (dur || 0.15) + 0.02);
      } catch (e) { /* ignore */ }
    },
    click: function () { U.sound.beep(520, 0.05, "square", 0.05); },
    win: function () {
      if (!U.sound.enabled) return;
      U.sound.beep(660, 0.1, "triangle", 0.08);
      setTimeout(function () { U.sound.beep(880, 0.12, "triangle", 0.08); }, 110);
      setTimeout(function () { U.sound.beep(990, 0.18, "triangle", 0.08); }, 230);
    },
    lose: function () { U.sound.beep(220, 0.2, "sawtooth", 0.06); },
    spin: function () { U.sound.beep(420, 0.08, "square", 0.04); },
    coin: function () { U.sound.beep(1100, 0.06, "triangle", 0.05); },
  };

  /* ---------- Coin shower ---------- */
  U.coinShower = function (count) {
    var n = count || 18;
    var wrap = document.createElement("div");
    wrap.className = "coin-shower";
    for (var i = 0; i < n; i++) {
      var c = document.createElement("div");
      c.className = "coin";
      c.textContent = "🪙";
      c.style.left = Math.random() * 100 + "vw";
      c.style.animationDelay = (Math.random() * 0.6) + "s";
      c.style.animationDuration = (1.3 + Math.random() * 1.2) + "s";
      c.style.fontSize = (20 + Math.random() * 20) + "px";
      wrap.appendChild(c);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 2600);
  };

  /* ---------- Anti-F12 (soft) ---------- */
  U.installAntiDevtools = function () {
    // Desabilitar atalhos comuns
    document.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].indexOf(k) !== -1) || (e.ctrlKey && k === "u")) {
        e.preventDefault();
        U.toast("Atalho bloqueado.", "warn", 1600);
        return false;
      }
    });
    // Desabilitar menu de contexto
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  };

  /* ---------- Navegação ---------- */
  U.go = function (url) { window.location.href = url; };
  U.goRoot = function (url) {
    var base = location.pathname.indexOf("/pages/") !== -1 ? "../" : "";
    window.location.href = base + url;
  };

  /* ---------- Debounce ---------- */
  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 250);
    };
  };

  /* ---------- Avatar letter ---------- */
  U.avatarFor = function (name) {
    var s = String(name || "?").trim();
    return s.charAt(0).toUpperCase();
  };

  /* ---------- Copy ---------- */
  U.copy = function (text) {
    try {
      navigator.clipboard.writeText(text);
      U.toast("Copiado!", "success", 1400);
    } catch (e) {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); U.toast("Copiado!", "success", 1400); } catch (_) {}
      document.body.removeChild(ta);
    }
  };

  global.U = U;
  global.Utils = U;
})(window);
