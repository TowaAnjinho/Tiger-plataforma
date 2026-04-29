/* =========================================================
   6726.Bet — sync.js
   Camada de sincronização Supabase ↔ LocalStorage.
   Mantém a API síncrona do DB, mas:
    - na inicialização, puxa dados do Supabase para o cache local;
    - em cada write, espelha pro Supabase em background;
    - usa Realtime para atualizar o cache quando outros clientes mudam.
   Se SB.enabled === false, tudo continua funcionando só com LocalStorage.
   ========================================================= */
(function (global) {
  "use strict";

  var Sync = { hydrated: false, listeners: [] };

  function log() {
    if (global.DEBUG_SYNC) console.log.apply(console, ["[Sync]"].concat([].slice.call(arguments)));
  }

  // ---- Serialização user ----
  function userToRow(u) {
    return {
      username: u.username,
      nickname: u.nickname || null,
      email: u.email || null,
      password_hash: u.password_hash || "",
      balance: Number(u.balance || 0),
      total_bet: Number(u.total_bet || 0),
      total_won: Number(u.total_won || 0),
      total_deposited: Number(u.total_deposited || 0),
      total_withdrawn: Number(u.total_withdrawn || 0),
      vip_points: Number(u.vip_points || 0),
      banned: !!u.banned,
      bonus_claimed_signup: !!u.bonus_claimed_signup,
      last_login: u.last_login ? new Date(u.last_login).toISOString() : null,
      created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
    };
  }
  function rowToUser(r) {
    return {
      username: r.username,
      nickname: r.nickname || "",
      email: r.email || "",
      password_hash: r.password_hash || "",
      balance: Number(r.balance || 0),
      total_bet: Number(r.total_bet || 0),
      total_won: Number(r.total_won || 0),
      total_deposited: Number(r.total_deposited || 0),
      total_withdrawn: Number(r.total_withdrawn || 0),
      vip_points: Number(r.vip_points || 0),
      banned: !!r.banned,
      bonus_claimed_signup: !!r.bonus_claimed_signup,
      last_login: r.last_login ? new Date(r.last_login).getTime() : null,
      created_at: r.created_at ? new Date(r.created_at).getTime() : Date.now()
    };
  }

  // ---- Hydrate (puxa do Supabase pro cache local) ----
  Sync.hydrate = async function () {
    if (!global.SB) return;
    if (!SB.ready) await SB.init();
    if (!SB.enabled) { Sync.hydrated = true; return; }
    var c = SB.client;
    try {
      // users
      var ur = await c.from("users").select("*");
      if (!ur.error && ur.data) {
        var obj = {};
        ur.data.forEach(function (r) { obj[r.username] = rowToUser(r); });
        localStorage.setItem("6726bet.users", JSON.stringify(obj));
      }
      // transactions (últimas 500 para cache)
      var tr = await c.from("transactions").select("*").order("created_at", { ascending: false }).limit(500);
      if (!tr.error && tr.data) {
        var txs = tr.data.map(function (r) {
          return {
            id: r.id, username: r.username, type: r.type,
            amount: Number(r.amount), label: r.label,
            meta: r.meta || null,
            created_at: new Date(r.created_at).getTime()
          };
        });
        localStorage.setItem("6726bet.transactions", JSON.stringify(txs));
      }
      // chats + messages (reconstrói estrutura agrupada)
      var cr = await c.from("chats").select("*");
      var mr = await c.from("chat_messages").select("*").order("created_at", { ascending: true });
      if (!cr.error && !mr.error && cr.data && mr.data) {
        var chats = {};
        cr.data.forEach(function (r) {
          chats[r.id] = {
            id: r.id, username: r.username, type: r.type,
            messages: [], last_ts: new Date(r.last_ts).getTime()
          };
        });
        mr.data.forEach(function (m) {
          if (!chats[m.thread_id]) return;
          chats[m.thread_id].messages.push({
            id: m.id, from: m.from_role, text: m.text,
            ts: new Date(m.created_at).getTime(),
            read_user: m.read_user, read_admin: m.read_admin
          });
        });
        localStorage.setItem("6726bet.chats", JSON.stringify(chats));
      }
      // config (linha única)
      var cf = await c.from("config").select("*").eq("id", 1).maybeSingle();
      if (!cf.error && cf.data && cf.data.data) {
        localStorage.setItem("6726bet.config", JSON.stringify(cf.data.data));
      } else if (!cf.error && !cf.data) {
        // semeia config default
        var cfg = JSON.parse(localStorage.getItem("6726bet.config") || "{}");
        await c.from("config").upsert({ id: 1, data: cfg });
      }
      // winning mode
      var wm = await c.from("winning_mode").select("*");
      if (!wm.error && wm.data) {
        var map = {};
        wm.data.forEach(function (r) { if (r.mode != null) map[r.username] = r.mode; });
        localStorage.setItem("6726bet.winning_mode", JSON.stringify(map));
      }
      Sync.hydrated = true;
      log("hidratado", { users: (ur.data || []).length, txs: (tr.data || []).length });
    } catch (e) {
      console.warn("[Sync] hydrate falhou:", e);
    }
  };

  // ---- Patch DB para espelhar writes no Supabase ----
  Sync.install = function () {
    if (!global.DB || Sync.installed) return;
    Sync.installed = true;
    var c = function () { return global.SB && SB.enabled ? SB.client : null; };

    // Outbox serializa todas as escritas remotas. Permite flush() awaitable
    // antes de navegação (login/register) e elimina race entre upsert de user
    // e insert de transaction (FK).
    var chain = Promise.resolve();
    var pending = 0;
    function enqueue(fn, label) {
      pending++;
      chain = chain.then(function () {
        return Promise.resolve().then(fn).catch(function (e) {
          console.warn("[Sync] " + (label || "op") + ":", e && e.message ? e.message : e);
        });
      }).then(function () { pending--; });
      return chain;
    }
    Sync.flush = function () { return chain; };
    Sync.pending = function () { return pending; };

    // Empilha upserts de user num debounce curto pra fundir mutações
    // sequenciais (createUser → claimSignup → adjustBalance) num único upsert.
    var pendingUserUpserts = {};
    var pendingTimer = null;
    function flushUserBatchNow() {
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      var keys = Object.keys(pendingUserUpserts);
      pendingUserUpserts = {};
      if (!keys.length) return Promise.resolve();
      return enqueue(function () {
        var cli = c(); if (!cli) return;
        var rows = keys.map(function (k) {
          var u = DB.getUser(k); return u ? userToRow(u) : null;
        }).filter(Boolean);
        if (!rows.length) return;
        return cli.from("users").upsert(rows).then(function (res) {
          if (res.error) throw new Error("users.upsert: " + res.error.message);
        });
      }, "users.upsert(batch)");
    }
    function queueUserUpsert(username) {
      if (!username) return;
      pendingUserUpserts[username] = true;
      if (pendingTimer) return;
      pendingTimer = setTimeout(flushUserBatchNow, 60);
    }
    Sync.flushUserBatch = flushUserBatchNow;

    var _saveUser = DB.saveUser;
    DB.saveUser = function (u) {
      var r = _saveUser.call(DB, u);
      if (u && u.username) queueUserUpsert(u.username);
      return r;
    };

    var _createUser = DB.createUser;
    DB.createUser = function (u) {
      var r = _createUser.call(DB, u);
      if (r) queueUserUpsert(String(u.username).toLowerCase());
      return r;
    };

    var _deleteUser = DB.deleteUser;
    DB.deleteUser = function (username) {
      var r = _deleteUser.call(DB, username);
      enqueue(function () {
        var cli = c(); if (!cli) return;
        return cli.from("users").delete().eq("username", String(username).toLowerCase());
      }, "users.delete");
      return r;
    };

    var _addTransaction = DB.addTransaction;
    DB.addTransaction = function (tx) {
      var saved = _addTransaction.call(DB, tx);
      // Garante que o user já foi enviado antes do tx (FK)
      flushUserBatchNow();
      if (saved) enqueue(function () {
        var cli = c(); if (!cli) return;
        return cli.from("transactions").upsert({
          client_id: saved.id,
          username: saved.username,
          type: saved.type,
          amount: Number(saved.amount),
          label: saved.label || null,
          meta: saved.meta || null,
          created_at: new Date(saved.created_at || Date.now()).toISOString()
        }, { onConflict: "client_id" }).then(function (res) {
          if (res.error) throw new Error("tx.upsert: " + res.error.message);
        });
      }, "tx.upsert");
      return saved;
    };

    var _getOrCreateThread = DB.getOrCreateThread;
    DB.getOrCreateThread = function (username, type) {
      var t = _getOrCreateThread.call(DB, username, type);
      flushUserBatchNow();
      if (t) enqueue(function () {
        var cli = c(); if (!cli) return;
        return cli.from("chats").upsert({
          id: t.id, username: t.username, type: t.type,
          last_ts: new Date(t.last_ts).toISOString()
        }).then(function (res) {
          if (res.error) throw new Error("chats.upsert: " + res.error.message);
        });
      }, "chats.upsert");
      return t;
    };

    var _postMessage = DB.postMessage;
    DB.postMessage = function (threadId, from, text) {
      var m = _postMessage.call(DB, threadId, from, text);
      if (m) enqueue(function () {
        var cli = c(); if (!cli) return;
        return cli.from("chat_messages").upsert({
          client_id: m.id,
          thread_id: threadId,
          from_role: from,
          text: String(text),
          read_user: m.read_user,
          read_admin: m.read_admin,
          created_at: new Date(m.ts).toISOString()
        }, { onConflict: "client_id" }).then(function (res) {
          if (res.error) throw new Error("msg.upsert: " + res.error.message);
          return cli.from("chats").update({ last_ts: new Date(m.ts).toISOString() }).eq("id", threadId);
        });
      }, "msg.upsert");
      return m;
    };

    var _setWinningMode = DB.setWinningMode;
    DB.setWinningMode = function (username, mode) {
      _setWinningMode.call(DB, username, mode);
      enqueue(function () {
        var cli = c(); if (!cli) return;
        var uname = String(username).toLowerCase();
        if (mode == null) return cli.from("winning_mode").delete().eq("username", uname);
        return cli.from("winning_mode").upsert({ username: uname, mode: mode, updated_at: new Date().toISOString() });
      }, "winning_mode");
    };

    // Patch saveConfig (única função que escreve config no LocalStorage).
    // updateConfig chama saveConfig internamente, então não precisa patchear
    // ambos — evita double-sync.
    var _saveConfig = DB.saveConfig;
    DB.saveConfig = function (cfg) {
      _saveConfig.call(DB, cfg);
      enqueue(function () {
        var cli = c(); if (!cli) return;
        return cli.from("config").upsert({ id: 1, data: cfg, updated_at: new Date().toISOString() });
      }, "config.upsert");
    };

    var _setBalance = DB.setBalance;
    DB.setBalance = function (username, newBalance) {
      var r = _setBalance.call(DB, username, newBalance);
      if (r) queueUserUpsert(String(username).toLowerCase());
      return r;
    };

    var _adjustBalance = DB.adjustBalance;
    DB.adjustBalance = function (username, delta) {
      var r = _adjustBalance.call(DB, username, delta);
      queueUserUpsert(String(username).toLowerCase());
      return r;
    };

    var _addGameHistory = DB.addGameHistory;
    DB.addGameHistory = function (entry) {
      _addGameHistory.call(DB, entry);
      flushUserBatchNow();
      enqueue(function () {
        var cli = c(); if (!cli) return;
        return cli.from("game_history").insert({
          username: entry.username, game_id: entry.game_id || entry.gameId || "unknown",
          bet: Number(entry.bet || 0), win: Number(entry.win || 0),
          reels: entry.reels || null,
          created_at: new Date(entry.ts || Date.now()).toISOString()
        });
      }, "game_history");
    };

    var _addNotification = DB.addNotification;
    DB.addNotification = function (username, n) {
      _addNotification.call(DB, username, n);
      flushUserBatchNow();
      enqueue(function () {
        var cli = c(); if (!cli) return;
        return cli.from("notifications").insert({
          username: String(username).toLowerCase(),
          title: n.title || null, body: n.body || null,
          kind: n.kind || "info", read: false,
          created_at: new Date(n.ts || Date.now()).toISOString()
        });
      }, "notification");
    };
  };

  // ---- Realtime: escuta mudanças remotas e atualiza cache ----
  Sync.subscribe = function (onChange) {
    if (!global.SB || !SB.enabled) return function noop() {};
    var c = SB.client;
    var channel = c.channel("rt-6726bet");

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, function (p) {
        var all = JSON.parse(localStorage.getItem("6726bet.users") || "{}");
        if (p.eventType === "DELETE") {
          delete all[p.old.username];
        } else if (p.new) {
          all[p.new.username] = rowToUser(p.new);
        }
        localStorage.setItem("6726bet.users", JSON.stringify(all));
        if (typeof onChange === "function") onChange({ table: "users", payload: p });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, function (p) {
        var arr = JSON.parse(localStorage.getItem("6726bet.transactions") || "[]");
        var t = p.new;
        arr.unshift({
          id: t.id, username: t.username, type: t.type,
          amount: Number(t.amount), label: t.label,
          meta: t.meta || null,
          created_at: new Date(t.created_at).getTime()
        });
        if (arr.length > 5000) arr.length = 5000;
        localStorage.setItem("6726bet.transactions", JSON.stringify(arr));
        if (typeof onChange === "function") onChange({ table: "transactions", payload: p });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, function (p) {
        var chats = JSON.parse(localStorage.getItem("6726bet.chats") || "{}");
        var t = chats[p.new.thread_id];
        if (t) {
          // evita duplicata
          var exists = t.messages.some(function (m) { return String(m.id) === String(p.new.id); });
          if (!exists) {
            t.messages.push({
              id: p.new.id, from: p.new.from_role, text: p.new.text,
              ts: new Date(p.new.created_at).getTime(),
              read_user: p.new.read_user, read_admin: p.new.read_admin
            });
            t.last_ts = new Date(p.new.created_at).getTime();
            localStorage.setItem("6726bet.chats", JSON.stringify(chats));
          }
        }
        if (typeof onChange === "function") onChange({ table: "chat_messages", payload: p });
      })
      .subscribe();

    return function unsub() { c.removeChannel(channel); };
  };

  global.Sync = Sync;
})(window);
