// ───────────────────────────────────────────────────────────────────────────
// Shared overlay CARD theme system — used by every card-based overlay
// (gift-alert, last-x, leaderboard, chart, chat, event-feed, subathon, wheel).
// Same 12 premium looks as the goal bar, generalised to any content card.
//   <div class="ov-card <theme>" style="--bar:#ff2eb8;--radius:16px">…</div>
// Inside, use .ov-title / .ov-sub / .ov-accent / var(--accent) for theme colours.
// ───────────────────────────────────────────────────────────────────────────

export type OverlayTheme =
    | 'neon' | 'aurora' | 'fire' | 'holo' | 'gold' | 'cyber'
    | 'galaxy' | 'synth' | 'glass' | 'candy' | 'electric' | 'minimal'

export const OVERLAY_THEMES: OverlayTheme[] = [
    'neon', 'aurora', 'fire', 'holo', 'gold', 'cyber',
    'galaxy', 'synth', 'glass', 'candy', 'electric', 'minimal',
]

export function normalizeOverlayTheme(t?: string): OverlayTheme {
    const v = (t || '').toLowerCase()
    if ((OVERLAY_THEMES as string[]).includes(v)) return v as OverlayTheme
    if (v === 'gaming') return 'cyber'
    if (v === 'gradient') return 'holo'
    return 'neon'
}

// Best "accent" colour per theme for medals / highlights / numbers when a
// component needs a concrete colour (not a CSS var). barColor wins for the
// themes that honour it.
export function overlayAccent(theme: OverlayTheme, barColor?: string): string {
    switch (theme) {
        case 'aurora': return '#48f0c8'
        case 'fire': return '#ff8c42'
        case 'holo': return '#ff5fd0'
        case 'gold': return '#ffd700'
        case 'cyber': return '#22d3ee'
        case 'galaxy': return '#c4a0ff'
        case 'synth': return '#ff79c6'
        case 'candy': return '#ff5fa2'
        default: return barColor || '#ff2eb8' // neon, glass, electric, minimal
    }
}

export const OVERLAY_THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Bricolage+Grotesque:wght@600;800&family=Inter:wght@600;700;800;900&family=JetBrains+Mono:wght@700&family=Orbitron:wght@700;900&family=Playfair+Display:wght@700;900&display=swap');
.ov-card,.ov-card *{box-sizing:border-box}
.ov-card{--bar:#ff2eb8;--accent:var(--bar);position:relative;padding:16px 20px;border-radius:var(--radius,16px);
   overflow:hidden;font-family:'Inter',sans-serif;isolation:isolate;color:#fff;transition:transform .3s ease}
.ov-title{font-weight:800;letter-spacing:.3px;line-height:1.1}
.ov-sub{font-weight:600;opacity:.7}
.ov-accent{color:var(--accent)}
.ov-pop{animation:ovPop .55s ease}
@keyframes ovPop{0%,100%{transform:scale(1)}38%{transform:scale(1.04)}}
.ov-shine{position:relative}
.ov-shine::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.4) 50%,transparent 80%);background-size:220% 100%;animation:ovSweep 2.6s linear infinite;pointer-events:none;mix-blend-mode:overlay}
@keyframes ovSweep{0%{background-position:200% 0}100%{background-position:-120% 0}}
@keyframes ovFlow{0%{background-position:0 0}100%{background-position:300% 0}}

