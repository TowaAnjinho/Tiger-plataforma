/* =========================================================
   6726.Bet — auth.js
   Autenticação de usuários e admin
   ========================================================= */
(function (global) {
  "use strict";

  var Auth = {};

  Auth.getSession = function () { return DB.getSession(); };
  Auth.currentUser = function () {
    var s = Auth.getSession();
    if (!s || !s.username) return null;
    return DB.getUser(s.username);
  };
  Auth.isAdmin = function () {
    var s = Auth.getSession();
    return !!(s && s.role === "admin");
  };

  async function hashPwd(text) {
    return "SHA:" + (await U.sha256(text));
  }
  async function verifyPwd(text, stored) {
    if (!stored) return false;
    if (stored.indexOf("PLAIN:") === 0) return stored.slice(6) === text;
    if (stored.indexOf("SHA:") === 0) {
      var h = await hashPwd(text);
      return h === stored;
    }
    return false;
  }

  Auth.register = async function (payload) {
    var un = U.validateUsername(payload.username);
    if (un) return { ok: false, error: un };
    var pn = U.validatePassword(payload.password);
    if (pn) return { ok: false, error: pn };
    if (payload.password !== payload.confirm) return { ok: false, error: "Senhas não conferem." };

    var exists = DB.getUser(payload.username);
    if (exists) return { ok: false, error: "Usuário já existe." };

    var cfg = DB.getConfig();
    var user = {
      username: String(payload.username).toLowerCase(),
      nickname: payload.nickname || payload.username,
      email: payload.email || "",
      phone: payload.phone || "",
      password_hash: await hashPwd(payload.password),
      balance: cfg.default_balance || 0,
      vip_points: 0,
      role: "user",
      created_at: Date.now(),
    };
    DB.createUser(user);

    // Bônus de cadastro
    if (cfg.bonuses_enabled && cfg.signup_bonus > 0) {
      DB.claimSignup(user.username, cfg.signup_bonus);
    }

    DB.setSession({ username: user.username, role: "user", login_at: Date.now() });
    DB.addNotification(user.username, { title: "Bem-vindo à 6726.Bet!", body: "Aproveite os jogos e boa sorte.", kind: "success" });
    return { ok: true, user: DB.getUser(user.username) };
  };

  Auth.login = async function (username, password) {
    if (!username || !password) return { ok: false, error: "Preencha usuário e senha." };

    var cfg = DB.getConfig();
    // Admin login
    if (String(username).toLowerCase() === String(cfg.admin_username).toLowerCase()) {
      var ok = await verifyPwd(password, cfg.admin_password_hash);
      if (!ok) return { ok: false, error: "Credenciais de administrador inválidas." };
      DB.setSession({ username: cfg.admin_username, role: "admin", login_at: Date.now() });
      return { ok: true, admin: true };
    }

    var u = DB.getUser(username);
    if (!u) return { ok: false, error: "Usuário não encontrado." };
    if (u.banned) return { ok: false, error: "Conta bloqueada. Contate o suporte." };
    var okU = await verifyPwd(password, u.password_hash);
    if (!okU) return { ok: false, error: "Senha incorreta." };
    u.last_login = Date.now();
    DB.saveUser(u);
    DB.setSession({ username: u.username, role: "user", login_at: Date.now() });
    return { ok: true, user: u };
  };

  Auth.logout = function () {
    DB.clearSession();
  };

  Auth.changePassword = async function (username, newPassword) {
    var err = U.validatePassword(newPassword);
    if (err) return { ok: false, error: err };
    var u = DB.getUser(username);
    if (!u) return { ok: false, error: "Usuário não encontrado." };
    u.password_hash = await hashPwd(newPassword);
    DB.saveUser(u);
    return { ok: true };
  };

  Auth.setAdminPassword = async function (newPassword) {
    var h = await hashPwd(newPassword);
    DB.updateConfig({ admin_password_hash: h });
  };

  Auth.hashPassword = hashPwd;

  Auth.requireUser = function () {
    var s = Auth.getSession();
    if (!s || s.role !== "user") {
      U.goRoot("pages/login.html");
      return null;
    }
    var u = DB.getUser(s.username);
    if (!u) {
      DB.clearSession();
      U.goRoot("pages/login.html");
      return null;
    }
    return u;
  };
  Auth.requireAdmin = function () {
    var s = Auth.getSession();
    if (!s || s.role !== "admin") {
      U.goRoot("pages/login.html");
      return null;
    }
    return { username: s.username };
  };

  global.Auth = Auth;
})(window);
