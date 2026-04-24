/* =========================================================
   6726.Bet — Marca DRAGON (30 jogos) — custom
   ========================================================= */
(function () {
  var symbols = Games.makeSymbols([
    { id: "dgold", e: "🐲", w: 1 },
    { id: "dragon", e: "🐉", w: 2 },
    { id: "fire", e: "🔥", w: 3 },
    { id: "orb", e: "🔴", w: 5 },
    { id: "sword", e: "⚔️", w: 7 },
    { id: "shield", e: "🛡️", w: 9 },
    { id: "scroll", e: "📜", w: 12 },
  ]);
  var themes = [
    "Emperor", "Legacy", "Fire", "Ice", "Storm", "Ancient", "Golden", "Sapphire", "Ruby", "Obsidian",
    "Eclipse", "Inferno", "Thunder", "Frost", "Shadow", "Celestial", "Mystic", "Eternal", "Warrior", "Guardian",
    "Oracle", "Forbidden", "Temple", "Vault", "Rebirth", "Phoenix", "Jade", "Cobalt", "Crimson", "Abyss"
  ];
  var brand = { key: "dragon", name: "Dragon", icon: "🐉", color: "#ef4444", games: [] };
  for (var i = 0; i < 30; i++) {
    brand.games.push({
      id: "dragon-" + String(i + 1).padStart(2, "0"),
      name: "Dragon " + themes[i],
      description: "Dragon — " + themes[i],
      minBet: 1, maxBet: 800,
      rtp: 0.90 + (i % 5) * 0.008,
      symbols: symbols,
      theme: { bg: "linear-gradient(135deg, #3a0a0a, #0a0a12)", accent: "#ef4444" },
    });
  }
  Games.registerBrand(brand);
})();
