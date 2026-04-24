/* =========================================================
   6726.Bet — database.js
   Camada de persistência via LocalStorage.
   Simula os arquivos database/users.json, transactions.json e config.json.
   Exposto em window.DB
   ========================================================= */
(function (global) {
  "use strict";

  var KEYS = {
    USERS: "6726bet.users",
    TRANSACTIONS: "6726bet.transactions",
    CONFIG: "6726bet.config",
    SESSION: "6726bet.session",
    CHATS: "6726bet.chats",
    BONUS_CLAIMS: "6726bet.bonus_claims",
    NOTIFICATIONS: "6726bet.notifications",
    GAME_HISTORY: "6726bet.game_history",
    WINNING_MODE: "6726bet.winning_mode",
    INTEGRITY: "6726bet.integrity",
  };

  var DEFAULT_CONFIG = {
    platform_name: "6726.Bet",
    owner: "Anthony Ramos : bernardino",
    currency: "BRL",
    min_deposit: 10,
    min_withdraw: 20,
    max_withdraw: 50000,
    default_balance: 0,
    signup_bonus: 10,
    daily_bonus: 5,
    bonuses_enabled: true,
    events_enabled: true,
    vip_enabled: true,
    global_rtp: 0.92, // 92% base RTP
    admin_username: "admin",
    admin_password_hash: null, // setado no init (sha256 de "6726admin")
    pix_key: "6726@pix.6726bet.com",
    created_at: Date.now(),
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("DB.read falhou para", key, e);
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("DB.write falhou para", key, e);
      return false;
    }
  }

  var DB = {};
  DB.KEYS = KEYS;

  /* ---------- Init ---------- */
  DB.init = function () {
    // Config
    var cfg = read(KEYS.CONFIG, null);
    if (!cfg) {
      cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      write(KEYS.CONFIG, cfg);
    } else {
      // Merge defaults para novos campos
      var changed = false;
      for (var k in DEFAULT_CONFIG) {
        if (!(k in cfg)) { cfg[k] = DEFAULT_CONFIG[k]; changed = true; }
      }
      if (changed) write(KEYS.CONFIG, cfg);
    }

    // Admin password padrão
    if (!cfg.admin_password_hash) {
      // hash será definido assincronamente pelo Auth. Set flag default.
      cfg.admin_password_hash = "PLAIN:6726admin";
      write(KEYS.CONFIG, cfg);
    }

    if (!read(KEYS.USERS, null)) write(KEYS.USERS, {});
    if (!read(KEYS.TRANSACTIONS, null)) write(KEYS.TRANSACTIONS, []);
    if (!read(KEYS.CHATS, null)) write(KEYS.CHATS, {});
    if (!read(KEYS.BONUS_CLAIMS, null)) write(KEYS.BONUS_CLAIMS, {});
    if (!read(KEYS.NOTIFICATIONS, null)) write(KEYS.NOTIFICATIONS, {});
    if (!read(KEYS.GAME_HISTORY, null)) write(KEYS.GAME_HISTORY, []);
    if (!read(KEYS.WINNING_MODE, null)) write(KEYS.WINNING_MODE, {});
    return true;
  };

  /* ---------- Config ---------- */
  DB.getConfig = function () { return read(KEYS.CONFIG, DEFAULT_CONFIG); };
  DB.saveConfig = function (cfg) { write(KEYS.CONFIG, cfg); };
  DB.updateConfig = function (partial) {
    var c = DB.getConfig();
    for (var k in partial) c[k] = partial[k];
    DB.saveConfig(c);
    return c;
  };

  /* ---------- Users ---------- */
  DB.getAllUsers = function () { return read(KEYS.USERS, {}); };
  DB.getUser = function (username) {
    if (!username) return null;
    var u = DB.getAllUsers();
    return u[String(username).toLowerCase()] || null;
  };
  DB.saveUser = function (user) {
    if (!user || !user.username) return false;
    var all = DB.getAllUsers();
    all[user.username.toLowerCase()] = user;
    write(KEYS.USERS, all);
    return true;
  };
  DB.createUser = function (user) {
    var all = DB.getAllUsers();
    var key = String(user.username).toLowerCase();
    if (all[key]) return false;
    user.username = key;
    user.balance = user.balance || 0;
    user.created_at = Date.now();
    user.last_login = Date.now();
    user.vip_points = user.vip_points || 0;
    user.total_bet = 0;
    user.total_won = 0;
    user.total_deposited = 0;
    user.total_withdrawn = 0;
    user.banned = false;
    user.bonus_claimed_signup = false;
    all[key] = user;
    write(KEYS.USERS, all);
    return true;
  };
  DB.deleteUser = function (username) {
    var all = DB.getAllUsers();
    delete all[String(username).toLowerCase()];
    write(KEYS.USERS, all);
  };
  DB.listUsers = function () {
    var all = DB.getAllUsers();
    var arr = [];
    for (var k in all) arr.push(all[k]);
    arr.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
    return arr;
  };

  /* ---------- Balance (protegido) ---------- */
  function computeIntegrity(username, balance) {
    // Checksum simples baseado em string (não é cripto real, apenas detecta manipulação ingênua via DevTools)
    var s = username + "|" + Number(balance).toFixed(2) + "|6726.Bet.salt.anthony.ramos.bernardino";
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
  function saveIntegrity(username, balance) {
    var map = read(KEYS.INTEGRITY, {});
    map[String(username).toLowerCase()] = computeIntegrity(username, balance);
    write(KEYS.INTEGRITY, map);
  }
  DB.verifyIntegrity = function (username) {
    var u = DB.getUser(username); if (!u) return false;
    var map = read(KEYS.INTEGRITY, {});
    var expected = map[u.username];
    if (!expected) return true; // primeira vez
    return computeIntegrity(u.username, u.balance) === expected;
  };
  DB.setBalance = function (username, newBalance) {
    var u = DB.getUser(username); if (!u) return false;
    u.balance = Math.max(0, Number(newBalance) || 0);
    DB.saveUser(u);
    saveIntegrity(u.username, u.balance);
    return true;
  };
  DB.adjustBalance = function (username, delta) {
    var u = DB.getUser(username); if (!u) return false;
    u.balance = Math.max(0, (Number(u.balance) || 0) + Number(delta));
    DB.saveUser(u);
    saveIntegrity(u.username, u.balance);
    return u.balance;
  };

  /* ---------- Transactions ---------- */
  DB.getTransactions = function () { return read(KEYS.TRANSACTIONS, []); };
  DB.addTransaction = function (tx) {
    var arr = DB.getTransactions();
    tx.id = tx.id || ("tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7));
    tx.created_at = tx.created_at || Date.now();
    arr.unshift(tx);
    if (arr.length > 5000) arr.length = 5000;
    write(KEYS.TRANSACTIONS, arr);
    return tx;
  };
  DB.userTransactions = function (username, limit) {
    var u = String(username).toLowerCase();
    return DB.getTransactions().filter(function (t) { return t.username === u; }).slice(0, limit || 100);
  };

  /* ---------- Chats ---------- */
  // Estrutura: { threadId: { id, username, type: 'DEPOSITO'|'SAQUE'|'SUPORTE', messages: [{id, from:'user'|'admin', text, ts, read_admin, read_user}], last_ts } }
  DB.getChats = function () { return read(KEYS.CHATS, {}); };
  DB.saveChats = function (obj) { write(KEYS.CHATS, obj); };
  DB.getOrCreateThread = function (username, type) {
    var chats = DB.getChats();
    var id = type + "-" + String(username).toLowerCase();
    if (!chats[id]) {
      chats[id] = {
        id: id,
        username: String(username).toLowerCase(),
        type: type,
        messages: [],
        last_ts: Date.now(),
      };
      DB.saveChats(chats);
    }
    return chats[id];
  };
  DB.postMessage = function (threadId, from, text) {
    var chats = DB.getChats();
    var t = chats[threadId];
    if (!t) return null;
    var msg = {
      id: "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      from: from, // 'user' | 'admin' | 'system'
      text: String(text),
      ts: Date.now(),
      read_user: from !== "admin",
      read_admin: from !== "user",
    };
    t.messages.push(msg);
    t.last_ts = msg.ts;
    DB.saveChats(chats);
    return msg;
  };
  DB.markThreadRead = function (threadId, who) {
    var chats = DB.getChats();
    var t = chats[threadId]; if (!t) return;
    t.messages.forEach(function (m) {
      if (who === "user") m.read_user = true;
      if (who === "admin") m.read_admin = true;
    });
    DB.saveChats(chats);
  };
  DB.userThreads = function (username) {
    var chats = DB.getChats();
    var u = String(username).toLowerCase();
    var arr = [];
    for (var k in chats) if (chats[k].username === u) arr.push(chats[k]);
    arr.sort(function (a, b) { return b.last_ts - a.last_ts; });
    return arr;
  };
  DB.allThreads = function () {
    var chats = DB.getChats();
    var arr = [];
    for (var k in chats) arr.push(chats[k]);
    arr.sort(function (a, b) { return b.last_ts - a.last_ts; });
    return arr;
  };
  DB.unreadCount = function (username, who) {
    var threads = username ? DB.userThreads(username) : DB.allThreads();
    var count = 0;
    threads.forEach(function (t) {
      t.messages.forEach(function (m) {
        if (who === "user" && !m.read_user && m.from !== "user") count++;
        if (who === "admin" && !m.read_admin && m.from !== "admin") count++;
      });
    });
    return count;
  };

  /* ---------- Bonus claims ---------- */
  DB.getBonusClaims = function () { return read(KEYS.BONUS_CLAIMS, {}); };
  DB.claimDaily = function (username, amount) {
    var claims = DB.getBonusClaims();
    var k = String(username).toLowerCase();
    var today = (new Date()).toISOString().slice(0, 10);
    if (!claims[k]) claims[k] = {};
    if (claims[k].daily === today) return { ok: false, reason: "Já resgatado hoje." };
    claims[k].daily = today;
    write(KEYS.BONUS_CLAIMS, claims);
    DB.adjustBalance(username, amount);
    DB.addTransaction({ username: String(username).toLowerCase(), type: "bonus", amount: amount, label: "Bônus diário" });
    return { ok: true };
  };
  DB.claimSignup = function (username, amount) {
    var u = DB.getUser(username); if (!u) return false;
    if (u.bonus_claimed_signup) return false;
    u.bonus_claimed_signup = true;
    DB.saveUser(u);
    DB.adjustBalance(username, amount);
    DB.addTransaction({ username: u.username, type: "bonus", amount: amount, label: "Bônus de cadastro" });
    return true;
  };

  /* ---------- Notifications ---------- */
  DB.getNotifications = function (username) {
    var all = read(KEYS.NOTIFICATIONS, {});
    return all[String(username).toLowerCase()] || [];
  };
  DB.addNotification = function (username, n) {
    var all = read(KEYS.NOTIFICATIONS, {});
    var k = String(username).toLowerCase();
    if (!all[k]) all[k] = [];
    n.id = n.id || ("n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6));
    n.ts = n.ts || Date.now();
    n.read = false;
    all[k].unshift(n);
    if (all[k].length > 60) all[k].length = 60;
    write(KEYS.NOTIFICATIONS, all);
  };
  DB.markNotifsRead = function (username) {
    var all = read(KEYS.NOTIFICATIONS, {});
    var arr = all[String(username).toLowerCase()] || [];
    arr.forEach(function (n) { n.read = true; });
    write(KEYS.NOTIFICATIONS, all);
  };

  /* ---------- Game history ---------- */
  DB.getGameHistory = function (username, limit) {
    var all = read(KEYS.GAME_HISTORY, []);
    if (username) {
      var u = String(username).toLowerCase();
      all = all.filter(function (x) { return x.username === u; });
    }
    return all.slice(0, limit || 100);
  };
  DB.addGameHistory = function (entry) {
    var all = read(KEYS.GAME_HISTORY, []);
    entry.id = entry.id || ("g_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6));
    entry.ts = entry.ts || Date.now();
    all.unshift(entry);
    if (all.length > 5000) all.length = 5000;
    write(KEYS.GAME_HISTORY, all);
  };

  /* ---------- Winning mode (admin) ---------- */
  DB.getWinningMode = function (username) {
    var map = read(KEYS.WINNING_MODE, {});
    return map[String(username).toLowerCase()] || null;
  };
  DB.setWinningMode = function (username, mode) {
    // mode: null | 'always' | 'never' | { boost: 0..1 }
    var map = read(KEYS.WINNING_MODE, {});
    var k = String(username).toLowerCase();
    if (mode == null) delete map[k];
    else map[k] = mode;
    write(KEYS.WINNING_MODE, map);
  };

  /* ---------- Session ---------- */
  DB.getSession = function () { return read(KEYS.SESSION, null); };
  DB.setSession = function (s) { write(KEYS.SESSION, s); };
  DB.clearSession = function () { localStorage.removeItem(KEYS.SESSION); };

  /* ---------- Economia ---------- */
  DB.getEconomy = function () {
    var txs = DB.getTransactions();
    var out = { deposit: 0, withdraw: 0, bet: 0, win: 0, bonus: 0 };
    txs.forEach(function (t) {
      if (t.type in out) out[t.type] += Number(t.amount || 0);
    });
    var users = DB.listUsers();
    var totalBalance = users.reduce(function (s, u) { return s + Number(u.balance || 0); }, 0);
    return {
      totalDeposit: out.deposit,
      totalWithdraw: out.withdraw,
      totalBet: out.bet,
      totalWin: out.win,
      totalBonus: out.bonus,
      totalBalance: totalBalance,
      userCount: users.length,
      houseResult: out.deposit - out.withdraw - out.bonus - Math.max(0, out.win - out.bet),
    };
  };

  /* ---------- Export / Reset ---------- */
  DB.exportAll = function () {
    var out = {};
    for (var k in KEYS) out[k] = read(KEYS[k], null);
    return out;
  };
  DB.resetAll = function () {
    for (var k in KEYS) localStorage.removeItem(KEYS[k]);
    DB.init();
  };

  global.DB = DB;
})(window);
