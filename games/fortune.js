/* =========================================================
   6726.Bet — Marca FORTUNE (30 jogos) — custom
   ========================================================= */
(function () {
  var symbols = Games.makeSymbols([
    { id: "pot", e: "💰", w: 1 },
    { id: "money", e: "💵", w: 2 },
    { id: "gold", e: "🥇", w: 3 },
    { id: "gem", e: "💎", w: 5 },
    { id: "coin", e: "🪙", w: 7 },
    { id: "seven", e: "7️⃣", w: 9 },
    { id: "star", e: "⭐", w: 12 },
  ]);
  var themes = [
    "Wheel", "Rush", "Tiger", "Ox", "Mouse", "Rabbit", "Dragon", "Snake", "Horse", "Goat",
    "Monkey", "Rooster", "Dog", "Pig", "Pearl", "Lotus", "Phoenix", "Legend", "Temple", "Golden",
    "Royal", "Emperor", "Empress", "Kingdom", "Palace", "Jade", "Pagoda", "Samurai", "Ninja", "Paradise"
  ];
  var brand = { key: "fortune", name: "Fortune", icon: "💰", color: "#22c55e", games: [] };
  for (var i = 0; i < 30; i++) {
    brand.games.push({
      id: "fortune-" + String(i + 1).padStart(2, "0"),
      name: "Fortune " + themes[i],
      description: "Fortune — " + themes[i],
      minBet: 1, maxBet: 1000,
      rtp: 0.92 + (i % 5) * 0.006,
      symbols: symbols,
      theme: { bg: "linear-gradient(135deg, #0a3a1a, #0a0a12)", accent: "#22c55e" },
    });
  }
  Games.registerBrand(brand);
})();
