/* =========================================================
   6726.Bet — Marca TIGER (30 jogos)
   ========================================================= */
(function () {
  var symbols = Games.makeSymbols([
    { id: "t7", e: "7️⃣", w: 1 },
    { id: "tiger", e: "🐯", w: 2 },
    { id: "crown", e: "👑", w: 3 },
    { id: "diamond", e: "💎", w: 5 },
    { id: "coin", e: "🪙", w: 7 },
    { id: "bell", e: "🔔", w: 9 },
    { id: "cherry", e: "🍒", w: 12 },
  ]);

  var themes = [
    "Fortune", "Golden", "Roar", "Stripes", "Jungle", "Eye", "Lucky", "Mega", "Royal", "Rising",
    "Super", "Wild", "Ultimate", "Shadow", "Crimson", "Neon", "Mystic", "Emerald", "Frost", "Solar",
    "Tropical", "Thunder", "Diamond", "Paradise", "Prowler", "Night", "Bamboo", "Sakura", "Sunset", "Midas"
  ];

  var brand = {
    key: "tiger",
    name: "Tiger",
    icon: "🐯",
    color: "#ff7a00",
    games: [],
  };

  for (var i = 0; i < 30; i++) {
    brand.games.push({
      id: "tiger-" + String(i + 1).padStart(2, "0"),
      name: "Tiger " + themes[i],
      description: "Slot do Tigre — " + themes[i],
      minBet: 0.10,
      maxBet: 500,
      rtp: 0.90 + (i % 6) * 0.01,
      symbols: symbols,
      theme: { bg: "linear-gradient(135deg, #3b1e0b, #0a0a12)", accent: "#ff7a00" },
    });
  }
  Games.registerBrand(brand);
})();
