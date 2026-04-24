/* =========================================================
   6726.Bet — Marca SPIN (30 jogos)
   ========================================================= */
(function () {
  var symbols = Games.makeSymbols([
    { id: "spin", e: "🌀", w: 1 },
    { id: "seven", e: "7️⃣", w: 2 },
    { id: "bar", e: "🅱️", w: 3 },
    { id: "bell", e: "🔔", w: 5 },
    { id: "watermelon", e: "🍉", w: 7 },
    { id: "orange", e: "🍊", w: 9 },
    { id: "cherry", e: "🍒", w: 12 },
  ]);
  var themes = [
    "Classic", "Neon", "Mega", "Turbo", "Hyper", "Nova", "Quantum", "Storm", "Flash", "Frenzy",
    "Velocity", "Circuit", "Galaxy", "Pulse", "Vortex", "Rocket", "Infinity", "Zenith", "Arcade", "Retro",
    "Prism", "Kinetic", "Titanium", "Chrome", "Magnetic", "Electron", "Plasma", "Photon", "Laser", "Warp"
  ];
  var brand = { key: "spin", name: "SPIN", icon: "🌀", color: "#9333ea", games: [] };
  for (var i = 0; i < 30; i++) {
    brand.games.push({
      id: "spin-" + String(i + 1).padStart(2, "0"),
      name: "Spin " + themes[i],
      description: "SPIN — " + themes[i],
      minBet: 0.10, maxBet: 500,
      rtp: 0.91 + (i % 6) * 0.006,
      symbols: symbols,
      theme: { bg: "linear-gradient(135deg, #2a0a3a, #0a0a12)", accent: "#9333ea" },
    });
  }
  Games.registerBrand(brand);
})();
