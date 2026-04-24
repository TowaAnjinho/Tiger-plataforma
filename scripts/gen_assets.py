#!/usr/bin/env python3
"""
6726.Bet — V2 SVG asset generator.
Gera todos os ativos visuais (banners, thumbnails, ícones, avatares, carrossel)
como SVGs vetoriais de alta qualidade. Sem dependências externas.
"""
import os
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"

# Deterministic RNG for reproducible output
random.seed(6726)

# --------------------------------------------------------------
# BRAND DEFINITIONS
# --------------------------------------------------------------
BRANDS = [
    {
        "key": "tiger",
        "name": "Tiger",
        "subtitle": "Wild Fortune",
        "icon": "🐯",
        "primary": "#ff8a1f",
        "secondary": "#ff3d00",
        "accent": "#ffd65a",
        "bg_from": "#3b1e0b",
        "bg_to": "#0a0a12",
        "motif": "tiger",
        "count": 30,
    },
    {
        "key": "rabbit",
        "name": "Rabbit",
        "subtitle": "Lucky Hop",
        "icon": "🐰",
        "primary": "#ff5ea0",
        "secondary": "#b634ff",
        "accent": "#ffb3e0",
        "bg_from": "#3a0b22",
        "bg_to": "#0a0a12",
        "motif": "rabbit",
        "count": 30,
    },
    {
        "key": "tigrinho",
        "name": "Tigrinho",
        "subtitle": "Golden Edition",
        "icon": "🐅",
        "primary": "#ffd65a",
        "secondary": "#ff8a1f",
        "accent": "#ffffe0",
        "bg_from": "#3b2a05",
        "bg_to": "#0a0a12",
        "motif": "tiger",
        "count": 30,
    },
    {
        "key": "pg",
        "name": "PG",
        "subtitle": "Pocket Games",
        "icon": "🎰",
        "primary": "#22d3ee",
        "secondary": "#6366f1",
        "accent": "#e0f7ff",
        "bg_from": "#0b1e3b",
        "bg_to": "#0a0a12",
        "motif": "jewel",
        "count": 30,
    },
    {
        "key": "spin",
        "name": "SPIN",
        "subtitle": "Neon Reels",
        "icon": "🌀",
        "primary": "#a855f7",
        "secondary": "#ec4899",
        "accent": "#f0abfc",
        "bg_from": "#2a0b3b",
        "bg_to": "#0a0a12",
        "motif": "spiral",
        "count": 30,
    },
    {
        "key": "dragon",
        "name": "Dragon",
        "subtitle": "Emperor's Treasure",
        "icon": "🐉",
        "primary": "#ef4444",
        "secondary": "#b91c1c",
        "accent": "#fecaca",
        "bg_from": "#3b0b0b",
        "bg_to": "#0a0a12",
        "motif": "dragon",
        "count": 30,
    },
    {
        "key": "fortune",
        "name": "Fortune",
        "subtitle": "Gold Rush",
        "icon": "💰",
        "primary": "#f59e0b",
        "secondary": "#16a34a",
        "accent": "#fde68a",
        "bg_from": "#0b3b1a",
        "bg_to": "#0a0a12",
        "motif": "coin",
        "count": 30,
    },
]


# --------------------------------------------------------------
# SVG PRIMITIVES
# --------------------------------------------------------------
def svg_header(w, h):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">'
    )


def defs_common(brand, uid=""):
    p = brand["primary"]
    s = brand["secondary"]
    a = brand["accent"]
    bf = brand["bg_from"]
    bt = brand["bg_to"]
    return f"""<defs>
  <linearGradient id="bg{uid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="{bf}"/>
    <stop offset="100%" stop-color="{bt}"/>
  </linearGradient>
  <radialGradient id="glow{uid}" cx="50%" cy="50%" r="60%">
    <stop offset="0%" stop-color="{p}" stop-opacity="0.55"/>
    <stop offset="60%" stop-color="{s}" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gold{uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="{a}"/>
    <stop offset="50%" stop-color="{p}"/>
    <stop offset="100%" stop-color="{s}"/>
  </linearGradient>
  <filter id="blur{uid}" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur stdDeviation="8"/>
  </filter>
  <filter id="shadow{uid}" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/>
  </filter>
  <filter id="neon{uid}" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="4" result="b"/>
    <feMerge>
      <feMergeNode in="b"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>"""


def stars(w, h, n=40, color="#ffffff"):
    out = []
    for _ in range(n):
        x = random.uniform(0, w)
        y = random.uniform(0, h)
        r = random.uniform(0.5, 1.8)
        op = random.uniform(0.2, 0.85)
        out.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{color}" opacity="{op:.2f}"/>'
        )
    return "".join(out)


def confetti(w, h, colors, n=30):
    out = []
    for _ in range(n):
        x = random.uniform(0, w)
        y = random.uniform(0, h)
        c = random.choice(colors)
        sz = random.uniform(3, 7)
        rot = random.uniform(0, 360)
        out.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{sz:.1f}" height="{sz*0.5:.1f}" fill="{c}" opacity="0.7" transform="rotate({rot:.0f} {x:.1f} {y:.1f})"/>'
        )
    return "".join(out)


def coin(cx, cy, r, gold_from="#ffd65a", gold_to="#b57e05", stroke="#7a5100"):
    return f"""<g transform="translate({cx} {cy})">
      <circle r="{r}" fill="{gold_from}" stroke="{stroke}" stroke-width="{max(1, r*0.08):.1f}"/>
      <circle r="{r*0.78:.1f}" fill="none" stroke="{gold_to}" stroke-width="{max(1, r*0.06):.1f}" stroke-dasharray="2 3" opacity="0.8"/>
      <text x="0" y="{r*0.38:.1f}" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="{r*1.2:.1f}" fill="{gold_to}">$</text>
      <ellipse cx="{-r*0.35:.1f}" cy="{-r*0.35:.1f}" rx="{r*0.35:.1f}" ry="{r*0.18:.1f}" fill="#ffffff" opacity="0.55"/>
    </g>"""


