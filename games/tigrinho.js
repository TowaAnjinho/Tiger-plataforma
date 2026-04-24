/* =========================================================
   6726.Bet — Marca TIGRINHO (30 jogos) — o famoso
   ========================================================= */
(function () {
  var symbols = Games.makeSymbols([
    { id: "tg", e: "🐅", w: 1 },
    { id: "t7", e: "7️⃣", w: 2 },
    { id: "crown", e: "👑", w: 3 },
    { id: "gold", e: "🟡", w: 5 },
    { id: "bell", e: "🔔", w: 7 },
    { id: "cherry", e: "🍒", w: 10 },
    { id: "lemon", e: "🍋", w: 14 },
  ]);
  var themes = [
    "Clássico", "Bônus", "Mega", "Super", "Ultra", "Gold", "Fortuna", "Diamante", "Imperial", "Dourado",
    "Fortune", "Flaming", "Neon", "Rush", "Coin", "Lightning", "Stars", "Power", "Wild", "Royal",
    "Deluxe", "VIP", "Classic", "Party", "Festival", "Paradise", "Jackpot", "Legend", "Giant", "Grand"
  ];
  var brand = { key: "tigrinho", name: "Tigrinho", icon: "🐅", color: "#ffd65a", games: [] };
  for (var i = 0; i < 30; i++) {
    brand.games.push({
      id: "tigrinho-" + String(i + 1).padStart(2, "0"),
      name: "Tigrinho " + themes[i],
      description: "O famoso Tigrinho — " + themes[i],
      minBet: 0.10, maxBet: 1000,
      rtp: 0.92 + (i % 4) * 0.005,
      symbols: symbols,
      theme: { bg: "linear-gradient(135deg, #3a2a0b, #0a0a12)", accent: "#ffd65a" },
    });
  }
  Games.registerBrand(brand);
})();
