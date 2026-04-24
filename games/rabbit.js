/* =========================================================
   6726.Bet — Marca RABBIT (30 jogos)
   ========================================================= */
(function () {
  var symbols = Games.makeSymbols([
    { id: "rbt", e: "🐰", w: 2 },
    { id: "carrot", e: "🥕", w: 4 },
    { id: "moon", e: "🌙", w: 3 },
    { id: "clover", e: "🍀", w: 5 },
    { id: "star", e: "⭐", w: 7 },
    { id: "apple", e: "🍎", w: 9 },
    { id: "grape", e: "🍇", w: 12 },
  ]);
  var themes = [
    "Hop", "Lucky", "Gold", "Easter", "Moonlight", "Garden", "Fluffy", "Neon", "Royal", "Spring",
    "Midnight", "Crystal", "Forest", "Sunrise", "Snow", "Cosmic", "Mystic", "Carrot Rush", "Velvet", "Prism",
    "Rainbow", "Party", "Dream", "Pearl", "Ivory", "Lavender", "Meadow", "Dusk", "Enchanted", "Celestial"
  ];
  var brand = { key: "rabbit", name: "Rabbit", icon: "🐰", color: "#ff3d85", games: [] };
  for (var i = 0; i < 30; i++) {
    brand.games.push({
      id: "rabbit-" + String(i + 1).padStart(2, "0"),
      name: "Rabbit " + themes[i],
      description: "Slot do Coelho — " + themes[i],
      minBet: 0.10, maxBet: 500,
      rtp: 0.91 + (i % 5) * 0.008,
      symbols: symbols,
      theme: { bg: "linear-gradient(135deg, #2a1133, #0a0a12)", accent: "#ff3d85" },
    });
  }
  Games.registerBrand(brand);
})();