def gem(cx, cy, r, color="#22d3ee", hi="#e0f7ff"):
    d = (
        f"M {cx} {cy-r} "
        f"L {cx+r*0.7} {cy-r*0.2} "
        f"L {cx+r*0.4} {cy+r} "
        f"L {cx-r*0.4} {cy+r} "
        f"L {cx-r*0.7} {cy-r*0.2} Z"
    )
    return f"""<g>
      <path d="{d}" fill="{color}" stroke="#ffffff" stroke-width="1.5" opacity="0.95"/>
      <path d="M {cx-r*0.5} {cy-r*0.15} L {cx+r*0.5} {cy-r*0.15}" stroke="{hi}" stroke-width="1.5" opacity="0.8"/>
      <path d="M {cx} {cy-r} L {cx} {cy+r}" stroke="{hi}" stroke-width="1" opacity="0.5"/>
      <path d="M {cx-r*0.25} {cy-r*0.6} L {cx-r*0.1} {cy-r*0.4}" stroke="#ffffff" stroke-width="2" opacity="0.9"/>
    </g>"""


def spark(cx, cy, s=10, color="#ffd65a"):
    d = (
        f"M {cx} {cy-s} L {cx+s*0.3} {cy-s*0.3} "
        f"L {cx+s} {cy} L {cx+s*0.3} {cy+s*0.3} "
        f"L {cx} {cy+s} L {cx-s*0.3} {cy+s*0.3} "
        f"L {cx-s} {cy} L {cx-s*0.3} {cy-s*0.3} Z"
    )
    return f'<path d="{d}" fill="{color}" opacity="0.85"/>'


def rays(cx, cy, r, color="#ffd65a", n=12):
    out = []
    for i in range(n):
        a = i * (2 * math.pi / n)
        x1 = cx + math.cos(a) * r * 0.35
        y1 = cy + math.sin(a) * r * 0.35
        x2 = cx + math.cos(a) * r
        y2 = cy + math.sin(a) * r
        out.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="2" opacity="0.55" stroke-linecap="round"/>'
        )
    return "".join(out)


# --------------------------------------------------------------
# MOTIF LIBRARY — detailed vector illustrations
# --------------------------------------------------------------
def motif_tiger(cx, cy, size, color="#ff8a1f", dark="#2a1300"):
    """Stylized tiger head."""
    s = size
    return f"""<g transform="translate({cx} {cy})">
      <!-- ears -->
      <path d="M {-s*0.45} {-s*0.55} L {-s*0.20} {-s*0.75} L {-s*0.15} {-s*0.40} Z" fill="{color}"/>
      <path d="M {s*0.45} {-s*0.55} L {s*0.20} {-s*0.75} L {s*0.15} {-s*0.40} Z" fill="{color}"/>
      <!-- head -->
      <ellipse rx="{s*0.55}" ry="{s*0.48}" fill="{color}"/>
      <!-- stripes -->
      <path d="M {-s*0.40} {-s*0.20} Q {-s*0.30} {-s*0.35} {-s*0.15} {-s*0.25}" stroke="{dark}" stroke-width="{s*0.06}" fill="none" stroke-linecap="round"/>
      <path d="M {s*0.40} {-s*0.20} Q {s*0.30} {-s*0.35} {s*0.15} {-s*0.25}" stroke="{dark}" stroke-width="{s*0.06}" fill="none" stroke-linecap="round"/>
      <path d="M {-s*0.45} {s*0.05} L {-s*0.25} {s*0.10}" stroke="{dark}" stroke-width="{s*0.05}" stroke-linecap="round"/>
      <path d="M {s*0.45} {s*0.05} L {s*0.25} {s*0.10}" stroke="{dark}" stroke-width="{s*0.05}" stroke-linecap="round"/>
      <!-- face -->
      <ellipse cx="0" cy="{s*0.05}" rx="{s*0.30}" ry="{s*0.28}" fill="#ffe0b8" opacity="0.95"/>
      <!-- eyes -->
      <circle cx="{-s*0.18}" cy="{-s*0.10}" r="{s*0.08}" fill="#fff"/>
      <circle cx="{s*0.18}" cy="{-s*0.10}" r="{s*0.08}" fill="#fff"/>
      <circle cx="{-s*0.18}" cy="{-s*0.10}" r="{s*0.045}" fill="{dark}"/>
      <circle cx="{s*0.18}" cy="{-s*0.10}" r="{s*0.045}" fill="{dark}"/>
      <!-- nose -->
      <path d="M {-s*0.05} {s*0.07} L {s*0.05} {s*0.07} L 0 {s*0.15} Z" fill="{dark}"/>
      <!-- mouth -->
      <path d="M 0 {s*0.15} Q {-s*0.08} {s*0.25} {-s*0.12} {s*0.20}" stroke="{dark}" stroke-width="{s*0.025}" fill="none" stroke-linecap="round"/>
      <path d="M 0 {s*0.15} Q {s*0.08} {s*0.25} {s*0.12} {s*0.20}" stroke="{dark}" stroke-width="{s*0.025}" fill="none" stroke-linecap="round"/>
    </g>"""


