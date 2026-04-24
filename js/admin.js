/* =========================================================
   6726.Bet — admin.js
   Helpers do painel administrativo.
   ========================================================= */
(function (global) {
  "use strict";

  var Admin = {};

  Admin.requireAdmin = function () { return Auth.requireAdmin(); };

  Admin.renderKpis = function (container) {
    var eco = DB.getEconomy();
    container.innerHTML = "";
    var kpis = [
      { label: "Usuários", value: eco.userCount, kind: "cyan" },
      { label: "Saldo total", value: U.formatBRL(eco.totalBalance), kind: "gold" },
      { label: "Depositado", value: U.formatBRL(eco.totalDeposit), kind: "green" },
      { label: "Sacado", value: U.formatBRL(eco.totalWithdraw), kind: "red" },
      { label: "Apostado", value: U.formatBRL(eco.totalBet), kind: "cyan" },
      { label: "Pago (vitórias)", value: U.formatBRL(eco.totalWin), kind: "gold" },
      { label: "Bônus concedido", value: U.formatBRL(eco.totalBonus), kind: "gold" },
      { label: "Resultado da casa", value: U.formatBRL(eco.houseResult), kind: eco.houseResult >= 0 ? "green" : "red" },
    ];
    kpis.forEach(function (k) {
      var d = U.el("div", {
        cls: "kpi " + k.kind,
        html: '<div class="k-l">' + k.label + '</div><div class="k-v">' + k.value + '</div>'
      });
      container.appendChild(d);
    });
  };

  Admin.renderUsers = function (container, filter) {
    var users = DB.listUsers();
    if (filter) {
      var q = filter.toLowerCase();
      users = users.filter(function (u) {
        return u.username.indexOf(q) !== -1 || (u.nickname || "").toLowerCase().indexOf(q) !== -1;
      });
    }
    container.innerHTML = "";
    var table = document.createElement("table");
    table.className = "admin-table";
    table.innerHTML =
      '<thead><tr>' +
      '<th>Usuário</th><th>Saldo</th><th>Apostado</th><th>Ganho</th><th>VIP</th><th>Modo Vitória</th><th>Ações</th>' +
      '</tr></thead><tbody></tbody>';
    var tb = table.querySelector("tbody");
    if (!users.length) {
      tb.innerHTML = '<tr><td colspan="7" class="muted center">Nenhum usuário.</td></tr>';
    } else {
      users.forEach(function (u) {
        var wm = DB.getWinningMode(u.username);
        var wmLabel = wm === "always" ? "Sempre" : wm === "never" ? "Nunca" : wm && wm.boost ? ("Boost " + Math.round(wm.boost * 100) + "%") : "Padrão";
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td><strong>' + U.escapeHtml(u.username) + '</strong>' + (u.banned ? ' <span class="badge red">BANIDO</span>' : '') + '</td>' +
          '<td><span class="gold bold">' + U.formatBRL(u.balance) + '</span></td>' +
          '<td>' + U.formatBRL(u.total_bet || 0) + '</td>' +
          '<td>' + U.formatBRL(u.total_won || 0) + '</td>' +
          '<td>' + (u.vip_points || 0) + '</td>' +
          '<td>' + wmLabel + '</td>' +
          '<td><div class="actions">' +
          '<button class="btn small secondary" data-act="edit-bal" data-u="' + u.username + '">Saldo</button>' +
          '<button class="btn small secondary" data-act="edit-pwd" data-u="' + u.username + '">Senha</button>' +
          '<button class="btn small secondary" data-act="wm" data-u="' + u.username + '">Vitória</button>' +
          '<button class="btn small ' + (u.banned ? 'primary' : 'danger') + '" data-act="ban" data-u="' + u.username + '">' + (u.banned ? "Desbanir" : "Banir") + '</button>' +
          '<button class="btn small danger" data-act="del" data-u="' + u.username + '">Excluir</button>' +
          '</div></td>';
        tb.appendChild(tr);
      });
    }
    container.appendChild(table);

    container.querySelectorAll("button[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-act");
        var un = b.getAttribute("data-u");
        Admin.handleUserAction(act, un, function () { Admin.renderUsers(container, filter); });
      });
    });
  };

  Admin.handleUserAction = async function (act, username, done) {
    if (act === "edit-bal") {
      var u = DB.getUser(username);
      var v = await U.prompt("Novo saldo (R$):", { title: "Saldo — " + username, value: String(u.balance) });
      if (v == null) return;
      var n = U.parseBRL(v);
      if (!(n >= 0)) { U.toast("Valor inválido.", "error"); return; }
      var delta = n - u.balance;
      DB.setBalance(username, n);
      DB.addTransaction({ username: username, type: delta > 0 ? "deposit" : "withdraw", amount: Math.abs(delta), label: "Ajuste de saldo (admin)" });
      DB.addNotification(username, { title: "Saldo atualizado", body: "Seu saldo foi ajustado pelo admin.", kind: "info" });
      U.toast("Saldo atualizado.", "success");
      done && done();
    } else if (act === "edit-pwd") {
      var np = await U.prompt("Nova senha (mín 4):", { title: "Senha — " + username });
      if (np == null) return;
      var r = await Auth.changePassword(username, np);
      if (!r.ok) U.toast(r.error, "error");
      else { U.toast("Senha alterada.", "success"); DB.addNotification(username, { title: "Senha alterada", body: "Sua senha foi atualizada pelo admin.", kind: "warn" }); }
      done && done();
    } else if (act === "wm") {
      var opts = "Escolha: 1 = Padrão, 2 = Sempre vitória, 3 = Nunca vitória, 4 = Boost +30%";
      var v = await U.prompt(opts, { title: "Modo Vitória — " + username });
      if (v == null) return;
      if (v === "1") DB.setWinningMode(username, null);
      else if (v === "2") DB.setWinningMode(username, "always");
      else if (v === "3") DB.setWinningMode(username, "never");
      else if (v === "4") DB.setWinningMode(username, { boost: 0.3 });
      else { U.toast("Opção inválida.", "error"); return; }
      U.toast("Modo atualizado.", "success");
      done && done();
    } else if (act === "ban") {
      var u2 = DB.getUser(username);
      u2.banned = !u2.banned;
      DB.saveUser(u2);
      U.toast(u2.banned ? "Usuário banido." : "Desbanido.", "warn");
      done && done();
    } else if (act === "del") {
      var ok = await U.confirm("Excluir usuário " + username + "? Isto é irreversível.");
      if (!ok) return;
      DB.deleteUser(username);
      U.toast("Usuário excluído.", "warn");
      done && done();
    }
  };

  Admin.renderConfig = function (container) {
    var cfg = DB.getConfig();
    container.innerHTML = "";
    function row(label, html) {
      var r = U.el("div", { cls: "row space mt-8", style: { padding: "8px 0", borderBottom: "1px solid var(--border-soft)" } });
      r.innerHTML = '<div><div class="bold">' + label + '</div></div><div>' + html + '</div>';
      return r;
    }
    var toggles = [
      { k: "bonuses_enabled", l: "Bônus habilitados" },
      { k: "events_enabled", l: "Eventos habilitados" },
      { k: "vip_enabled", l: "VIP habilitado" },
    ];
    toggles.forEach(function (t) {
      var div = row(t.l, '<button class="btn small ' + (cfg[t.k] ? "primary" : "secondary") + '" data-tog="' + t.k + '">' + (cfg[t.k] ? "LIGADO" : "DESLIGADO") + '</button>');
      container.appendChild(div);
    });
    var fields = [
      { k: "signup_bonus", l: "Bônus de cadastro (R$)", type: "number" },
      { k: "daily_bonus", l: "Bônus diário (R$)", type: "number" },
      { k: "min_deposit", l: "Depósito mínimo (R$)", type: "number" },
      { k: "min_withdraw", l: "Saque mínimo (R$)", type: "number" },
      { k: "max_withdraw", l: "Saque máximo (R$)", type: "number" },
      { k: "pix_key", l: "Chave PIX (depósitos)", type: "text" },
      { k: "global_rtp", l: "RTP global (0–1)", type: "number" },
    ];
    fields.forEach(function (f) {
      var div = row(f.l, '<input type="' + f.type + '" value="' + U.escapeHtml(String(cfg[f.k])) + '" data-cfg="' + f.k + '" style="max-width:180px">');
      container.appendChild(div);
    });

    container.querySelectorAll("[data-tog]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-tog");
        var c = DB.getConfig();
        c[key] = !c[key];
        DB.saveConfig(c);
        Admin.renderConfig(container);
      });
    });
    container.querySelectorAll("[data-cfg]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var key = inp.getAttribute("data-cfg");
        var c = DB.getConfig();
        c[key] = inp.type === "number" ? Number(inp.value) : inp.value;
        DB.saveConfig(c);
        U.toast("Configuração salva.", "success", 1200);
      });
    });
  };

  Admin.renderTransactions = function (container, limit) {
    var txs = DB.getTransactions().slice(0, limit || 50);
    container.innerHTML = "";
    if (!txs.length) { container.innerHTML = '<div class="muted center">Sem transações.</div>'; return; }
    var t = document.createElement("table");
    t.className = "admin-table";
    t.innerHTML = "<thead><tr><th>Quando</th><th>Usuário</th><th>Tipo</th><th>Valor</th><th>Descrição</th></tr></thead><tbody></tbody>";
    var tb = t.querySelector("tbody");
    txs.forEach(function (x) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td>' + U.fmtDateTime(x.created_at) + '</td>' +
        '<td>' + U.escapeHtml(x.username) + '</td>' +
        '<td><span class="badge">' + x.type + '</span></td>' +
        '<td><strong>' + U.formatBRL(x.amount) + '</strong></td>' +
        '<td>' + U.escapeHtml(x.label || "") + '</td>';
      tb.appendChild(tr);
    });
    container.appendChild(t);
  };

  global.Admin = Admin;
})(window);
