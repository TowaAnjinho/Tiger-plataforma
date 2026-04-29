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

  Admin.renderUsers = function (container, filter, sort) {
    var users = DB.listUsers();
    if (filter) {
      var q = filter.toLowerCase();
      users = users.filter(function (u) {
        return u.username.indexOf(q) !== -1 || (u.nickname || "").toLowerCase().indexOf(q) !== -1;
      });
    }
    var sorters = {
      created_desc: function (a, b) { return (b.created_at || 0) - (a.created_at || 0); },
      created_asc:  function (a, b) { return (a.created_at || 0) - (b.created_at || 0); },
      balance_desc: function (a, b) { return Number(b.balance || 0) - Number(a.balance || 0); },
      balance_asc:  function (a, b) { return Number(a.balance || 0) - Number(b.balance || 0); },
      name_asc:     function (a, b) { return String(a.username).localeCompare(String(b.username)); },
      name_desc:    function (a, b) { return String(b.username).localeCompare(String(a.username)); },
      won_desc:     function (a, b) { return Number(b.total_won || 0) - Number(a.total_won || 0); },
      bet_desc:     function (a, b) { return Number(b.total_bet || 0) - Number(a.total_bet || 0); }
    };
    users.sort(sorters[sort] || sorters.created_desc);

    container.innerHTML = "";
    var table = document.createElement("table");
    table.className = "admin-table";
    table.innerHTML =
      '<thead><tr>' +
      '<th>#</th><th>Usuário</th><th>Saldo</th><th>Apostado</th><th>Ganho</th><th>VIP</th><th>Modo Vitória</th><th>Criado</th><th>Ações</th>' +
      '</tr></thead><tbody></tbody>';
    var tb = table.querySelector("tbody");
    if (!users.length) {
      tb.innerHTML = '<tr><td colspan="9" class="muted center">Nenhum usuário cadastrado. Use "+ Novo usuário" ou "Criar usuários de demonstração".</td></tr>';
    } else {
      users.forEach(function (u, idx) {
        var wm = DB.getWinningMode(u.username);
        var wmLabel = wm === "always" ? "Sempre" : wm === "never" ? "Nunca" : wm && wm.boost ? ("Boost " + Math.round(wm.boost * 100) + "%") : "Padrão";
        var tr = document.createElement("tr");
        var created = u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—";
        tr.innerHTML =
          '<td class="muted">' + (idx + 1) + '</td>' +
          '<td><strong>' + U.escapeHtml(u.username) + '</strong>' + (u.banned ? ' <span class="badge red">BANIDO</span>' : '') + '</td>' +
          '<td><span class="gold bold">' + U.formatBRL(u.balance) + '</span></td>' +
          '<td>' + U.formatBRL(u.total_bet || 0) + '</td>' +
          '<td>' + U.formatBRL(u.total_won || 0) + '</td>' +
          '<td>' + (u.vip_points || 0) + '</td>' +
          '<td>' + wmLabel + '</td>' +
          '<td class="small muted">' + created + '</td>' +
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
        Admin.handleUserAction(act, un, function () { Admin.renderUsers(container, filter, sort); });
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

  // ---------- Import / Seed / Push (cloud) ----------
  Admin.mergeImport = function (data) {
    if (!data || typeof data !== "object") return;
    // merge users
    if (data.USERS || data["6726bet.users"]) {
      var usersIn = data.USERS || data["6726bet.users"] || {};
      var cur = DB.getAllUsers();
      for (var k in usersIn) {
        cur[k] = usersIn[k];
      }
      localStorage.setItem("6726bet.users", JSON.stringify(cur));
    }
    if (data.TRANSACTIONS || data["6726bet.transactions"]) {
      var txIn = data.TRANSACTIONS || data["6726bet.transactions"] || [];
      var curTx = DB.getTransactions();
      var seen = {};
      curTx.forEach(function (t) { seen[t.id] = true; });
      txIn.forEach(function (t) { if (!seen[t.id]) curTx.push(t); });
      curTx.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
      if (curTx.length > 5000) curTx.length = 5000;
      localStorage.setItem("6726bet.transactions", JSON.stringify(curTx));
    }
    if (data.CHATS || data["6726bet.chats"]) {
      var chatsIn = data.CHATS || data["6726bet.chats"] || {};
      var curC = DB.getChats();
      for (var tid in chatsIn) {
        if (!curC[tid]) curC[tid] = chatsIn[tid];
        else {
          // merge messages
          var byId = {};
          curC[tid].messages.forEach(function (m) { byId[m.id] = true; });
          chatsIn[tid].messages.forEach(function (m) {
            if (!byId[m.id]) curC[tid].messages.push(m);
          });
          curC[tid].messages.sort(function (a, b) { return a.ts - b.ts; });
          curC[tid].last_ts = Math.max(curC[tid].last_ts || 0, chatsIn[tid].last_ts || 0);
        }
      }
      localStorage.setItem("6726bet.chats", JSON.stringify(curC));
    }
  };

  Admin.seedDemoUsers = async function () {
    var demos = [
      { username: "carlos",   balance: 125.50, won: 210,  bet: 180 },
      { username: "ana",      balance: 58.20,  won: 75,   bet: 120 },
      { username: "bruno",    balance: 340.00, won: 540,  bet: 300 },
      { username: "diana",    balance: 12.80,  won: 30,   bet: 65 },
      { username: "eduardo",  balance: 900.00, won: 1200, bet: 520 },
      { username: "fernanda", balance: 75.00,  won: 95,   bet: 70 }
    ];
    for (var i = 0; i < demos.length; i++) {
      var d = demos[i];
      if (DB.getUser(d.username)) continue;
      var hash = "";
      try { hash = await Auth.hashPassword("demo1234"); } catch (e) { hash = "PLAIN:demo1234"; }
      DB.createUser({
        username: d.username, nickname: d.username,
        email: d.username + "@demo.6726bet",
        password_hash: hash, balance: d.balance
      });
      var u = DB.getUser(d.username);
      u.total_won = d.won; u.total_bet = d.bet; u.vip_points = Math.floor(d.won * 0.2);
      DB.saveUser(u);
    }
  };

  Admin.pushLocalToCloud = async function () {
    if (!(global.SB && SB.enabled)) return { users: 0, txs: 0, chats: 0 };
    var c = SB.client;
    var n = { users: 0, txs: 0, chats: 0 };
    // users
    var users = DB.listUsers().map(function (u) {
      return {
        username: u.username, nickname: u.nickname || null, email: u.email || null,
        password_hash: u.password_hash || "",
        balance: Number(u.balance || 0),
        total_bet: Number(u.total_bet || 0), total_won: Number(u.total_won || 0),
        total_deposited: Number(u.total_deposited || 0), total_withdrawn: Number(u.total_withdrawn || 0),
        vip_points: Number(u.vip_points || 0),
        banned: !!u.banned, bonus_claimed_signup: !!u.bonus_claimed_signup,
        last_login: u.last_login ? new Date(u.last_login).toISOString() : null,
        created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
      };
    });
    if (users.length) {
      var r = await c.from("users").upsert(users);
      if (!r.error) n.users = users.length;
    }
    // chats + messages
    var chats = DB.getChats();
    for (var tid in chats) {
      var t = chats[tid];
      await c.from("chats").upsert({
        id: t.id, username: t.username, type: t.type,
        last_ts: new Date(t.last_ts).toISOString()
      });
      n.chats++;
      if (t.messages && t.messages.length) {
        var msgs = t.messages.map(function (m) {
          return {
            client_id: m.id,
            thread_id: t.id, from_role: m.from, text: m.text,
            read_user: !!m.read_user, read_admin: !!m.read_admin,
            created_at: new Date(m.ts).toISOString()
          };
        });
        // upsert por client_id evita duplicação ao re-executar o push
        await c.from("chat_messages").upsert(msgs, { onConflict: "client_id" });
      }
    }
    // transactions — upsert por client_id evita duplicação
    var txs = DB.getTransactions().slice(0, 1000).map(function (t) {
      return {
        client_id: t.id,
        username: t.username, type: t.type, amount: Number(t.amount),
        label: t.label || null, meta: t.meta || null,
        created_at: new Date(t.created_at || Date.now()).toISOString()
      };
    });
    if (txs.length) {
      var rx = await c.from("transactions").upsert(txs, { onConflict: "client_id" });
      if (!rx.error) n.txs = txs.length;
    }
    // config
    var cfg = DB.getConfig();
    await c.from("config").upsert({ id: 1, data: cfg, updated_at: new Date().toISOString() });
    return n;
  };

  global.Admin = Admin;
})(window);