def motif_rabbit(cx, cy, size, color="#ffffff", pink="#ff5ea0", dark="#2a0a22"):
    s = size
    return f"""<g transform="translate({cx} {cy})">
      <!-- ears -->
      <ellipse cx="{-s*0.20}" cy="{-s*0.65}" rx="{s*0.10}" ry="{s*0.35}" fill="{color}"/>
      <ellipse cx="{s*0.20}" cy="{-s*0.65}" rx="{s*0.10}" ry="{s*0.35}" fill="{color}"/>
      <ellipse cx="{-s*0.20}" cy="{-s*0.65}" rx="{s*0.05}" ry="{s*0.24}" fill="{pink}" opacity="0.85"/>
      <ellipse cx="{s*0.20}" cy="{-s*0.65}" rx="{s*0.05}" ry="{s*0.24}" fill="{pink}" opacity="0.85"/>
      <!-- head -->
      <ellipse rx="{s*0.48}" ry="{s*0.44}" fill="{color}"/>
      <!-- cheeks -->
      <circle cx="{-s*0.28}" cy="{s*0.10}" r="{s*0.08}" fill="{pink}" opacity="0.55"/>
      <circle cx="{s*0.28}" cy="{s*0.10}" r="{s*0.08}" fill="{pink}" opacity="0.55"/>
      <!-- eyes -->
      <circle cx="{-s*0.15}" cy="{-s*0.05}" r="{s*0.06}" fill="{dark}"/>
      <circle cx="{s*0.15}" cy="{-s*0.05}" r="{s*0.06}" fill="{dark}"/>
      <circle cx="{-s*0.13}" cy="{-s*0.07}" r="{s*0.02}" fill="#fff"/>
      <circle cx="{s*0.17}" cy="{-s*0.07}" r="{s*0.02}" fill="#fff"/>
      <!-- nose + mouth -->
      <path d="M {-s*0.04} {s*0.08} L {s*0.04} {s*0.08} L 0 {s*0.14} Z" fill="{pink}"/>
      <path d="M 0 {s*0.14} L 0 {s*0.20}" stroke="{dark}" stroke-width="{s*0.02}"/>
      <path d="M 0 {s*0.20} Q {-s*0.08} {s*0.26} {-s*0.12} {s*0.22}" stroke="{dark}" stroke-width="{s*0.02}" fill="none"/>
      <path d="M 0 {s*0.20} Q {s*0.08} {s*0.26} {s*0.12} {s*0.22}" stroke="{dark}" stroke-width="{s*0.02}" fill="none"/>
      <!-- teeth -->
      <rect x="{-s*0.04}" y="{s*0.22}" width="{s*0.035}" height="{s*0.08}" fill="#fff"/>
      <rect x="{s*0.005}" y="{s*0.22}" width="{s*0.035}" height="{s*0.08}" fill="#fff"/>
    </g>"""


def motif_dragon(cx, cy, size, color="#ef4444", dark="#3b0b0b", eye="#ffd65a"):
    s = size
    return f"""<g transform="translate({cx} {cy})">
      <!-- horns -->
      <path d="M {-s*0.35} {-s*0.55} L {-s*0.50} {-s*0.80} L {-s*0.25} {-s*0.55} Z" fill="{dark}"/>
      <path d="M {s*0.35} {-s*0.55} L {s*0.50} {-s*0.80} L {s*0.25} {-s*0.55} Z" fill="{dark}"/>
      <!-- head/body scales -->
      <ellipse rx="{s*0.52}" ry="{s*0.46}" fill="{color}"/>
      <!-- scales pattern -->
      <circle cx="{-s*0.20}" cy="{s*0.18}" r="{s*0.09}" fill="{dark}" opacity="0.35"/>
      <circle cx="{s*0.20}" cy="{s*0.18}" r="{s*0.09}" fill="{dark}" opacity="0.35"/>
      <circle cx="0" cy="{s*0.28}" r="{s*0.09}" fill="{dark}" opacity="0.35"/>
      <!-- eyes -->
      <ellipse cx="{-s*0.16}" cy="{-s*0.10}" rx="{s*0.08}" ry="{s*0.10}" fill="{eye}"/>
      <ellipse cx="{s*0.16}" cy="{-s*0.10}" rx="{s*0.08}" ry="{s*0.10}" fill="{eye}"/>
      <ellipse cx="{-s*0.16}" cy="{-s*0.10}" rx="{s*0.02}" ry="{s*0.08}" fill="{dark}"/>
      <ellipse cx="{s*0.16}" cy="{-s*0.10}" rx="{s*0.02}" ry="{s*0.08}" fill="{dark}"/>
      <!-- nostrils -->
      <circle cx="{-s*0.06}" cy="{s*0.08}" r="{s*0.022}" fill="{dark}"/>
      <circle cx="{s*0.06}" cy="{s*0.08}" r="{s*0.022}" fill="{dark}"/>
      <!-- fangs -->
      <path d="M {-s*0.08} {s*0.22} L {-s*0.05} {s*0.32} L {-s*0.02} {s*0.22} Z" fill="#fff"/>
      <path d="M {s*0.08} {s*0.22} L {s*0.05} {s*0.32} L {s*0.02} {s*0.22} Z" fill="#fff"/>
      <!-- whiskers -->
      <path d="M {-s*0.50} {s*0.05} Q {-s*0.70} {s*0.10} {-s*0.75} {s*0.25}" stroke="{dark}" stroke-width="{s*0.02}" fill="none"/>
      <path d="M {s*0.50} {s*0.05} Q {s*0.70} {s*0.10} {s*0.75} {s*0.25}" stroke="{dark}" stroke-width="{s*0.02}" fill="none"/>
    </g>"""


def motif_coin(cx, cy, size):
    return coin(cx, cy, size * 0.5)


def motif_jewel(cx, cy, size, color="#22d3ee"):
    return gem(cx, cy, size * 0.55, color=color, hi="#e0f7ff")


def motif_spiral(cx, cy, size, color="#a855f7"):
    # neon spiral
    pts = []
    for i in range(120):
        t = i / 10.0
        r = t * size * 0.05
        a = t * 2.1
        x = cx + math.cos(a) * r
        y = cy + math.sin(a) * r
        pts.append(f"{x:.1f},{y:.1f}")
    poly = " ".join(pts)
    return f"""<g>
      <polyline points="{poly}" fill="none" stroke="{color}" stroke-width="{size*0.06:.1f}" stroke-linecap="round" opacity="0.9" filter="url(#neon)"/>
      <circle cx="{cx}" cy="{cy}" r="{size*0.12:.1f}" fill="#fff" opacity="0.9"/>
    </g>"""