/* 1 NEON */
.ov-card.neon{background:rgba(8,3,15,.74);border:1px solid color-mix(in srgb,var(--bar) 45%,transparent);box-shadow:0 0 26px color-mix(in srgb,var(--bar) 38%,transparent),inset 0 0 22px color-mix(in srgb,var(--bar) 10%,transparent);animation:ovNeon 2.6s ease-in-out infinite}
@keyframes ovNeon{0%,100%{box-shadow:0 0 22px color-mix(in srgb,var(--bar) 30%,transparent),inset 0 0 18px color-mix(in srgb,var(--bar) 8%,transparent)}50%{box-shadow:0 0 40px color-mix(in srgb,var(--bar) 55%,transparent),inset 0 0 26px color-mix(in srgb,var(--bar) 14%,transparent)}}
.ov-card.neon .ov-title{text-shadow:0 0 10px color-mix(in srgb,var(--bar) 70%,transparent)}
/* 2 AURORA */
.ov-card.aurora{--accent:#48f0c8;background:rgba(6,12,20,.8);border:1px solid rgba(120,255,220,.22);box-shadow:0 0 30px rgba(70,200,255,.22)}
.ov-card.aurora .ov-title{text-shadow:0 0 12px rgba(80,255,210,.45)}
/* 3 FIRE */
.ov-card.fire{--accent:#ff8c42;background:rgba(18,6,2,.84);border:1px solid rgba(255,110,30,.3);box-shadow:0 0 30px rgba(255,90,20,.3)}
.ov-card.fire .ov-title{text-shadow:0 0 10px rgba(255,120,40,.6)}
/* 4 HOLO */
.ov-card.holo{--accent:#ff5fd0;background:rgba(10,8,18,.82);border:1px solid rgba(255,255,255,.18);box-shadow:0 0 28px rgba(180,120,255,.3)}
.ov-card.holo .ov-title{background:linear-gradient(90deg,#ff2ec4,#a855f7,#22d3ee,#ff2ec4);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:ovFlow 4s linear infinite}
/* 5 GOLD */
.ov-card.gold{--accent:#ffd700;background:linear-gradient(135deg,rgba(40,30,4,.92),rgba(20,15,2,.92));border:1px solid rgba(255,215,0,.35);box-shadow:0 0 26px rgba(255,200,0,.25)}
.ov-card.gold .ov-title{font-family:'Playfair Display',serif;text-shadow:0 0 8px rgba(255,200,0,.45)}
/* 6 CYBER */
.ov-card.cyber{--accent:#22d3ee;background:rgba(4,8,14,.86);border:1px solid rgba(34,211,238,.4);box-shadow:0 0 24px rgba(34,211,238,.3),0 0 24px rgba(255,46,184,.15)}
.ov-card.cyber .ov-title{font-family:'Orbitron',sans-serif;letter-spacing:1px;text-transform:uppercase;text-shadow:0 0 8px rgba(34,211,238,.6)}
/* 7 GALAXY */
.ov-card.galaxy{--accent:#c4a0ff;background:radial-gradient(ellipse at 30% 0%,rgba(80,40,150,.5),rgba(5,3,15,.93) 70%);border:1px solid rgba(168,85,247,.3);box-shadow:0 0 30px rgba(120,60,255,.3)}
.ov-card.galaxy::before{content:'';position:absolute;inset:0;background-image:radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 70%,#fff,transparent),radial-gradient(1px 1px at 80% 20%,#cbb3ff,transparent),radial-gradient(1px 1px at 40% 80%,#fff,transparent),radial-gradient(1px 1px at 90% 50%,#fff,transparent);animation:ovTwinkle 3s ease-in-out infinite;opacity:.75;z-index:0;pointer-events:none}
@keyframes ovTwinkle{0%,100%{opacity:.45}50%{opacity:.9}}
.ov-card.galaxy>*{position:relative;z-index:1}
.ov-card.galaxy .ov-title{text-shadow:0 0 12px rgba(168,85,247,.65)}
/* 8 SYNTH */
.ov-card.synth{--accent:#ff79c6;background:linear-gradient(180deg,rgba(30,8,40,.93),rgba(10,4,30,.93));border:1px solid rgba(255,46,136,.35);box-shadow:0 0 28px rgba(255,46,136,.3)}
.ov-card.synth .ov-title{font-family:'Orbitron',sans-serif;background:linear-gradient(180deg,#fff,#ff8fe0 60%,#7a3bff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 18px rgba(255,46,136,.35)}
/* 9 GLASS */
.ov-card.glass{--accent:var(--bar);background:rgba(255,255,255,.1);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);border:1px solid rgba(255,255,255,.22);box-shadow:0 8px 32px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3)}
/* 10 CANDY */
.ov-card.candy{--accent:#ff5fa2;background:rgba(255,240,248,.12);border:1px solid rgba(255,150,200,.4);box-shadow:0 0 24px rgba(255,110,170,.3)}
.ov-card.candy .ov-title{text-shadow:0 2px 6px rgba(255,80,150,.45)}
/* 11 ELECTRIC */
.ov-card.electric{--accent:var(--bar);background:rgba(3,8,20,.86);border:1px solid color-mix(in srgb,var(--bar) 40%,transparent);box-shadow:0 0 26px color-mix(in srgb,var(--bar) 35%,transparent)}
.ov-card.electric .ov-title{text-shadow:0 0 12px color-mix(in srgb,var(--bar) 80%,transparent)}
/* 12 MINIMAL */
.ov-card.minimal{--accent:var(--bar);background:rgba(15,12,22,.6);border:1px solid rgba(255,255,255,.1)}

/* shared celebratory glow for "win"/complete states */
.ov-glow{animation:ovGlow 2s ease-in-out infinite}
@keyframes ovGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
`
