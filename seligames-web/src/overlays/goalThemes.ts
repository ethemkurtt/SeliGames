// ───────────────────────────────────────────────────────────────────────────
// Canonical goal-overlay theme system (shared by the web overlay + mirrored in
// the desktop app preview).  12 premium animated presets.  The container is
// `.sg <theme>`; the primary colour comes from the --bar CSS variable so users
// can still recolour neon/minimal/glass/electric themes.
// ───────────────────────────────────────────────────────────────────────────

export type GoalTheme =
    | 'neon' | 'aurora' | 'fire' | 'holo' | 'gold' | 'cyber'
    | 'galaxy' | 'synth' | 'glass' | 'candy' | 'electric' | 'minimal'

export const GOAL_THEMES: GoalTheme[] = [
    'neon', 'aurora', 'fire', 'holo', 'gold', 'cyber',
    'galaxy', 'synth', 'glass', 'candy', 'electric', 'minimal',
]

// Map legacy/unknown theme names onto the new set so old saved overlays still
// render something nice.
export function normalizeGoalTheme(t?: string): GoalTheme {
    const v = (t || '').toLowerCase()
    if ((GOAL_THEMES as string[]).includes(v)) return v as GoalTheme
    if (v === 'gaming') return 'cyber'
    if (v === 'gradient') return 'holo'
    return 'neon'
}

export const GOAL_THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Bricolage+Grotesque:wght@600;800&family=Inter:wght@600;700;800;900&family=JetBrains+Mono:wght@700&family=Orbitron:wght@700;900&family=Playfair+Display:wght@700;900&display=swap');
.sg *{margin:0;padding:0;box-sizing:border-box}
.sg{--bar:#ff2eb8;--accent:var(--bar);position:relative;padding:16px 20px;border-radius:var(--radius,16px);
   min-width:300px;max-width:640px;overflow:hidden;font-family:'Inter',sans-serif;isolation:isolate;
   transition:transform .3s ease}
.sg-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:11px;gap:12px;position:relative;z-index:3}
.sg-title{font-weight:800;letter-spacing:.2px;line-height:1.05}
.sg-nums{font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;opacity:.96}
.sg-track{position:relative;height:24px;border-radius:var(--radius,12px);overflow:hidden;background:rgba(255,255,255,.07);
   box-shadow:inset 0 1px 3px rgba(0,0,0,.5);z-index:2}
.sg-fill{position:absolute;left:0;top:0;bottom:0;border-radius:var(--radius,12px);overflow:hidden}
.sg-fill.smooth{transition:width 1.1s cubic-bezier(.22,1,.36,1)}
.sg-fill.bounce{transition:width .85s cubic-bezier(.68,-0.55,.265,1.55)}
.sg-fill.pulse{transition:width .5s ease}
.sg.celebrate{animation:sgPop .6s ease}
@keyframes sgPop{0%,100%{transform:scale(1)}40%{transform:scale(1.035)}}
.sg-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
   font-size:12px;font-weight:900;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.95);letter-spacing:.5px;z-index:4}
.shine::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.5) 50%,transparent 80%);
   background-size:220% 100%;animation:sgSweep 2.4s linear infinite;mix-blend-mode:overlay}
