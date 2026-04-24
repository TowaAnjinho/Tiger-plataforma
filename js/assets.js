/* =========================================================
   6726.Bet — V2 assets helper
   Centraliza URLs dos ativos visuais (SVGs gerados em assets/images/).
   ========================================================= */
(function (global) {
  "use strict";

  // Detecta se a página está em /pages/ ou na raiz para ajustar path
  function base() {
    var p = (location.pathname || "").replace(/\\/g, "/");
    return /\/pages\//.test(p) ? "../assets/images/" : "assets/images/";
  }

  var Assets = {};

  Assets.base = base;

  Assets.gameThumb = function (gameId) {
    return base() + "games/" + gameId + ".svg";
  };

  Assets.brandBanner = function (brandKey) {
    return base() + "brands/" + brandKey + ".svg";
  };

  Assets.icon = function (name) {
    return base() + "icons/" + name + ".svg";
  };

  Assets.hero = function (n) {
    return base() + "banners/hero-" + n + ".svg";
  };

  Assets.allHeroes = function () {
    return [1, 2, 3, 4].map(Assets.hero);
  };

  Assets.vip = function (level) {
    var lvl = Math.max(0, Math.min(10, Number(level) || 0));
    return base() + "ui/vip-" + String(lvl).padStart(2, "0") + ".svg";
  };

  Assets.avatar = function (seed) {
    // Pick a deterministic avatar from 16 based on a seed (username)
    var idx = 1;
    if (seed) {
      var s = String(seed);
      var h = 0;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      idx = (h % 16) + 1;
    }
    return base() + "profiles/avatar-" + String(idx).padStart(2, "0") + ".svg";
  };

  Assets.logo = function () { return base() + "ui/logo.svg"; };
  Assets.loadingCoin = function () { return base() + "ui/loading-coin.svg"; };
  Assets.emblem = function () { return base() + "ui/emblem.svg"; };

  Assets.iconImg = function (name, extraClass) {
    var cls = "icon-img" + (extraClass ? " " + extraClass : "");
    return '<img class="' + cls + '" src="' + Assets.icon(name) + '" alt="' + name + '" loading="lazy"/>';
  };

  global.Assets = Assets;
})(window);
