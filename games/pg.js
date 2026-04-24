/* =========================================================
   6726.Bet — Marca PG (30 jogos)
   ========================================================= */
(function () {
  var symbols = Games.makeSymbols([
    { id: "wild", e: "🃏", w: 1 },
    { id: "dragon", e: "🐉", w: 2 },
    { id: "gem", e: "💎", w: 3 },
    { id: "gold", e: "🥇", w: 5 },
    { id: "ring", e: "💍", w: 7 },
    { id: "seven", e: "7️⃣", w: 9 },
    { id: "grape", e: "🍇", w: 12 },
  ]);
  var themes = [
    "Genie", "Lotus", "Jewels", "Wild Bandito", "Ganesha", "Ninja", "Tree of Fortune", "Dragon Hatch", "Leprechaun", "Piggy",
    "Pirate Bonanza", "Samba", "Sushi Oishi", "Ways of Qilin", "Mahjong", "Fortune Ox", "Dragon Tiger", "Caishen", "Bali Vacation", "Mermaid",
    "Santa", "Emperor", "Muay Thai", "Gem Saviour", "Heist", "Journey", "Cocktail Nights", "Queen Bounty", "Wizdom", "Cruise Royale"
  ];
  var brand = { key: "pg", name: "PG", icon: "🎰", color: "#22d3ee", games: [] };
  for (var i = 0; i < 30; i++) {
    brand.games.push({
      id: "pg-" + String(i + 1).padStart(2, "0"),
      name: "PG " + themes[i],
      description: "Coleção PG — " + themes[i],
      minBet: 1, maxBet: 500,
      rtp: 0.92 + (i % 5) * 0.004,
      symbols: symbols,
      theme: { bg: "linear-gradient(135deg, #0a2d3a, #0a0a12)", accent: "#22d3ee" },
    });
  }
  Games.registerBrand(brand);
})();
