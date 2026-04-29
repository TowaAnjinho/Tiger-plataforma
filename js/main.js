/* =========================================================
   6726.Bet — main.js
   Inicialização global, header, bottom nav, anti-devtools.
   ========================================================= */
(function (global) {
  "use strict";

  var App = {};

  function pathBase() {
    return location.pathname.indexOf("/pages/") !== -1 ? "../" : "";
  }

  App.renderHeader = function (opts) {
    opts = opts || {};
    var existing = document.querySelector(".app-header");
    if (existing) existing.remove();

    var user = Auth.currentUser();
    var cfg = DB.getConfig();
    var base = pathBase();

    var header = document.createElement("header");
    header.className = "app-header anim-fade";
    var balHtml = "";
    if (user && opts.showBalance !== false) {
      balHtml =
        '<div class="header-balance" id="hdr-balance">' +
        '  <div>' +
        '    <div class="bal-label">Saldo</div>' +
        '    <div class="bal-value" id="hdr-balance-value">' + U.formatBRL(user.balance) + '</div>' +
        '  </div>' +
        '  <div class="bal-add" title="Depositar">+</div>' +
        '</div>';
    } else if (opts.showLogout) {
      balHtml = '<button class="btn small secondary" id="hdr-logout">Sair</button>';
    }

    header.innerHTML =
      '<div class="header-inner">' +
      '  <div class="brand" id="hdr-brand">' +
      '    <div class="brand-name">6726.Bet</div>' +
      '    <div class="brand-sub">Plataforma oficial — Anthony Ramos : bernardino</div>' +
      '  </div>' +
      balHtml +
      '</div>';

    document.body.prepend(header);

    var brand = document.getElementById("hdr-brand");
    if (brand) brand.addEventListener("click", function () {
      if (Auth.isAdmin()) location.href = base + "pages/admin.html";
      else if (user) location.href = base + "pages/dashboard.html";
      else location.href = base + "index.html";
    });

    var bal = document.getElementById("hdr-balance");
    if (bal) bal.addEventListener("click", function () {
      location.href = base + "pages/deposito.html";
    });

    var lo = document.getElementById("hdr-logout");
    if (lo) lo.addEventListener("click", function () {
      Auth.logout();
      location.href = base + "pages/login.html";
    });
  };

  App.updateHeaderBalance = function () {
    var u = Auth.currentUser(); if (!u) return;
    var el = document.getElementById("hdr-balance-value");
    if (el) el.textContent = U.formatBRL(u.balance);
  };

  App.renderBottomNav = function (active) {
    var existing = document.querySelector(".bottom-nav");
    if (existing) existing.remove();
    var base = pathBase();
    var assetsBase = location.pathname.indexOf("/pages/") !== -1 ? "../assets/images/icons/" : "assets/images/icons/";
    var items = [
      { key: "inicio", label: "Início", ico: "home", href: base + "pages/dashboard.html" },
      { key: "bonus", label: "Bônus", ico: "gift", href: base + "pages/vip.html#bonus" },
      { key: "vip", label: "VIP", ico: "crown", href: base + "pages/vip.html" },
      { key: "perfil", label: "Perfil", ico: "user", href: base + "pages/perfil.html" }
    ];
    var nav = document.createElement("nav");
    nav.className = "bottom-nav";
    var inner = document.createElement("div");
    inner.className = "nav-inner";
    items.forEach(function (it) {
      var b = document.createElement("a");
      b.className = "nav-item" + (active === it.key ? " active" : "");
      b.href = it.href;
      b.innerHTML = '<img src="' + assetsBase + it.ico + '.svg" alt=""/><div>' + it.label + '</div>';
      inner.appendChild(b);
    });
    nav.appendChild(inner);
    document.body.appendChild(nav);
  };

  App.requireAuth = function () {
    var u = Auth.requireUser();
    return u;
  };

  App.boot = function (opts) {
    opts = opts || {};
    DB.init();

    if (opts.installSecurity !== false) {
      try { U.installAntiDevtools(); } catch (e) {}
    }

    // Sincronização Supabase (não bloqueia a renderização — hidrata em background).
    App.syncPromise = (async function () {
      if (global.SB) {
        try {
          await SB.init();
          if (global.Sync) {
            Sync.install();
            await Sync.hydrate();
            Sync.subscribe(function (e) {
              // Dispara evento global para telas se re-renderizarem sozinhas
              try { window.dispatchEvent(new CustomEvent("6726bet:sync", { detail: e })); } catch (_) {}
            });
          }
        } catch (e) { console.warn("[App] sync init:", e); }
      }
    })();

    if (opts.requireAuth) {
      var u = Auth.requireUser();
      if (!u) return null;
    }
    if (opts.requireAdmin) {
      var a = Auth.requireAdmin();
      if (!a) return null;
    }

    if (opts.header !== false) App.renderHeader({ showBalance: opts.showBalance, showLogout: opts.showLogout });
    if (opts.nav) App.renderBottomNav(opts.nav);

    // Daily check for bonus
    try {
      var user = Auth.currentUser();
      if (user) {
        var notifCount = DB.unreadCount(user.username, "user");
        if (notifCount > 0 && opts.toastUnread !== false) {
          U.toast(notifCount + " nova(s) mensagem(ns) do suporte.", "info", 2200);
        }
      }
    } catch (e) {}

    return Auth.currentUser();
  };

  /* ---------- Generic leaderboard builder ---------- */
  App.renderLeaderboard = function (container, limit) {
    if (!container) return;
    var users = DB.listUsers().slice().sort(function (a, b) {
      return (b.total_won || 0) - (a.total_won || 0);
    }).slice(0, limit || 10);
    container.innerHTML = "";
    if (!users.length) {
      container.innerHTML = '<div class="muted small center">Sem jogadores ainda.</div>';
      return;
    }
    users.forEach(function (u, i) {
      var d = document.createElement("div");
      d.className = "lb-item" + (i < 3 ? " top-" + (i + 1) : "");
      d.innerHTML =
        '<div class="rk">#' + (i + 1) + '</div>' +
        '<div class="u">' + U.escapeHtml(u.nickname || u.username) + '</div>' +
        '<div class="v">' + U.formatBRL(u.total_won || 0) + '</div>';
      container.appendChild(d);
    });
  };

  global.App = App;
})(window);