@keyframes sgSweep{0%{background-position:200% 0}100%{background-position:-120% 0}}
.sg-tip{position:absolute;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;
   background:#fff;filter:blur(.5px);box-shadow:0 0 10px 3px var(--accent);z-index:5;animation:sgTip 1.4s ease-in-out infinite;pointer-events:none}
@keyframes sgTip{0%,100%{opacity:.7;transform:translateY(-50%) scale(.85)}50%{opacity:1;transform:translateY(-50%) scale(1.25)}}

/* completion badge + celebration */
.sg-done-badge{position:relative;z-index:3;text-align:center;margin-top:9px;font-size:12px;font-weight:900;
   letter-spacing:3px;color:var(--accent);text-shadow:0 0 12px var(--accent);animation:sgBadge 1.6s ease-in-out infinite}
@keyframes sgBadge{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
.sg.is-done{animation:sgDoneGlow 2s ease-in-out infinite}
@keyframes sgDoneGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
.sg-confetti{position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden}
.sg-confetti span{position:absolute;top:-12px;width:7px;height:11px;border-radius:2px;opacity:0;
   animation:sgConf 1.7s ease-in forwards}
@keyframes sgConf{0%{opacity:0;transform:translateY(-10px) rotate(0)}10%{opacity:1}100%{opacity:0;transform:translateY(150px) rotate(420deg)}}

/* 1 NEON PULSE */
.sg.neon{background:rgba(8,3,15,.72);border:1px solid color-mix(in srgb,var(--bar) 45%,transparent);
   box-shadow:0 0 26px color-mix(in srgb,var(--bar) 38%,transparent),inset 0 0 22px color-mix(in srgb,var(--bar) 10%,transparent);animation:sgNeon 2.6s ease-in-out infinite}
@keyframes sgNeon{0%,100%{box-shadow:0 0 22px color-mix(in srgb,var(--bar) 30%,transparent),inset 0 0 18px color-mix(in srgb,var(--bar) 8%,transparent)}50%{box-shadow:0 0 40px color-mix(in srgb,var(--bar) 55%,transparent),inset 0 0 26px color-mix(in srgb,var(--bar) 14%,transparent)}}
.sg.neon .sg-title{color:#fff;text-shadow:0 0 10px color-mix(in srgb,var(--bar) 70%,transparent)}
.sg.neon .sg-nums{color:var(--bar);text-shadow:0 0 8px color-mix(in srgb,var(--bar) 80%,transparent)}
.sg.neon .sg-fill{background:linear-gradient(90deg,var(--bar),color-mix(in srgb,var(--bar) 65%,#fff));box-shadow:0 0 18px var(--bar)}

/* 2 AURORA */
.sg.aurora{--accent:#48f0c8;background:rgba(6,12,20,.78);border:1px solid rgba(120,255,220,.22);box-shadow:0 0 30px rgba(70,200,255,.22)}
.sg.aurora .sg-title{color:#eaffff;text-shadow:0 0 12px rgba(80,255,210,.5)}
.sg.aurora .sg-nums{color:#7df9d6}
.sg.aurora .sg-fill{background:linear-gradient(90deg,#22d3ee,#48f0c8,#a855f7,#22d3ee);background-size:300% 100%;animation:sgFlow 4s linear infinite;box-shadow:0 0 20px rgba(72,240,200,.6)}
@keyframes sgFlow{0%{background-position:0 0}100%{background-position:300% 0}}

/* 3 FIRE */
.sg.fire{--accent:#ff6b1a;background:rgba(18,6,2,.82);border:1px solid rgba(255,110,30,.3);box-shadow:0 0 30px rgba(255,90,20,.3)}
.sg.fire .sg-title{color:#ffd9b3;text-shadow:0 0 10px rgba(255,120,40,.7)}
.sg.fire .sg-nums{color:#ff8c42;text-shadow:0 0 8px rgba(255,100,30,.8)}
.sg.fire .sg-fill{background:linear-gradient(90deg,#7a1500,#ff3d00,#ff8c00,#ffd000);background-size:200% 100%;animation:sgFire 1.6s ease-in-out infinite;box-shadow:0 0 24px rgba(255,90,0,.8)}
@keyframes sgFire{0%,100%{background-position:0 0;filter:brightness(1)}50%{background-position:60% 0;filter:brightness(1.25)}}
.sg .ember{position:absolute;bottom:0;width:4px;height:4px;border-radius:50%;background:#ffb347;box-shadow:0 0 6px 2px rgba(255,140,0,.9);animation:sgEmber 1.8s linear infinite}
@keyframes sgEmber{0%{transform:translateY(6px) scale(1);opacity:0}20%{opacity:1}100%{transform:translateY(-26px) scale(.2);opacity:0}}

/* 4 RAINBOW HOLO */
.sg.holo{--accent:#ff2ec4;background:rgba(10,8,18,.8);border:1px solid rgba(255,255,255,.18);box-shadow:0 0 28px rgba(180,120,255,.3)}
.sg.holo .sg-title{color:#fff;background:linear-gradient(90deg,#ff2ec4,#a855f7,#22d3ee,#ff2ec4);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:sgFlow 4s linear infinite}
.sg.holo .sg-nums{color:#e7c6ff}
.sg.holo .sg-fill{background:linear-gradient(90deg,#ff2ec4,#ff7a00,#ffd000,#22d3ee,#a855f7,#ff2ec4);background-size:300% 100%;animation:sgFlow 3s linear infinite;box-shadow:0 0 22px rgba(255,120,255,.55)}

/* 5 GOLD LUXURY */
.sg.gold{--accent:#ffd700;background:linear-gradient(135deg,rgba(40,30,4,.9),rgba(20,15,2,.9));border:1px solid rgba(255,215,0,.35);box-shadow:0 0 26px rgba(255,200,0,.25)}
.sg.gold .sg-title{font-family:'Playfair Display',serif;color:#ffe9a8;text-shadow:0 0 8px rgba(255,200,0,.5)}
.sg.gold .sg-nums{font-family:'Playfair Display',serif;color:#ffd700}
.sg.gold .sg-fill{background:linear-gradient(90deg,#a87900,#ffd700,#fff4c2,#ffd700,#a87900);background-size:200% 100%;animation:sgGold 2.8s linear infinite;box-shadow:0 0 20px rgba(255,210,0,.7)}
@keyframes sgGold{0%{background-position:0 0}100%{background-position:200% 0}}
.sg .spark{position:absolute;width:3px;height:3px;background:#fff;border-radius:50%;box-shadow:0 0 6px 2px #ffe98a;animation:sgSpark 2s ease-in-out infinite}
@keyframes sgSpark{0%,100%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1.4)}}

/* 6 CYBERPUNK */
.sg.cyber{--accent:#22d3ee;background:rgba(4,8,14,.85);border:1px solid rgba(34,211,238,.4);box-shadow:0 0 24px rgba(34,211,238,.3),0 0 24px rgba(255,46,184,.15)}
.sg.cyber .sg-title{font-family:'Orbitron',sans-serif;font-weight:900;color:#22d3ee;letter-spacing:1px;text-transform:uppercase;text-shadow:0 0 8px rgba(34,211,238,.6);animation:sgGlitch 3s steps(1) infinite}
@keyframes sgGlitch{0%,92%,100%{text-shadow:0 0 8px rgba(34,211,238,.6)}94%{text-shadow:3px 0 #ff2eb8,-3px 0 #22d3ee}96%{text-shadow:-3px 0 #ff2eb8,3px 0 #22d3ee}}
.sg.cyber .sg-nums{font-family:'JetBrains Mono',monospace;color:#ff2eb8}
.sg.cyber .sg-track{border:1px solid rgba(34,211,238,.25);background:rgba(34,211,238,.05)}
.sg.cyber .sg-fill{background:linear-gradient(90deg,#0891b2,#22d3ee,#ff2eb8);box-shadow:0 0 18px rgba(34,211,238,.8)}
.sg.cyber .sg-fill::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 6px,rgba(0,0,0,.25) 6px 8px);animation:sgScan 8s linear infinite}
@keyframes sgScan{to{background-position:200px 0}}

/* 7 GALAXY */
.sg.galaxy{--accent:#a855f7;background:radial-gradient(ellipse at 30% 20%,rgba(80,40,150,.5),rgba(5,3,15,.92) 70%);border:1px solid rgba(168,85,247,.3);box-shadow:0 0 30px rgba(120,60,255,.3)}
.sg.galaxy::before{content:'';position:absolute;inset:0;background-image:radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 70%,#fff,transparent),radial-gradient(1px 1px at 80% 20%,#cbb3ff,transparent),radial-gradient(1px 1px at 40% 80%,#fff,transparent),radial-gradient(1px 1px at 90% 60%,#fff,transparent);animation:sgTwinkle 3s ease-in-out infinite;opacity:.8;z-index:0}
@keyframes sgTwinkle{0%,100%{opacity:.5}50%{opacity:.95}}
.sg.galaxy .sg-title{color:#f0e7ff;text-shadow:0 0 12px rgba(168,85,247,.7)}
.sg.galaxy .sg-nums{color:#c4a0ff}
.sg.galaxy .sg-fill{background:linear-gradient(90deg,#4a1a6e,#a855f7,#22d3ee,#ff2eb8);background-size:280% 100%;animation:sgFlow 5s linear infinite;box-shadow:0 0 22px rgba(168,85,247,.6)}

/* 8 SYNTHWAVE */
.sg.synth{--accent:#ff2e88;background:linear-gradient(180deg,rgba(30,8,40,.92),rgba(10,4,30,.92));border:1px solid rgba(255,46,136,.35);box-shadow:0 0 28px rgba(255,46,136,.3)}
.sg.synth .sg-title{font-family:'Orbitron',sans-serif;font-weight:900;letter-spacing:1px;background:linear-gradient(180deg,#fff,#ff8fe0 60%,#7a3bff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 18px rgba(255,46,136,.4)}
.sg.synth .sg-nums{color:#ff79c6;font-family:'JetBrains Mono',monospace}
.sg.synth .sg-fill{background:linear-gradient(90deg,#7a3bff,#ff2e88,#ff8c42,#ffd000);box-shadow:0 0 20px rgba(255,46,136,.7)}

/* 9 GLASS */
.sg.glass{--accent:var(--bar);background:rgba(255,255,255,.09);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);border:1px solid rgba(255,255,255,.22);box-shadow:0 8px 32px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3)}
.sg.glass .sg-title{color:#fff}
.sg.glass .sg-nums{color:#e8defb}
.sg.glass .sg-track{background:rgba(255,255,255,.12)}
.sg.glass .sg-fill{background:linear-gradient(90deg,var(--bar),color-mix(in srgb,var(--bar) 60%,#a855f7));box-shadow:0 0 16px color-mix(in srgb,var(--bar) 50%,transparent),inset 0 1px 0 rgba(255,255,255,.4)}

/* 10 CANDY */
.sg.candy{--accent:#ff5fa2;background:rgba(255,240,248,.12);border:1px solid rgba(255,150,200,.4);box-shadow:0 0 24px rgba(255,110,170,.3)}
.sg.candy .sg-title{color:#fff;text-shadow:0 2px 6px rgba(255,80,150,.5)}
.sg.candy .sg-nums{color:#ffc2dd}
.sg.candy .sg-fill{background:repeating-linear-gradient(45deg,#ff5fa2 0 14px,#ff9ec9 14px 28px);background-size:40px 40px;animation:sgCandy 1.2s linear infinite;box-shadow:0 0 16px rgba(255,95,162,.6)}
@keyframes sgCandy{to{background-position:40px 0}}

/* 11 ELECTRIC */
.sg.electric{--accent:var(--bar);background:rgba(3,8,20,.85);border:1px solid color-mix(in srgb,var(--bar) 40%,transparent);box-shadow:0 0 26px color-mix(in srgb,var(--bar) 35%,transparent)}
.sg.electric .sg-title{color:#dbeafe;text-shadow:0 0 12px color-mix(in srgb,var(--bar) 80%,transparent)}
.sg.electric .sg-nums{color:color-mix(in srgb,var(--bar) 70%,#fff)}
.sg.electric .sg-fill{background:linear-gradient(90deg,color-mix(in srgb,var(--bar) 60%,#000),var(--bar),#22d3ee);box-shadow:0 0 22px var(--bar);animation:sgElec 1.1s ease-in-out infinite}
@keyframes sgElec{0%,100%{filter:brightness(1)}50%{filter:brightness(1.4) saturate(1.3)}}

/* 12 MINIMAL */
.sg.minimal{--accent:var(--bar);background:rgba(15,12,22,.55);border:1px solid rgba(255,255,255,.1)}
.sg.minimal .sg-title{color:#f5f5fa;font-weight:700}
.sg.minimal .sg-nums{color:#9d8bbf}
.sg.minimal .sg-fill{background:var(--bar)}
.sg.minimal .sg-tip{display:none}
.sg.minimal.shine::after,.sg.minimal .shine::after{display:none}
`