def render_motif(motif, cx, cy, size, brand):
    if motif == "tiger":
        return motif_tiger(cx, cy, size, color=brand["primary"])
    if motif == "rabbit":
        return motif_rabbit(cx, cy, size, pink=brand["primary"])
    if motif == "dragon":
        return motif_dragon(cx, cy, size, color=brand["primary"])
    if motif == "jewel":
        return motif_jewel(cx, cy, size, color=brand["primary"])
    if motif == "spiral":
        return motif_spiral(cx, cy, size, color=brand["primary"])
    if motif == "coin":
        return motif_coin(cx, cy, size)
    return ""


# --------------------------------------------------------------
# BRAND BANNER (wide hero banner per brand, 800x360)
# --------------------------------------------------------------
def brand_banner(brand):
    w, h = 800, 360
    uid = "-bb-" + brand["key"]
    parts = [svg_header(w, h), defs_common(brand, uid)]
    parts.append(f'<rect width="{w}" height="{h}" fill="url(#bg{uid})"/>')
    # starfield
    parts.append(stars(w, h, 80))
    # left glow
    parts.append(
        f'<circle cx="240" cy="{h/2:.0f}" r="280" fill="url(#glow{uid})"/>'
    )
    # decorative rays
    parts.append(rays(240, 180, 260, color=brand["accent"], n=18))
    # motif
    parts.append(render_motif(brand["motif"], 240, 180, 240, brand))
    # coins
    for (x, y, r) in [(560, 70, 34), (680, 220, 28), (620, 300, 22), (730, 140, 18)]:
        parts.append(coin(x, y, r))
    # title
    parts.append(
        f"""<g transform="translate(440 {h/2:.0f})">
          <text x="0" y="-10" font-family="Georgia, 'Times New Roman', serif" font-weight="900" font-size="64" fill="url(#gold{uid})" filter="url(#shadow{uid})">{brand["name"].upper()}</text>
          <text x="0" y="24" font-family="system-ui, sans-serif" font-weight="700" font-size="22" fill="{brand["accent"]}" opacity="0.9">{brand["subtitle"]}</text>
          <rect x="0" y="48" width="120" height="4" fill="url(#gold{uid})" rx="2"/>
          <text x="0" y="82" font-family="system-ui, sans-serif" font-weight="600" font-size="14" fill="#ffffff" opacity="0.75">6726.BET • PREMIUM</text>
        </g>"""
    )
    parts.append("</svg>")
    return "".join(parts)


# --------------------------------------------------------------
# GAME THUMBNAIL (square 400x400 per game, unique per id)
# --------------------------------------------------------------
def game_thumb(brand, index, name):
    """Generate a unique thumbnail per game — procedural composition."""
    w, h = 400, 400
    uid = f"-gt-{brand['key']}-{index}"
    random.seed(hash(brand["key"] + str(index)) & 0xFFFFFFFF)

    # Slightly shift palette per game
    shift = index / max(1, brand["count"])
    primary = brand["primary"]
    parts = [svg_header(w, h), defs_common(brand, uid)]
    parts.append(f'<rect width="{w}" height="{h}" fill="url(#bg{uid})"/>')

    # Unique background pattern per game
    pattern = index % 5
    if pattern == 0:
        # radial hotspot
        parts.append(
            f'<circle cx="{w/2}" cy="{h/2}" r="{w*0.6}" fill="url(#glow{uid})"/>'
        )
    elif pattern == 1:
        # concentric rings
        for i in range(5):
            r = (i + 1) * 40 + int(shift * 20)
            parts.append(
                f'<circle cx="{w/2}" cy="{h/2}" r="{r}" fill="none" stroke="{brand["accent"]}" stroke-width="2" opacity="{0.4 - i*0.06:.2f}"/>'
            )
    elif pattern == 2:
        # diagonal beams
        for i in range(6):
            a = (i * 30) + (index * 7) % 30
            parts.append(
                f'<rect x="-100" y="{i*60 - 50}" width="{w+200}" height="18" fill="{primary}" opacity="0.08" transform="rotate({a} {w/2} {h/2})"/>'
            )
    elif pattern == 3:
        # sparkle cluster
        for _ in range(25):
            x = random.uniform(0, w)
            y = random.uniform(0, h)
            parts.append(spark(x, y, random.uniform(4, 14), color=brand["accent"]))
    else:
        # confetti
        parts.append(confetti(w, h, [primary, brand["secondary"], brand["accent"]], 40))

    # Stars on top
    parts.append(stars(w, h, 30))

    # Rays behind motif
    parts.append(rays(w / 2, h / 2 - 20, int(140 + shift * 30), color=brand["accent"], n=14))

    # Motif centerpiece (bigger, unique tint per game)
    motif_brand = dict(brand)
    parts.append(render_motif(brand["motif"], w / 2, h / 2 - 20, 220, motif_brand))

    # Corner coins / gems
    parts.append(coin(70, 70, 26))
    parts.append(coin(w - 70, 70, 22))
    parts.append(coin(80, h - 80, 18))
    parts.append(gem(w - 60, h - 70, 22, color=brand["primary"]))

    # Title bar
    parts.append(
        f"""<g transform="translate(0 {h-90})">
          <rect x="0" y="0" width="{w}" height="90" fill="rgba(0,0,0,0.55)"/>
          <rect x="0" y="0" width="{w}" height="3" fill="url(#gold{uid})"/>
          <text x="{w/2}" y="38" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="24" fill="url(#gold{uid})" filter="url(#shadow{uid})">{name.upper()}</text>
          <text x="{w/2}" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="13" fill="#ffffff" opacity="0.85">{brand["name"].upper()} • 6726.BET</text>
        </g>"""
    )

    parts.append("</svg>")
    return "".join(parts)


