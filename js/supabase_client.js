/* =========================================================
   6726.Bet — supabase_client.js
   Cliente Supabase (ESM via CDN).
   Expõe `window.SB` com helpers async quando configurado em
   window.__SUPABASE_CONFIG__ (definido em js/config.js).
   Caso não configurado, SB.enabled === false e o DB cai em
   LocalStorage.
   ========================================================= */
(function (global) {
  "use strict";

  var SB = { enabled: false, ready: false, client: null, config: null };

  function getConfig() {
    // Prioridade: runtime (localStorage) > janela global > null
    try {
      var raw = localStorage.getItem("6726bet.supabase_config");
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg && cfg.url && cfg.anonKey) return cfg;
      }
    } catch (e) {}
    if (global.__SUPABASE_CONFIG__ && global.__SUPABASE_CONFIG__.url && global.__SUPABASE_CONFIG__.anonKey) {
      return global.__SUPABASE_CONFIG__;
    }
    return null;
  }

  SB.saveConfigToLocal = function (url, anonKey) {
    localStorage.setItem("6726bet.supabase_config", JSON.stringify({ url: url, anonKey: anonKey }));
  };
  SB.clearConfigFromLocal = function () {
    localStorage.removeItem("6726bet.supabase_config");
  };

  SB.init = async function () {
    if (SB.ready) return SB;
    var cfg = getConfig();
    if (!cfg) { SB.enabled = false; SB.ready = true; return SB; }
    try {
      var mod = await import("https://esm.sh/@supabase/supabase-js@2");
      SB.client = mod.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 5 } }
      });
      SB.config = cfg;
      SB.enabled = true;
      SB.ready = true;
    } catch (e) {
      console.warn("[SB] Falha ao carregar Supabase SDK:", e);
      SB.enabled = false;
      SB.ready = true;
    }
    return SB;
  };

  // Helper: executa op() se enabled, fallback() caso contrário
  SB.withFallback = async function (op, fallback) {
    if (!SB.ready) await SB.init();
    if (SB.enabled && typeof op === "function") {
      try { return await op(SB.client); }
      catch (e) { console.warn("[SB] op falhou, caindo pro fallback:", e); }
    }
    return typeof fallback === "function" ? fallback() : fallback;
  };

  global.SB = SB;
})(window);
