/* =========================================================
   6726.Bet — games.js
   Engine unificado de slot 3x3 com 1 linha central (central payline).
   Cada jogo é configurado com símbolos, pesos, payouts e RTP alvo.
   O "Modo Vitória" do admin influencia a probabilidade de vitória.
   ========================================================= */
(function (global) {
  "use strict";

  var Games = {
    brands: [],        // [{key, name, icon, color, games:[...]}]
    byId: {},          // {gameId: {gameConfig, brand}}
  };

  Games.registerBrand = function (brand) {
    Games.brands.push(brand);
    brand.games.forEach(function (g) {
      g.brandKey = brand.key;
      g.brandName = brand.name;
      if (!g.icon) g.icon = brand.icon;
      Games.byId[g.id] = { game: g, brand: brand };
    });
  };

  Games.listBrands = function () { return Games.brands.slice(); };
  Games.getBrand = function (key) {
    for (var i = 0; i < Games.brands.length; i++) if (Games.brands[i].key === key) return Games.brands[i];
    return null;
  };
  Games.getGame = function (id) {
    return Games.byId[id] ? Games.byId[id].game : null;
  };
  Games.allGames = function () {
    var out = [];
    Games.brands.forEach(function (b) { b.games.forEach(function (g) { out.push(g); }); });
    return out;
  };
  Games.search = function (q) {
    q = String(q || "").toLowerCase();
    return Games.allGames().filter(function (g) {
      return g.name.toLowerCase().indexOf(q) !== -1 || g.brandName.toLowerCase().indexOf(q) !== -1;
    });
  };

  /* -----------------------------------------------------
     Determina um resultado 3x3 e o ganho com base em:
     - symbols weights
     - payouts por combinação na linha central
     - targetRtp (ajustado pelo Modo Vitória)
     ----------------------------------------------------- */
  function randomSymbol(symbols) {
    var total = symbols.reduce(function (s, x) { return s + x.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < symbols.length; i++) {
      r -= symbols[i].w;
      if (r <= 0) return symbols[i];
    }
    return symbols[symbols.length - 1];
  }

  function buildGrid(symbols) {
    var g = [];
    for (var i = 0; i < 9; i++) g.push(randomSymbol(symbols));
    return g;
  }

  function centerLinePayout(grid, game) {
    // Central row = indexes 3, 4, 5
    var a = grid[3], b = grid[4], c = grid[5];
    if (a.id === b.id && b.id === c.id) {
      return { win: true, multiplier: a.payout3 || 5, symbol: a };
    }
    if (a.id === b.id || b.id === c.id) {
      var sym = (a.id === b.id) ? a : c;
      return { win: true, multiplier: sym.payout2 || 1, symbol: sym };
    }
    return { win: false, multiplier: 0, symbol: null };
  }

  function pickForcedWin(symbols) {
    // Escolhe um símbolo com base em pesos mas favorecendo payouts baixos para manter RTP
    var pool = symbols.slice().sort(function (a, b) { return (a.payout3 || 0) - (b.payout3 || 0); });
    // Ponderação invertida para favorecer símbolos baixos
    var weighted = pool.map(function (s, i) { return { v: s, w: (pool.length - i) }; });
    return U.weighted(weighted);
  }

  function craftGridForResult(symbols, winning) {
    // Se winning=true, força linha central com 3 iguais (às vezes 2)
    var grid = buildGrid(symbols);
    if (winning) {
      var force3 = Math.random() < 0.35;
      var sym = pickForcedWin(symbols);
      grid[3] = sym; grid[4] = sym;
      if (force3) grid[5] = sym;
      else {
        var other = randomSymbol(symbols);
        if (other.id === sym.id) other = randomSymbol(symbols);
        grid[5] = other;
      }
    } else {
      // Garante que NÃO haja ganho na linha central
      if (grid[3].id === grid[4].id || grid[4].id === grid[5].id) {
        // Re-sortear a cell central
        var replacement;
        do { replacement = randomSymbol(symbols); }
        while (replacement.id === grid[3].id || replacement.id === grid[5].id);
        grid[4] = replacement;
      }
    }
    return grid;
  }

  Games.spin = function (gameId, username, bet) {
    var game = Games.getGame(gameId);
    if (!game) return { error: "Jogo não encontrado." };
    if (!username) return { error: "Sessão inválida." };
    var user = DB.getUser(username);
    if (!user) return { error: "Usuário não encontrado." };
    bet = Number(bet);
    if (!(bet > 0)) return { error: "Aposta inválida." };
    if (bet < (game.minBet || 1)) return { error: "Aposta mínima: " + U.formatBRL(game.minBet || 1) };
    if (bet > (game.maxBet || 1000)) return { error: "Aposta máxima: " + U.formatBRL(game.maxBet || 1000) };
    if (user.balance < bet) return { error: "Saldo insuficiente." };

    // Integridade
    if (!DB.verifyIntegrity(user.username)) {
      // corrige e alerta
      DB.setBalance(user.username, user.balance);
    }

    // Debita aposta
    DB.adjustBalance(user.username, -bet);
    DB.addTransaction({ username: user.username, type: "bet", amount: bet, label: game.name, game_id: gameId });

    // Determinar se vence com base no RTP e Modo Vitória
    var cfg = DB.getConfig();
    var wm = DB.getWinningMode(user.username);
    var targetRtp = game.rtp || cfg.global_rtp || 0.92;
    var winChance = Math.min(0.5, targetRtp * 0.45); // base ~35-45%
    if (wm === "always") winChance = 0.95;
    else if (wm === "never") winChance = 0.01;
    else if (wm && typeof wm === "object" && typeof wm.boost === "number") {
      winChance = U.clamp(winChance + wm.boost, 0.01, 0.97);
    }

    var shouldWin = Math.random() < winChance;
    var grid = craftGridForResult(game.symbols, shouldWin);
    var payout = centerLinePayout(grid, game);

    var winAmount = 0;
    if (payout.win) {
      winAmount = U.round2(bet * payout.multiplier);
      DB.adjustBalance(user.username, winAmount);
      DB.addTransaction({ username: user.username, type: "win", amount: winAmount, label: game.name + " — Vitória", game_id: gameId });
    }

    // Re-fetch fresh user and update stats (balance já foi atualizado via adjustBalance)
    var fresh = DB.getUser(user.username);
    fresh.total_bet = (fresh.total_bet || 0) + bet;
    if (payout.win) {
      fresh.total_won = (fresh.total_won || 0) + winAmount;
      fresh.vip_points = (fresh.vip_points || 0) + Math.floor(bet);
    } else {
      fresh.vip_points = (fresh.vip_points || 0) + Math.ceil(bet / 2);
    }
    DB.saveUser(fresh);

    DB.addGameHistory({
      username: user.username,
      game_id: gameId,
      game_name: game.name,
      brand: game.brandName,
      bet: bet,
      win: winAmount,
      profit: U.round2(winAmount - bet),
      symbols: grid.map(function (s) { return s.id; }),
    });

    return {
      grid: grid,
      win: payout.win,
      winAmount: winAmount,
      multiplier: payout.multiplier,
      winSymbol: payout.symbol ? payout.symbol.id : null,
      newBalance: DB.getUser(user.username).balance,
    };
  };

  /* -----------------------------------------------------
     Símbolos base reutilizáveis (cada marca define o tema)
     payout2 = 2 iguais em sequência na linha
     payout3 = 3 iguais na linha
     ----------------------------------------------------- */
  Games.makeSymbols = function (symbolDefs) {
    // symbolDefs: [{id, e (emoji), w (weight)}]; payouts calculados por raridade
    // Ordenar por peso crescente => mais raro = maior payout
    var sorted = symbolDefs.slice().sort(function (a, b) { return a.w - b.w; });
    var n = sorted.length;
    // payout3: 25, 18, 14, 10, 7, 5, 3  (exemplo)
    // Gera uma curva descendente baseada em n
    var basePayouts3 = [40, 25, 15, 10, 7, 5, 3.5, 2.5, 2, 1.5];
    var basePayouts2 = [3, 2, 1.5, 1.2, 1, 0.8, 0.6, 0.5, 0.4, 0.3];
    return sorted.map(function (s, i) {
      var p3 = basePayouts3[Math.min(i, basePayouts3.length - 1)];
      var p2 = basePayouts2[Math.min(i, basePayouts2.length - 1)];
      return { id: s.id, e: s.e, w: s.w, payout2: p2, payout3: p3 };
    });
  };

  global.Games = Games;
})(window);