# --------------------------------------------------------------
# HOME CAROUSEL HERO BANNERS (1200x420)
# --------------------------------------------------------------
def hero_banner(title, subtitle, tagline, motif_fn_key, palette, btn_label="JOGAR AGORA"):
    w, h = 1200, 420
    uid = "-hero-" + str(abs(hash(title)) % 99999)
    bf, bt, p, s, a = palette
    parts = [svg_header(w, h)]
    parts.append(
        f"""<defs>
      <linearGradient id="bg{uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="{bf}"/>
        <stop offset="100%" stop-color="{bt}"/>
      </linearGradient>
      <radialGradient id="glow{uid}" cx="70%" cy="50%" r="60%">
        <stop offset="0%" stop-color="{p}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="gold{uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="{a}"/>
        <stop offset="100%" stop-color="{p}"/>
      </linearGradient>
      <filter id="shadow{uid}"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.55"/></filter>
    </defs>"""
    )
    parts.append(f'<rect width="{w}" height="{h}" fill="url(#bg{uid})"/>')
    parts.append(stars(w, h, 100))
    parts.append(f'<circle cx="{w*0.75}" cy="{h/2}" r="{h*0.7}" fill="url(#glow{uid})"/>')
    # Decorative coins
    for (x, y, r) in [(880, 80, 32), (1020, 180, 40), (960, 310, 26), (1100, 240, 20), (820, 220, 18)]:
        parts.append(coin(x, y, r))
    # Motif on right side
    mock_brand = {"primary": p, "secondary": s, "accent": a, "motif": motif_fn_key,
                  "bg_from": bf, "bg_to": bt}
    parts.append(render_motif(motif_fn_key, int(w * 0.72), int(h / 2), 260, mock_brand))
    # Left content
    parts.append(
        f"""<g transform="translate(80 {h/2 - 40})">
          <text x="0" y="-60" font-family="system-ui" font-weight="700" font-size="16" fill="{a}" letter-spacing="3">{tagline.upper()}</text>
          <text x="0" y="0" font-family="Georgia, serif" font-weight="900" font-size="72" fill="url(#gold{uid})" filter="url(#shadow{uid})">{title.upper()}</text>
          <text x="0" y="40" font-family="system-ui" font-weight="500" font-size="22" fill="#ffffff" opacity="0.85">{subtitle}</text>
          <g transform="translate(0 70)">
            <rect width="220" height="56" rx="28" fill="url(#gold{uid})" filter="url(#shadow{uid})"/>
            <text x="110" y="36" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="18" fill="{bf}">{btn_label}</text>
          </g>
        </g>"""
    )
    parts.append("</svg>")
    return "".join(parts)


# --------------------------------------------------------------
# ICONS (32x32 SVG line icons — premium style)
# --------------------------------------------------------------
def icon_home(color="#ffd65a"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" fill="{color}" fill-opacity="0.15"/>
    </svg>"""


def icon_gift(color="#ff3d85"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="8" width="18" height="13" rx="1.5" fill="{color}" fill-opacity="0.15"/>
      <path d="M12 8v13"/>
      <path d="M3 12h18"/>
      <path d="M7 8c-2 0-3-1-3-2.5S5 3 6.5 3C9 3 12 8 12 8"/>
      <path d="M17 8c2 0 3-1 3-2.5S19 3 17.5 3C15 3 12 8 12 8"/>
    </svg>"""


def icon_crown(color="#ffd65a"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">
      <path d="M3 8l3 9h12l3-9-5 3-4-6-4 6z" fill="{color}" fill-opacity="0.2"/>
      <circle cx="3" cy="8" r="1.3" fill="{color}"/>
      <circle cx="21" cy="8" r="1.3" fill="{color}"/>
      <circle cx="12" cy="5" r="1.3" fill="{color}"/>
      <path d="M5 20h14" stroke-linecap="round"/>
    </svg>"""


def icon_user(color="#22d3ee"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4" fill="{color}" fill-opacity="0.2"/>
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>
    </svg>"""


def icon_wallet(color="#22c55e"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" fill="{color}" fill-opacity="0.15"/>
      <rect x="3" y="7" width="18" height="13" rx="2" fill="{color}" fill-opacity="0.15"/>
      <circle cx="17" cy="13.5" r="1.5" fill="{color}"/>
    </svg>"""


def icon_plus(color="#ffd65a"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>"""


def icon_arrow_up_right(color="#ff3d85"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 17L17 7"/>
      <path d="M8 7h9v9"/>
    </svg>"""


def icon_chat(color="#22d3ee"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">
      <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2z" fill="{color}" fill-opacity="0.15"/>
    </svg>"""


def icon_star(color="#ffd65a"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{color}" stroke="{color}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z" fill-opacity="0.8"/>
    </svg>"""


def icon_lightning(color="#fbbf24"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{color}" stroke="{color}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M13 2L4 14h7l-2 8 9-12h-7z" fill-opacity="0.85"/>
    </svg>"""


def icon_flame(color="#ef4444"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{color}" stroke="{color}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-3 3-3 5 0-3-2-5-2-8-3 2-6 5-6 10 0 4 3 7 7 7z" fill-opacity="0.85"/>
    </svg>"""


def icon_settings(color="#9ca3af"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3" fill="{color}" fill-opacity="0.2"/>
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
    </svg>"""


def icon_logout(color="#ef4444"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/>
      <path d="M10 17l-5-5 5-5"/>
      <path d="M5 12h12"/>
    </svg>"""


def icon_slot(color="#ff3d85"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="{color}" fill-opacity="0.15"/>
      <rect x="5" y="8" width="4" height="8" rx="0.5" fill="{color}" fill-opacity="0.3"/>
      <rect x="10" y="8" width="4" height="8" rx="0.5" fill="{color}" fill-opacity="0.3"/>
      <rect x="15" y="8" width="4" height="8" rx="0.5" fill="{color}" fill-opacity="0.3"/>
    </svg>"""


def icon_trophy(color="#ffd65a"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 21h8"/>
      <path d="M12 17v4"/>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" fill="{color}" fill-opacity="0.2"/>
      <path d="M17 6h3a0 0 0 0 1 0 0v2a3 3 0 0 1-3 3"/>
      <path d="M7 6H4a0 0 0 0 0 0 0v2a3 3 0 0 0 3 3"/>
    </svg>"""


ICONS = {
    "home": icon_home,
    "gift": icon_gift,
    "crown": icon_crown,
    "user": icon_user,
    "wallet": icon_wallet,
    "plus": icon_plus,
    "arrow-up-right": icon_arrow_up_right,
    "chat": icon_chat,
    "star": icon_star,
    "lightning": icon_lightning,
    "flame": icon_flame,
    "settings": icon_settings,
    "logout": icon_logout,
    "slot": icon_slot,
    "trophy": icon_trophy,
}


# --------------------------------------------------------------
# AVATARS (stylized humanoid, 160x160)
# --------------------------------------------------------------
AVATAR_PALETTES = [
    ("#1e293b", "#334155", "#f59e0b", "#fcd34d", "#fff7ed"),  # midnight / gold
    ("#4c1d95", "#6d28d9", "#ec4899", "#f9a8d4", "#fdf2f8"),  # violet / pink
    ("#064e3b", "#047857", "#fbbf24", "#fde68a", "#ecfdf5"),  # emerald / amber
    ("#7c2d12", "#c2410c", "#fde68a", "#fcd34d", "#fff7ed"),  # rust / honey
    ("#164e63", "#0891b2", "#22d3ee", "#a5f3fc", "#ecfeff"),  # teal / cyan
    ("#3b0764", "#7e22ce", "#a855f7", "#e9d5ff", "#faf5ff"),  # deep violet
    ("#7f1d1d", "#dc2626", "#fbbf24", "#fde68a", "#fef2f2"),  # ruby
    ("#1e3a8a", "#2563eb", "#60a5fa", "#bfdbfe", "#eff6ff"),  # azure
    ("#365314", "#65a30d", "#bef264", "#d9f99d", "#f7fee7"),  # lime
    ("#1c1917", "#404040", "#f5f5f4", "#fafaf9", "#ffffff"),  # slate
    ("#0f172a", "#1e293b", "#10b981", "#34d399", "#d1fae5"),  # night green
    ("#831843", "#be185d", "#f9a8d4", "#fce7f3", "#fdf2f8"),  # rose
]


def avatar(index=0, initials="A"):
    palette = AVATAR_PALETTES[index % len(AVATAR_PALETTES)]
    bg1, bg2, accent, hi, skin = palette
    w, h = 160, 160
    uid = "-av-" + str(index)
    # random hair & hat variations (deterministic per index)
    r = random.Random(6726 + index)
    hair_style = r.choice(["short", "bun", "wave", "cap", "crown"])
    has_glasses = r.random() < 0.3

    parts = [svg_header(w, h)]
    parts.append(
        f"""<defs>
      <linearGradient id="bg{uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="{bg1}"/>
        <stop offset="100%" stop-color="{bg2}"/>
      </linearGradient>
      <radialGradient id="glow{uid}" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="{accent}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="clip{uid}"><circle cx="80" cy="80" r="78"/></clipPath>
    </defs>"""
    )
    parts.append(f'<circle cx="80" cy="80" r="80" fill="url(#bg{uid})"/>')
    parts.append(f'<circle cx="80" cy="80" r="80" fill="url(#glow{uid})"/>')
    # body — shoulders
    parts.append(f'<g clip-path="url(#clip{uid})">')
    parts.append(f'<ellipse cx="80" cy="165" rx="80" ry="45" fill="{accent}" opacity="0.95"/>')
    # neck
    parts.append(f'<rect x="70" y="100" width="20" height="22" fill="{skin}" opacity="0.9"/>')
    # head
    parts.append(f'<ellipse cx="80" cy="82" rx="34" ry="38" fill="{skin}"/>')
    # hair
    if hair_style == "short":
        parts.append(f'<path d="M46 70 Q50 42 80 42 Q110 42 114 70 Q114 60 80 52 Q52 60 46 70 Z" fill="{bg1}"/>')
    elif hair_style == "bun":
        parts.append(f'<circle cx="80" cy="42" r="14" fill="{bg1}"/>')
        parts.append(f'<path d="M48 70 Q52 48 80 48 Q108 48 112 70 Z" fill="{bg1}"/>')
    elif hair_style == "wave":
        parts.append(f'<path d="M44 72 Q50 30 80 40 Q110 30 116 72 Q100 54 80 60 Q60 54 44 72 Z" fill="{bg1}"/>')
    elif hair_style == "cap":
        parts.append(f'<path d="M46 70 Q46 38 80 38 Q114 38 114 70 L114 75 L46 75 Z" fill="{accent}"/>')
        parts.append(f'<rect x="38" y="70" width="84" height="8" fill="{bg1}" rx="3"/>')
    else:  # crown
        parts.append(f'<path d="M50 60 L56 40 L66 55 L80 38 L94 55 L104 40 L110 60 Z" fill="{hi}"/>')
        parts.append(f'<rect x="50" y="60" width="60" height="6" fill="{accent}"/>')
    # eyes
    parts.append(f'<ellipse cx="70" cy="85" rx="3.5" ry="4.5" fill="{bg1}"/>')
    parts.append(f'<ellipse cx="90" cy="85" rx="3.5" ry="4.5" fill="{bg1}"/>')
    parts.append(f'<circle cx="71" cy="84" r="1" fill="#fff"/>')
    parts.append(f'<circle cx="91" cy="84" r="1" fill="#fff"/>')
    # eyebrows
    parts.append(f'<path d="M64 78 Q70 75 76 78" stroke="{bg1}" stroke-width="2" fill="none" stroke-linecap="round"/>')
    parts.append(f'<path d="M84 78 Q90 75 96 78" stroke="{bg1}" stroke-width="2" fill="none" stroke-linecap="round"/>')
    # glasses
    if has_glasses:
        parts.append(f'<circle cx="70" cy="85" r="8" fill="none" stroke="{bg1}" stroke-width="1.5"/>')
        parts.append(f'<circle cx="90" cy="85" r="8" fill="none" stroke="{bg1}" stroke-width="1.5"/>')
        parts.append(f'<line x1="78" y1="85" x2="82" y2="85" stroke="{bg1}" stroke-width="1.5"/>')
    # nose
    parts.append(f'<path d="M80 88 Q78 94 80 97 Q82 94 80 88" fill="none" stroke="{bg1}" stroke-width="1" opacity="0.5"/>')
    # mouth
    parts.append(f'<path d="M72 104 Q80 110 88 104" stroke="{bg1}" stroke-width="2" fill="none" stroke-linecap="round"/>')
    parts.append("</g>")
    # border ring
    parts.append(f'<circle cx="80" cy="80" r="78" fill="none" stroke="{accent}" stroke-width="3" opacity="0.8"/>')
    parts.append("</svg>")
    return "".join(parts)


# --------------------------------------------------------------
# VIP BADGES (11 levels, 120x120)
# --------------------------------------------------------------
def vip_badge(level, label):
    palettes = [
        ("#713f12", "#a16207", "#fbbf24"),  # bronze
        ("#64748b", "#94a3b8", "#e2e8f0"),  # silver
        ("#a16207", "#eab308", "#fde047"),  # gold
        ("#0e7490", "#06b6d4", "#a5f3fc"),  # platinum
        ("#1d4ed8", "#3b82f6", "#93c5fd"),  # sapphire
        ("#991b1b", "#dc2626", "#fecaca"),  # ruby
        ("#14532d", "#16a34a", "#86efac"),  # emerald
        ("#075985", "#0284c7", "#bae6fd"),  # diamond
        ("#4c1d95", "#7c3aed", "#c4b5fd"),  # master
        ("#9a3412", "#ea580c", "#fed7aa"),  # legendary
        ("#111827", "#6b7280", "#d1d5db"),  # eternal
    ]
    base, mid, light = palettes[min(level, len(palettes) - 1)]
    w, h = 120, 120
    uid = "-vip-" + str(level)
    parts = [svg_header(w, h)]
    parts.append(
        f"""<defs>
      <radialGradient id="g{uid}" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="{light}"/>
        <stop offset="60%" stop-color="{mid}"/>
        <stop offset="100%" stop-color="{base}"/>
      </radialGradient>
      <filter id="s{uid}"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.55"/></filter>
    </defs>"""
    )
    # shield
    parts.append(
        f'<path d="M60 6 L112 24 L104 84 Q94 106 60 116 Q26 106 16 84 L8 24 Z" fill="url(#g{uid})" stroke="{light}" stroke-width="2" filter="url(#s{uid})"/>'
    )
    # inner ring
    parts.append(
        f'<path d="M60 18 L100 32 L94 78 Q86 94 60 102 Q34 94 26 78 L20 32 Z" fill="none" stroke="{light}" stroke-width="1.5" opacity="0.6"/>'
    )
    # level number
    parts.append(
        f'<text x="60" y="62" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="42" fill="#ffffff" filter="url(#s{uid})">{level}</text>'
    )
    parts.append(
        f'<text x="60" y="84" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="12" fill="#ffffff" opacity="0.85" letter-spacing="2">{label.upper()}</text>'
    )
    # sparkles
    parts.append(spark(35, 30, 6, color=light))
    parts.append(spark(90, 28, 5, color=light))
    parts.append(spark(96, 70, 4, color=light))
    parts.append("</svg>")
    return "".join(parts)


# --------------------------------------------------------------
# UI DECORATIONS (loading ring, section bg)
# --------------------------------------------------------------
def loading_coin():
    w = h = 120
    return f"""{svg_header(w,h)}
      <defs>
        <linearGradient id="lc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffd65a"/>
          <stop offset="100%" stop-color="#b57e05"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#lc)" stroke="#7a5100" stroke-width="4"/>
      <circle cx="60" cy="60" r="38" fill="none" stroke="#7a5100" stroke-width="3" stroke-dasharray="4 6"/>
      <text x="60" y="78" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="48" fill="#7a5100">$</text>
    </svg>"""


def logo_mark():
    # Premium logo mark for splash
    w, h = 280, 90
    return f"""{svg_header(w,h)}
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fde68a"/>
          <stop offset="50%" stop-color="#ffd65a"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <filter id="ls"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.6"/></filter>
      </defs>
      <text x="0" y="60" font-family="Georgia, serif" font-weight="900" font-size="60" fill="url(#lg)" filter="url(#ls)">6726</text>
      <text x="148" y="60" font-family="Georgia, serif" font-weight="900" font-size="60" fill="#ff3d85" filter="url(#ls)">.</text>
      <text x="168" y="60" font-family="Georgia, serif" font-weight="900" font-size="60" fill="#ffffff" filter="url(#ls)">Bet</text>
      <text x="2" y="82" font-family="system-ui, sans-serif" font-weight="600" font-size="11" fill="#ffd65a" letter-spacing="3" opacity="0.75">PREMIUM BETTING PLATFORM</text>
    </svg>"""


# --------------------------------------------------------------
# WRITE ALL
# --------------------------------------------------------------
def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


# Game names must match the JS game-id mapping. We use the brand index mapping from games.*.js.
GAME_NAME_LISTS = {
    "tiger": [
        "Fortune", "Golden", "Roar", "Jungle", "Prince", "King", "Wild", "Blaze", "Shadow", "Thunder",
        "Sunrise", "Moon", "Crystal", "Neon", "Rush", "Storm", "Empire", "Lightning", "Fire", "Diamond",
        "Sapphire", "Ruby", "Emerald", "Legacy", "Mega", "Ultra", "Supreme", "Eternal", "Sovereign", "Midas",
    ],
    "rabbit": [
        "Hop", "Lucky", "Gold", "Moon", "Cherry", "Star", "Harvest", "Clover", "Dream", "Rush",
        "Magic", "Fortune", "Aurora", "Rainbow", "Blossom", "Jade", "Meadow", "Bright", "Dawn", "Shine",
        "Sparkle", "Glitter", "Pearl", "Diamond", "Royal", "Empire", "Legend", "Mystic", "Eternal", "Celestial",
    ],
    "tigrinho": [
        "Clássico", "Bônus", "Mega", "Super", "Ultra", "Gold", "Fortuna", "Diamante", "Imperial", "Dourado",
        "Fortune", "Flaming", "Neon", "Rush", "Coin", "Lightning", "Stars", "Power", "King", "Royal",
        "Legend", "Mystic", "Supreme", "Magic", "Roar", "Blaze", "Midas", "Eternal", "Sovereign", "Grand",
    ],
    "pg": [
        "Genie", "Lotus", "Jewels", "Empire", "Dragons", "Mystic", "Fortune", "Oracle", "Legacy", "Royal",
        "Neon", "Stars", "Fortune", "Prosperity", "Magic", "Lantern", "Golden", "Temple", "Treasure", "Kingdom",
        "Rush", "Storm", "Aurora", "Mirage", "Odyssey", "Voyager", "Phoenix", "Titan", "Sovereign", "Cruise Royale",
    ],
    "spin": [
        "Classic", "Neon", "Rush", "Turbo", "Cosmic", "Galaxy", "Nebula", "Quasar", "Pulse", "Volt",
        "Electric", "Plasma", "Aurora", "Orbit", "Comet", "Meteor", "Supernova", "Prism", "Vortex", "Hyper",
        "Cyber", "Retro", "Arcade", "Phantom", "Mirage", "Eclipse", "Zenith", "Nova", "Ignition", "Warp",
    ],
    "dragon": [
        "Emperor", "Legacy", "Storm", "Flame", "Ancient", "Myth", "Sacred", "Golden", "Imperial", "Shadow",
        "Crimson", "Ember", "Volcano", "Phoenix", "Tempest", "Thunder", "Legend", "Saga", "Monarch", "Sovereign",
        "Oracle", "Pearl", "Jade", "Obsidian", "Celestial", "Mystic", "Eternal", "Warlord", "Champion", "Abyss",
    ],
    "fortune": [
        "Gold Rush", "Treasure", "Coin", "Pot of Gold", "Mega Cash", "Jackpot", "Vault", "Royal", "Prosperity", "Cash Drop",
        "Wheel", "Lucky 7", "Big Win", "Mystic", "Magic", "Rainbow", "Lantern", "Tycoon", "Empire", "Majestic",
        "Gems", "Diamond", "Stars", "Aurora", "Phoenix", "Legend", "Dynasty", "Saga", "Crown", "Infinity",
    ],
}


def main():
    # Brand banners
    for b in BRANDS:
        write(OUT / "brands" / f"{b['key']}.svg", brand_banner(b))

    # Game thumbnails
    for b in BRANDS:
        names = GAME_NAME_LISTS.get(b["key"], [f"Game {i+1}" for i in range(30)])
        for i in range(b["count"]):
            gid = f"{b['key']}-{str(i+1).zfill(2)}"
            game_name = f"{b['name']} {names[i]}"
            write(OUT / "games" / f"{gid}.svg", game_thumb(b, i, game_name))

    # Home carousel
    heroes = [
        hero_banner(
            "Tigrinho Gold",
            "Depósito mínimo de R$ 0,10 — prêmios até 50x!",
            "Destaque da semana",
            "tiger",
            ("#3b2a05", "#0a0a12", "#ffd65a", "#ff8a1f", "#fff7ed"),
            btn_label="GIRAR AGORA",
        ),
        hero_banner(
            "Dragon Emperor",
            "Multiplicadores colossais na linha de pagamento",
            "Sala VIP",
            "dragon",
            ("#3b0b0b", "#0a0a12", "#ef4444", "#b91c1c", "#fecaca"),
            btn_label="JOGAR",
        ),
        hero_banner(
            "Fortune Rush",
            "Bônus de cadastro automático + giros diários",
            "Novo",
            "coin",
            ("#0b3b1a", "#0a0a12", "#22c55e", "#16a34a", "#bbf7d0"),
            btn_label="RESGATAR",
        ),
        hero_banner(
            "SPIN Neon",
            "Gráficos neon, alta volatilidade, mega prêmios",
            "Recomendado",
            "spiral",
            ("#2a0b3b", "#0a0a12", "#a855f7", "#ec4899", "#fdf2f8"),
            btn_label="DESCOBRIR",
        ),
    ]
    for i, svg in enumerate(heroes):
        write(OUT / "banners" / f"hero-{i+1}.svg", svg)

    # Icons
    for name, fn in ICONS.items():
        write(OUT / "icons" / f"{name}.svg", fn())

    # Avatars
    for i in range(16):
        write(OUT / "profiles" / f"avatar-{str(i+1).zfill(2)}.svg", avatar(i))

    # VIP badges
    names = ["Bronze", "Prata", "Ouro", "Platina", "Safira", "Rubi", "Esmeralda", "Diamante", "Mestre", "Lendário", "Eterno"]
    for i, n in enumerate(names):
        write(OUT / "ui" / f"vip-{str(i).zfill(2)}.svg", vip_badge(i, n))

    # UI extras
    write(OUT / "ui" / "loading-coin.svg", loading_coin())
    write(OUT / "ui" / "logo.svg", logo_mark())

    # Mini fav (emblem)
    write(OUT / "ui" / "emblem.svg",
          f"""{svg_header(64,64)}
          <defs>
            <linearGradient id="e" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ffd65a"/>
              <stop offset="100%" stop-color="#ff3d85"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="url(#e)"/>
          <text x="32" y="42" text-anchor="middle" font-family="Georgia" font-weight="900" font-size="22" fill="#0a0a12">67</text>
        </svg>""")

    # Count
    total = sum(1 for p in OUT.rglob("*.svg"))
    print(f"Generated {total} SVG assets in {OUT}")


if __name__ == "__main__":
    main()
