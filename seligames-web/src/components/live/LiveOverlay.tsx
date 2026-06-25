import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { findGiftByName } from '@/data/tiktokGifts'
import { GOAL_THEME_CSS, normalizeGoalTheme } from '../../overlays/goalThemes'
import { OVERLAY_THEME_CSS, normalizeOverlayTheme, overlayAccent } from '../../overlays/overlayThemes'

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

export interface OverlayStyle {
    barColor?: string
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    borderRadius?: number
    showPercentage?: boolean
    showNumbers?: boolean
    animation?: string
    theme?: string
    customCSS?: string
}

export interface OverlayConfig {
    maxItems?: number
    duration?: number
    iconSize?: number
}

export interface LastXItem { user: string; time: number; gift?: string; count?: number }
export interface LeaderItem { user: string; score: number }
export interface GiftAlertData { user: string; name: string; count: number; icon?: string; diamonds?: number; time: number }

export interface OverlayData {
    _id: string
    userId?: string
    overlayId: string
    overlayType: 'goal' | 'gift-alert' | 'last-x' | 'leaderboard' | 'chart' | 'chat' | 'event-feed' | 'subathon' | 'wheel' | 'actions-feed' | 'interaction-slider'
    subType: string
    title: string
    currentValue: number
    targetValue: number
    isActive: boolean
    style: OverlayStyle
    config?: OverlayConfig
    data?: { items?: any[]; lastGift?: GiftAlertData; [k: string]: any }
}

// Fired by the Actions & Events engine on the user room.
interface ActionFire {
    actionId?: string
    actionType: string
    name?: string
    config: any
    context?: { user?: string; nickname?: string; giftName?: string; repeatCount?: number; coins?: number; profilePicture?: string }
    fireId?: string
    _t?: number
}

interface TikTokLiveEvent {
    type: 'chat' | 'event'
    user: string
    text: string
    icon?: string
    eventType?: string
    giftName?: string
    count?: number
    diamondCount?: number
    profilePicture?: string
    _id?: string
    _t?: number
}

// ============================================================================
// Main entry — fetches overlay + sockets + dispatches to the right view.
// ============================================================================

export function LiveOverlay({ overlayId }: { overlayId: string }) {
    const [ov, setOv] = useState<OverlayData | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading')
    const [liveEvents, setLiveEvents] = useState<TikTokLiveEvent[]>([])
    const [valueDelta, setValueDelta] = useState<number | null>(null)
    const [actionFires, setActionFires] = useState<ActionFire[]>([])
    const prevValueRef = useRef(0)
    const deltaTimerRef = useRef<number | null>(null)
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        let cancelled = false
        fetch(`${API_URL}/api/overlays/render/${overlayId}`)
            .then(async (r) => {
                if (r.status === 404) { if (!cancelled) setStatus('not-found'); return null }
                return r.json()
            })
            .then((data) => {
                if (cancelled || !data) return
                if (data.error) { setStatus('not-found'); return }
                setOv(data)
                prevValueRef.current = data.currentValue || 0
                setStatus('ready')
            })
            .catch(() => { if (!cancelled) setStatus('error') })
        return () => { cancelled = true }
    }, [overlayId])

    useEffect(() => {
        const socket = io(API_URL, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 1500 })
        socketRef.current = socket
        const join = () => socket.emit('join-overlay', overlayId)
        socket.on('connect', join)
        socket.on('reconnect', join)

        socket.on('overlay-update', (payload: any) => {
            if (payload.overlayId !== overlayId) return
            setOv((prev) => {
                if (!prev) return prev
                const next: OverlayData = { ...prev }
                if (typeof payload.currentValue === 'number') next.currentValue = payload.currentValue
                if (typeof payload.targetValue === 'number') next.targetValue = payload.targetValue
                if (payload.data) next.data = { ...(next.data || {}), ...payload.data }
                return next
            })
            if (typeof payload.currentValue === 'number') {
                const delta = payload.currentValue - prevValueRef.current
                if (delta > 0) {
                    setValueDelta(delta)
                    if (deltaTimerRef.current) window.clearTimeout(deltaTimerRef.current)
                    deltaTimerRef.current = window.setTimeout(() => setValueDelta(null), 1100)
                }
                prevValueRef.current = payload.currentValue
            }
        })

        socket.on('tiktok-live-event', (ev: TikTokLiveEvent) => {
            setLiveEvents((list) => {
                const withId: TikTokLiveEvent = { ...ev, _id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, _t: Date.now() }
                const next = [...list, withId]
                return next.length > 200 ? next.slice(-200) : next
            })
        })

        // Actions & Events engine fires these on the user room. The MyActions
        // (actions-feed) overlay renders/plays them.
        socket.on('action-fire', (a: ActionFire) => {
            setActionFires((list) => {
                const withT = { ...a, _t: Date.now(), fireId: a.fireId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
                const next = [...list, withT]
                return next.length > 30 ? next.slice(-30) : next
            })
        })

        return () => {
            if (deltaTimerRef.current) window.clearTimeout(deltaTimerRef.current)
            socket.disconnect()
        }
    }, [overlayId])

    if (status === 'loading') return null
    if (status === 'not-found') return <StatusScreen title="Overlay bulunamadı" detail={`ID: ${overlayId}`} color="#ff006e" />
    if (status === 'error' || !ov) return <StatusScreen title="Bağlantı hatası" detail="Backend'e ulaşılamıyor" color="#ff006e" />

    const style = ov.style || {}
    return (
        <div style={{
            width: '100vw', height: '100vh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'transparent', padding: 12, overflow: 'hidden',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
        }}>
            <style>{GLOBAL_CSS}</style>
            {style.customCSS && <style>{style.customCSS}</style>}
            {renderByType(ov, liveEvents, valueDelta, actionFires)}
        </div>
    )
}

function renderByType(ov: OverlayData, liveEvents: TikTokLiveEvent[], valueDelta: number | null, actionFires: ActionFire[]) {
    switch (ov.overlayType) {
        case 'goal': return <GoalView ov={ov} valueDelta={valueDelta} />
        case 'gift-alert': return <GiftAlertView ov={ov} />
        case 'last-x': return <LastXView ov={ov} />
        case 'leaderboard': return <LeaderboardView ov={ov} />
        case 'chart': return <ChartView ov={ov} />
        case 'chat': return <ChatView ov={ov} liveEvents={liveEvents} />
        case 'event-feed': return <EventFeedView ov={ov} liveEvents={liveEvents} />
        case 'subathon': return <SubathonView ov={ov} />
        case 'wheel': return <WheelView ov={ov} />
        case 'actions-feed': return <MyActionsView fires={actionFires} />
        case 'interaction-slider': return <InteractionSliderView ov={ov} />
        case 'gift-cannon': return <GiftCannonView ov={ov} liveEvents={liveEvents} />
        case 'like-fountain': return <LikeFountainView ov={ov} liveEvents={liveEvents} />
        case 'emoji-rain': return <EmojiRainView ov={ov} liveEvents={liveEvents} />
        default: return <StatusScreen title={`Desteklenmeyen tip: ${ov.overlayType}`} color="#ffa500" />
    }
}

// ============================================================================
// View: Goal (progress bar) — likes, follows, shares, viewers, coins, subscribers, custom
// ============================================================================

const GOAL_ICONS: Record<string, string> = {
    likes: '❤️',
    follows: '➕',
    shares: '🔁',
    viewer_count: '👁️',
    coins: '🪙',
    subscribers: '⭐',
    members: '👋',
    comments: '💬',
    custom1: '🎯',
    custom2: '🎯',
    custom3: '🎯',
}

function GoalView({ ov, valueDelta }: { ov: OverlayData; valueDelta: number | null }) {
    const s = ov.style || {}
    const barColor = s.barColor || '#ff2eb8'
    const fontSize = s.fontSize || 18
    const borderRadius = s.borderRadius ?? 14
    const theme = normalizeGoalTheme(s.theme)
    const animation = s.animation || 'smooth'
    const showPercentage = s.showPercentage !== false
    const showNumbers = s.showNumbers !== false

    const target = ov.targetValue || 0
    const current = ov.currentValue || 0
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
    const completed = target > 0 && current >= target
    const icon = GOAL_ICONS[ov.subType] || '🎯'

    // Smooth count-up for the displayed number
    const [display, setDisplay] = useState(current)
    const rafRef = useRef<number | null>(null)
    useEffect(() => {
        const from = display, to = current
        if (from === to) return
        const start = performance.now(), dur = 850
        const step = (now: number) => {
            const t = Math.min((now - start) / dur, 1)
            const e = 1 - Math.pow(1 - t, 3)
            setDisplay(Math.round(from + (to - from) * e))
            if (t < 1) rafRef.current = requestAnimationFrame(step)
        }
        rafRef.current = requestAnimationFrame(step)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current])

    const [bump, setBump] = useState(false)
    useEffect(() => {
        if (valueDelta && valueDelta > 0) {
            setBump(true)
            const t = window.setTimeout(() => setBump(false), 600)
            return () => window.clearTimeout(t)
        }
    }, [valueDelta])

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{GOAL_THEME_CSS}</style>
            <div
                className={`sg ${theme}${completed ? ' is-done' : ''}${bump ? ' celebrate' : ''}`}
                style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, position: 'relative' }}
            >
                <div className="sg-head">
                    <span className="sg-title" style={{ fontSize, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: fontSize + 2 }}>{icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ov.title}</span>
                    </span>
                    {showNumbers && (
                        <span className="sg-nums" style={{ fontSize: Math.round(fontSize * 0.74) }}>
                            {display.toLocaleString('tr-TR')} / {target.toLocaleString('tr-TR')}
                        </span>
                    )}
                </div>
                <div className="sg-track">
                    <div className={`sg-fill shine ${animation}`} style={{ width: `${pct}%` }}>
                        {theme === 'fire' && <><span className="ember" style={{ left: '20%' }} /><span className="ember" style={{ left: '55%', animationDelay: '.6s' }} /><span className="ember" style={{ left: '82%', animationDelay: '1.1s' }} /></>}
                        {theme === 'gold' && <><span className="spark" style={{ left: '30%', top: '28%' }} /><span className="spark" style={{ left: '68%', top: '62%', animationDelay: '.8s' }} /></>}
                    </div>
                    {pct > 1 && pct < 100 && <span className="sg-tip" style={{ left: `calc(${pct}% - 5px)` }} />}
                    {showPercentage && <span className="sg-pct">{pct.toFixed(0)}%</span>}
                </div>
                {completed && <div className="sg-done-badge">★ TAMAMLANDI ★</div>}
                {valueDelta !== null && valueDelta > 0 && (
                    <div key={`delta-${Date.now()}`} className="ov-float" style={{
                        position: 'absolute', right: 16, top: 6, zIndex: 6,
                        color: barColor, fontSize: Math.max(14, fontSize * 0.85), fontWeight: 900,
                        textShadow: `0 0 10px ${barColor}, 0 1px 3px rgba(0,0,0,0.8)`, pointerEvents: 'none',
                    }}>+{valueDelta} {icon}</div>
                )}
            </div>
        </div>
    )
}

// ============================================================================
// View: Gift Alert — popup with big icon + user + gift name
// ============================================================================

function GiftAlertView({ ov }: { ov: OverlayData }) {
    const s = ov.style || {}
    const c = ov.config || {}
    const textColor = s.textColor || '#ffffff'
    const barColor = s.barColor || '#ffd700'
    const fontSize = s.fontSize || 22
    const borderRadius = s.borderRadius ?? 16
    const theme = s.theme || 'gradient'
    const duration = (c.duration || 5) * 1000

    const gift = ov.data?.lastGift
    const [visible, setVisible] = useState(false)
    const hideTimerRef = useRef<number | null>(null)
    const lastKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!gift) { setVisible(false); return }
        const key = `${gift.user}-${gift.name}-${gift.time}`
        if (lastKeyRef.current === key) return
        lastKeyRef.current = key
        setVisible(true)
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = window.setTimeout(() => setVisible(false), duration)
        return () => { if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current) }
    }, [gift?.user, gift?.name, gift?.time, duration])

    if (!gift || !visible) return null

    const catalogGift = findGiftByName(gift.name)
    const iconUrl = catalogGift?.icon
    const diamonds = gift.diamonds ?? (catalogGift ? catalogGift.coins * (gift.count || 1) : 0)
    const t = normalizeOverlayTheme(theme)
    const accent = overlayAccent(t, barColor)
    const big = (gift.count || 1) >= 5 || diamonds >= 100

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{OVERLAY_THEME_CSS + GIFT_ALERT_CSS}</style>
            <div
                className={`ov-card ${t} ov-glow ga-pop`}
                style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, padding: '26px 36px', textAlign: 'center', minWidth: 300, maxWidth: 560 }}
            >
                <div className="ga-rays" style={{ ['--c' as any]: accent }} />
                <div className="ga-halo" style={{ ['--c' as any]: accent }} />
                {big && <div className="ga-confetti">{Array.from({ length: 18 }).map((_, i) => (
                    <span key={i} style={{ left: `${(i * 5.5) % 100}%`, background: ['#ff2eb8', '#a855f7', '#22d3ee', '#ffd700', accent][i % 5], animationDelay: `${(i % 6) * 0.1}s` }} />
                ))}</div>}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div className="ga-icon" style={{ filter: `drop-shadow(0 0 18px ${accent}cc)` }}>
                        {iconUrl
                            ? <img src={iconUrl} alt={gift.name} style={{ width: c.iconSize || 104, height: c.iconSize || 104, objectFit: 'contain' }} />
                            : <span style={{ fontSize: c.iconSize || 84, lineHeight: 1 }}>{gift.icon || '🎁'}</span>}
                    </div>
                    <div className="ov-title ga-user" style={{ color: textColor, fontSize, fontWeight: 900 }}>{gift.user}</div>
                    <div className="ga-gift" style={{ fontSize: Math.round(fontSize * 0.86) }}>
                        <span className="ov-accent">{gift.name}</span>
                        {gift.count > 1 && <span className="ga-mult" style={{ ['--c' as any]: accent }}>×{gift.count}</span>}
                    </div>
                    {diamonds > 0 && (
                        <div className="ga-diamonds" style={{ fontSize: Math.round(fontSize * 0.66) }}>💎 {diamonds.toLocaleString('tr-TR')}</div>
                    )}
                </div>
            </div>
        </div>
    )
}

const GIFT_ALERT_CSS = `
@keyframes gaPop{0%{transform:scale(.4) translateY(30px);opacity:0}55%{transform:scale(1.08) translateY(0);opacity:1}75%{transform:scale(.97)}100%{transform:scale(1)}}
.ga-pop{animation:gaPop .7s cubic-bezier(.34,1.56,.64,1)}
.ga-icon{animation:gaFloat 2.4s ease-in-out infinite}
@keyframes gaFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.04)}}
.ga-halo{position:absolute;top:42px;left:50%;width:150px;height:150px;transform:translate(-50%,-50%);border-radius:50%;
   background:radial-gradient(circle,color-mix(in srgb,var(--c) 55%,transparent),transparent 68%);animation:gaHalo 1.8s ease-in-out infinite;z-index:0;pointer-events:none}
@keyframes gaHalo{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(.9)}50%{opacity:.9;transform:translate(-50%,-50%) scale(1.18)}}
.ga-rays{position:absolute;top:42px;left:50%;width:230px;height:230px;transform:translate(-50%,-50%);z-index:0;pointer-events:none;opacity:.5;
   background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--c) 40%,transparent) 0deg 8deg,transparent 8deg 22deg);
   -webkit-mask:radial-gradient(circle,transparent 38%,#000 42%,transparent 72%);mask:radial-gradient(circle,transparent 38%,#000 42%,transparent 72%);animation:gaSpin 9s linear infinite}
@keyframes gaSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
.ga-gift{font-weight:800;display:flex;align-items:center;gap:9px;justify-content:center}
.ga-mult{color:#fff;background:var(--c);padding:1px 10px;border-radius:999px;font-weight:900;box-shadow:0 0 12px var(--c);animation:ovPop .5s ease}
.ga-diamonds{margin-top:5px;padding:4px 14px;background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.35);border-radius:999px;color:#ffd700;font-weight:800;display:inline-flex;align-items:center;gap:5px;box-shadow:0 0 14px rgba(255,215,0,.25)}
.ga-confetti{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden}
.ga-confetti span{position:absolute;top:-10px;width:7px;height:11px;border-radius:2px;opacity:0;animation:gaConf 1.5s ease-in forwards}
@keyframes gaConf{0%{opacity:0;transform:translateY(-8px) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translateY(170px) rotate(400deg)}}
`

// ============================================================================
// View: Last-X — last follower / gift / liker / sharer
// ============================================================================

const LASTX_LABELS: Record<string, { label: string; icon: string }> = {
    follows: { label: 'Son Takipçi', icon: '➕' },
    gifts: { label: 'Son Hediye', icon: '🎁' },
    likes: { label: 'Son Beğenen', icon: '❤️' },
    shares: { label: 'Son Paylaşan', icon: '🔁' },
}

function LastXView({ ov }: { ov: OverlayData }) {
    const s = ov.style || {}
    const barColor = s.barColor || '#ff2eb8'
    const textColor = s.textColor || '#ffffff'
    const fontSize = s.fontSize || 24
    const borderRadius = s.borderRadius ?? 14
    const t = normalizeOverlayTheme(s.theme)
    const accent = overlayAccent(t, barColor)

    const items = (ov.data?.items || []) as LastXItem[]
    const last = items[0]
    const meta = LASTX_LABELS[ov.subType] || { label: ov.title, icon: '🎯' }
    const catalogGift = last?.gift ? findGiftByName(last.gift) : undefined
    const key = last ? `${last.user}-${last.gift || ''}-${(last as any).time || ''}` : 'none'

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{OVERLAY_THEME_CSS + LISTS_CSS}</style>
            <div className={`ov-card ${t}`} style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, padding: '16px 20px', minWidth: 260, maxWidth: 520 }}>
                <div className="lx-head ov-accent"><span>{meta.icon}</span><span>{ov.title || meta.label}</span></div>
                {last ? (
                    <div key={key} className="lx-body">
                        {catalogGift && <img src={catalogGift.icon} alt="" className="lx-gimg" style={{ filter: `drop-shadow(0 0 10px ${accent}88)` }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ov-title lx-user" style={{ color: textColor, fontSize }}>{last.user}</div>
                            {last.gift && <div className="ov-accent lx-gift" style={{ fontSize: Math.round(fontSize * 0.55) }}>{last.gift}{last.count && last.count > 1 ? ` ×${last.count}` : ''}</div>}
                        </div>
                    </div>
                ) : <div style={{ color: textColor, opacity: 0.5, fontSize, fontStyle: 'italic' }}>Bekleniyor...</div>}
            </div>
        </div>
    )
}

// ============================================================================
// View: Leaderboard — top N gifters/likers
// ============================================================================

const MEDALS = ['👑', '🥈', '🥉']

function LeaderboardView({ ov }: { ov: OverlayData }) {
    const s = ov.style || {}
    const c = ov.config || {}
    const barColor = s.barColor || '#ff2eb8'
    const textColor = s.textColor || '#ffffff'
    const borderRadius = s.borderRadius ?? 14
    const t = normalizeOverlayTheme(s.theme)
    const maxItems = c.maxItems || 5
    const isLoyalty = ov.subType === 'points' || ov.subType === 'loyalty'

    // Loyalty (channel-points) leaderboard pulls its own data source and polls.
    const [loyaltyItems, setLoyaltyItems] = useState<LeaderItem[]>([])
    useEffect(() => {
        if (!isLoyalty || !ov.userId) return
        let alive = true
        const fetchLb = () => fetch(`${API_URL}/api/loyalty/leaderboard/${ov.userId}?limit=${maxItems}`)
            .then((r) => r.json()).then((d) => { if (alive) setLoyaltyItems(d.items || []) }).catch(() => {})
        fetchLb()
        const iv = window.setInterval(fetchLb, 5000)
        return () => { alive = false; window.clearInterval(iv) }
    }, [isLoyalty, ov.userId, maxItems])

    const allItems = (isLoyalty ? loyaltyItems : (ov.data?.items || [])) as LeaderItem[]
    const items = [...allItems].sort((a, b) => b.score - a.score).slice(0, maxItems)
    const subIcon = isLoyalty ? '💎' : ov.subType === 'likes' ? '❤️' : ov.subType === 'gifts' ? '🎁' : '🏆'
    const max = items[0]?.score || 1

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{OVERLAY_THEME_CSS + LISTS_CSS}</style>
            <div className={`ov-card ${t}`} style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, padding: '16px 18px', minWidth: 320, maxWidth: 560 }}>
                <div className="lb-head ov-accent"><span>{subIcon}</span><span>{ov.title}</span></div>
                {items.length === 0 ? (
                    <div style={{ color: textColor, opacity: 0.5, padding: '12px 0', fontStyle: 'italic' }}>Bekleniyor...</div>
                ) : items.map((item, i) => (
                    <div key={`${item.user}-${i}`} className={`lb-row${i === 0 ? ' lb-first' : ''}`}>
                        <div className="lb-rankbar" style={{ width: `${Math.max(8, (item.score / max) * 100)}%` }} />
                        <div className={`lb-rank lb-r${i + 1}`}>{MEDALS[i] || i + 1}</div>
                        <div className="lb-user" style={{ color: textColor }}>{item.user}</div>
                        <div className="lb-score ov-accent">{item.score.toLocaleString('tr-TR')}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const LISTS_CSS = `
.lx-head,.lb-head{text-transform:uppercase;letter-spacing:2px;font-weight:800;display:flex;align-items:center;gap:7px;margin-bottom:11px;font-size:13px}
.lx-body{display:flex;align-items:center;gap:14px;animation:lxIn .55s cubic-bezier(.34,1.56,.64,1)}
@keyframes lxIn{0%{opacity:0;transform:translateX(-16px) scale(.95)}100%{opacity:1;transform:none}}
.lx-gimg{width:58px;height:58px;object-fit:contain;flex-shrink:0}
.lx-user{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lx-gift{font-weight:700;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-row{position:relative;display:flex;align-items:center;gap:12px;padding:9px 11px;border-radius:10px;overflow:hidden;margin-bottom:2px;animation:lbIn .45s ease backwards}
.lb-row:nth-child(2){animation-delay:.04s}.lb-row:nth-child(3){animation-delay:.09s}.lb-row:nth-child(4){animation-delay:.14s}.lb-row:nth-child(5){animation-delay:.19s}.lb-row:nth-child(6){animation-delay:.24s}
@keyframes lbIn{0%{opacity:0;transform:translateX(-14px)}100%{opacity:1;transform:none}}
.lb-rankbar{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 24%,transparent),transparent);z-index:0;transition:width .9s cubic-bezier(.22,1,.36,1)}
.lb-rank,.lb-user,.lb-score{position:relative;z-index:1}
.lb-first{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 32%,transparent)}
.lb-first .lb-rankbar{background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 34%,transparent),transparent)}
.lb-rank{width:34px;text-align:center;font-size:18px;font-weight:900;flex-shrink:0}
.lb-r1{filter:drop-shadow(0 0 8px gold)}.lb-r2{filter:drop-shadow(0 0 6px #d8e0ee)}.lb-r3{filter:drop-shadow(0 0 6px #e0996a)}
.lb-user{flex:1;min-width:0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-score{font-weight:900;font-variant-numeric:tabular-nums}
`

// ============================================================================
// View: Chart — horizontal bars
// ============================================================================

function ChartView({ ov }: { ov: OverlayData }) {
    const s = ov.style || {}
    const c = ov.config || {}
    const barColor = s.barColor || '#bd00ff'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(0,0,0,0.6)'
    const borderRadius = s.borderRadius ?? 12
    const theme = s.theme || 'gradient'
    const maxItems = c.maxItems || 5

    const allItems = (ov.data?.items || []) as LeaderItem[]
    const items = [...allItems].sort((a, b) => b.score - a.score).slice(0, maxItems)
    const maxScore = Math.max(1, ...items.map((i) => i.score))
    const t = normalizeOverlayTheme(theme)

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{OVERLAY_THEME_CSS + CHART_CSS}</style>
            <div className={`ov-card ${t}`} style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, padding: '16px 20px', minWidth: 340, maxWidth: 640 }}>
                <div className="ch-head ov-accent">📊 {ov.title}</div>
                {items.length === 0 ? (
                    <div style={{ color: textColor, opacity: 0.5, padding: '12px 0', fontStyle: 'italic' }}>Bekleniyor...</div>
                ) : items.map((item, i) => {
                    const w = (item.score / maxScore) * 100
                    return (
                        <div key={`${item.user}-${i}`} className="ch-row">
                            <div className="ch-user" style={{ color: textColor }}>{item.user}</div>
                            <div className="ch-track"><div className="ch-fill ov-shine" style={{ width: `${w}%` }} /></div>
                            <div className="ch-score ov-accent">{item.score.toLocaleString('tr-TR')}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const CHART_CSS = `
.ch-head{text-transform:uppercase;letter-spacing:2px;font-weight:800;margin-bottom:13px;font-size:14px;display:flex;align-items:center;gap:7px}
.ch-row{display:flex;align-items:center;gap:11px;margin-bottom:9px;animation:chIn .45s ease backwards}
.ch-row:nth-child(3){animation-delay:.05s}.ch-row:nth-child(4){animation-delay:.1s}.ch-row:nth-child(5){animation-delay:.15s}.ch-row:nth-child(6){animation-delay:.2s}
@keyframes chIn{0%{opacity:0;transform:translateX(-12px)}100%{opacity:1;transform:none}}
.ch-user{width:112px;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-track{flex:1;height:22px;border-radius:11px;background:rgba(255,255,255,.08);overflow:hidden;position:relative;box-shadow:inset 0 1px 2px rgba(0,0,0,.4)}
.ch-fill{height:100%;border-radius:11px;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 65%,#000),var(--accent),color-mix(in srgb,var(--accent) 80%,#fff));box-shadow:0 0 12px color-mix(in srgb,var(--accent) 55%,transparent);transition:width .9s cubic-bezier(.22,1,.36,1)}
.ch-score{width:62px;text-align:right;font-size:13px;font-weight:900;font-variant-numeric:tabular-nums}
`

// ============================================================================
// View: Chat — live chat messages
// ============================================================================

function ChatView({ ov, liveEvents }: { ov: OverlayData; liveEvents: TikTokLiveEvent[] }) {
    const s = ov.style || {}
    const c = ov.config || {}
    const barColor = s.barColor || '#00ff9d'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(0,0,0,0.6)'
    const borderRadius = s.borderRadius ?? 12
    const theme = s.theme || 'neon'
    const fontSize = s.fontSize || 14
    const maxMessages = (c as any).maxMessages || c.maxItems || 30

    const messages = liveEvents.filter((e) => e.type === 'chat').slice(-maxMessages)
    const scrollRef = useRef<HTMLDivElement>(null)
    const t = normalizeOverlayTheme(theme)

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [messages.length])

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{OVERLAY_THEME_CSS + DOCK_CSS}</style>
            <div className={`ov-card ${t}`} style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, padding: 12, minWidth: 300, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}>
                <div className="dk-head ov-accent">💬 {ov.title || 'Canlı Chat'}</div>
                <div ref={scrollRef} className="dk-scroll">
                    {messages.length === 0 ? (
                        <div style={{ color: textColor, opacity: 0.4, padding: 8, fontStyle: 'italic', fontSize }}>Mesaj bekleniyor...</div>
                    ) : messages.map((m) => (
                        <div key={m._id} className="dk-chatrow">
                            {m.profilePicture && (
                                <img src={m.profilePicture} alt="" className="dk-av" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            )}
                            <div className="dk-msg" style={{ fontSize }}>
                                <span className="ov-accent dk-user">{m.user}</span>
                                <span style={{ color: textColor }}>{m.text}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// View: Event Feed — all live events (like, follow, share, gift, chat, etc.)
// ============================================================================

function EventFeedView({ ov, liveEvents }: { ov: OverlayData; liveEvents: TikTokLiveEvent[] }) {
    const s = ov.style || {}
    const c = ov.config || {}
    const barColor = s.barColor || '#00d9ff'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(0,0,0,0.6)'
    const borderRadius = s.borderRadius ?? 12
    const theme = s.theme || 'glass'
    const fontSize = s.fontSize || 14
    const maxEvents = (c as any).maxEvents || c.maxItems || 25

    const events = liveEvents.slice(-maxEvents)
    const scrollRef = useRef<HTMLDivElement>(null)
    const t = normalizeOverlayTheme(theme)

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [events.length])

    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{OVERLAY_THEME_CSS + DOCK_CSS}</style>
            <div className={`ov-card ${t}`} style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, padding: 12, minWidth: 300, maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}>
                <div className="dk-head ov-accent">📋 {ov.title || 'Event Akışı'}</div>
                <div ref={scrollRef} className="dk-scroll">
                    {events.length === 0 ? (
                        <div style={{ color: textColor, opacity: 0.4, padding: 8, fontStyle: 'italic', fontSize }}>Event bekleniyor...</div>
                    ) : events.map((e) => {
                        const giftInfo = e.eventType === 'gift' && e.giftName ? findGiftByName(e.giftName) : undefined
                        return (
                            <div key={e._id} className="dk-feedrow">
                                {giftInfo ? (
                                    <img src={giftInfo.icon} alt={giftInfo.name} className="dk-gift" />
                                ) : (
                                    <span className="dk-emoji">{e.icon || '📌'}</span>
                                )}
                                <div style={{ flex: 1, minWidth: 0, fontSize, color: textColor }}>
                                    <b className="ov-accent" style={{ marginRight: 5 }}>{e.user}</b>
                                    <span>{e.text}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

const DOCK_CSS = `
.dk-head{text-transform:uppercase;letter-spacing:2px;font-weight:800;margin-bottom:9px;font-size:12px;display:flex;align-items:center;gap:6px}
.dk-scroll{flex:1;overflow-y:auto;max-height:80vh;scrollbar-width:thin}
.dk-scroll::-webkit-scrollbar{width:4px}
.dk-scroll::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--accent) 45%,transparent);border-radius:2px}
.dk-chatrow{padding:5px 2px;display:flex;gap:8px;align-items:flex-start;animation:dkIn .35s ease}
.dk-feedrow{padding:6px 4px;display:flex;gap:9px;align-items:center;border-radius:8px;animation:dkIn .35s ease}
.dk-feedrow+.dk-feedrow{border-top:1px solid rgba(255,255,255,.06)}
@keyframes dkIn{0%{opacity:0;transform:translateX(12px)}100%{opacity:1;transform:none}}
.dk-av{width:24px;height:24px;border-radius:50%;flex-shrink:0;object-fit:cover;border:1.5px solid color-mix(in srgb,var(--accent) 55%,transparent)}
.dk-msg{min-width:0;flex:1;line-height:1.42}
.dk-user{font-weight:800;margin-right:6px}
.dk-gift{width:26px;height:26px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--accent) 50%,transparent))}
.dk-emoji{font-size:18px;flex-shrink:0;width:26px;text-align:center}
`

// ============================================================================
// View: Wheel of Actions — gift triggers a weighted random spin
// ============================================================================

type WheelSlice = { label: string; weight?: number; color?: string }

function WheelView({ ov }: { ov: OverlayData }) {
    const s = ov.style || {}
    const c = ov.config || {}
    const textColor = s.textColor || '#ffffff'
    const slices: WheelSlice[] = Array.isArray(c.slices) ? c.slices : []
    const data: any = ov.data || {}
    const lastSpin = data.lastSpin
    const size = 360

    // Animate to lastSpin.winnerIdx whenever spinId changes. Random extra
    // turns keep each spin visually distinct even when landing on same slice.
    const [rotation, setRotation] = useState(0)
    const [winner, setWinner] = useState<string | null>(null)
    const [showResult, setShowResult] = useState(false)
    const lastSpinIdRef = useRef<string | null>(null)
    const resultTimerRef = useRef<number | null>(null)

    useEffect(() => {
        if (!lastSpin?.spinId || lastSpin.spinId === lastSpinIdRef.current) return
        lastSpinIdRef.current = lastSpin.spinId

        const n = slices.length
        if (n === 0) return
        const sliceAngle = 360 / n
        // We want the winner slice's center to land at the top (pointer).
        const targetCenter = lastSpin.winnerIdx * sliceAngle + sliceAngle / 2
        const extraTurns = 5 + Math.floor(Math.random() * 3)
        // current rotation modulo 360 → add turns → land so that
        // (rotation + delta + targetCenter) % 360 === 0
        const current = rotation % 360
        const delta = (360 - current - targetCenter + 360) % 360 + extraTurns * 360
        setRotation(rotation + delta)
        setWinner(lastSpin.winnerLabel || `#${lastSpin.winnerIdx + 1}`)
        setShowResult(false)

        if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current)
        resultTimerRef.current = window.setTimeout(() => setShowResult(true), 4200)
        return () => { if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current) }
    }, [lastSpin?.spinId])

    if (slices.length === 0) {
        return <StatusScreen title="Çark için dilim ekle" color="#bd00ff" />
    }

    // Build SVG conic slices
    const sliceAngle = 360 / slices.length
    const polarToCartesian = (cx: number, cy: number, r: number, deg: number) => {
        const rad = (deg - 90) * Math.PI / 180
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
    }
    const arcPath = (i: number) => {
        const cx = size / 2, cy = size / 2, r = size / 2 - 4
        const start = polarToCartesian(cx, cy, r, i * sliceAngle)
        const end = polarToCartesian(cx, cy, r, (i + 1) * sliceAngle)
        const large = sliceAngle > 180 ? 1 : 0
        return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`
    }

    const t = normalizeOverlayTheme(s.theme)
    const accent = overlayAccent(t, s.barColor)
    const spinning = !showResult && !!winner
    const lights = 24

    return (
        <div className="wh-wrap" style={{ ['--c' as any]: accent, position: 'relative', width: size + 30, height: size + 110 }}>
            <style>{WHEEL_CSS}</style>
            <div className="wh-stage" style={{ position: 'absolute', top: 12, left: 15, width: size, height: size }}>
                {/* glow ring */}
                <div className={`wh-ring${spinning ? ' wh-spinning' : ''}`} />
                {/* casino rim lights */}
                <div className="wh-lights">
                    {Array.from({ length: lights }).map((_, i) => (
                        <span key={i} style={{ transform: `rotate(${(360 / lights) * i}deg) translateY(-${size / 2 + 6}px)`, animationDelay: `${(i % 6) * 0.12}s` }} />
                    ))}
                </div>
                {/* Pointer */}
                <div className="wh-pointer" />
                {/* Wheel */}
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
                    style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.21, 0.99)', filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.6))', position: 'relative', zIndex: 3 }}>
                    {slices.map((sl, i) => {
                        const labelAngle = i * sliceAngle + sliceAngle / 2
                        const labelPos = polarToCartesian(size / 2, size / 2, size / 2 - 50, labelAngle)
                        const color = sl.color || '#bd00ff'
                        return (
                            <g key={i}>
                                <path d={arcPath(i)} fill={color} stroke="rgba(0,0,0,0.55)" strokeWidth={2} />
                                <text x={labelPos.x} y={labelPos.y} fill="#fff" fontSize={size / 22} fontWeight={800}
                                    textAnchor="middle" dominantBaseline="middle"
                                    transform={`rotate(${labelAngle} ${labelPos.x} ${labelPos.y})`}
                                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)', pointerEvents: 'none' }}>{sl.label}</text>
                            </g>
                        )
                    })}
                    <circle cx={size / 2} cy={size / 2} r={24} fill="#0a0a0f" stroke={accent} strokeWidth={4} />
                    <circle cx={size / 2} cy={size / 2} r={10} fill={accent} />
                </svg>
            </div>
            {/* Winner announcement card */}
            {showResult && winner && (
                <div className={`ov-card ${t} wh-winner`} style={{ ['--bar' as any]: s.barColor || accent, position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '12px 26px', textAlign: 'center', minWidth: 220 }}>
                    <div className="wh-conf">{Array.from({ length: 16 }).map((_, i) => <span key={i} style={{ left: `${(i * 6.5) % 100}%`, background: ['#ff2eb8', '#a855f7', '#22d3ee', '#ffd700', accent][i % 5], animationDelay: `${(i % 5) * 0.1}s` }} />)}</div>
                    <div className="ov-title" style={{ color: textColor, fontSize: 24, fontWeight: 900 }}>🎉 {winner}</div>
                    {lastSpin?.user ? <div className="ov-accent" style={{ fontSize: 13, marginTop: 3, fontWeight: 700 }}>{lastSpin.user}</div> : null}
                </div>
            )}
        </div>
    )
}

const WHEEL_CSS = `
.wh-ring{position:absolute;inset:-8px;border-radius:50%;border:3px solid color-mix(in srgb,var(--c) 55%,transparent);box-shadow:0 0 30px color-mix(in srgb,var(--c) 50%,transparent),inset 0 0 24px color-mix(in srgb,var(--c) 28%,transparent);z-index:1;animation:whPulse 2.2s ease-in-out infinite}
@keyframes whPulse{0%,100%{box-shadow:0 0 24px color-mix(in srgb,var(--c) 40%,transparent),inset 0 0 20px color-mix(in srgb,var(--c) 22%,transparent)}50%{box-shadow:0 0 46px color-mix(in srgb,var(--c) 70%,transparent),inset 0 0 30px color-mix(in srgb,var(--c) 35%,transparent)}}
.wh-spinning{animation:whPulse .5s ease-in-out infinite}
.wh-lights{position:absolute;inset:0;z-index:2;pointer-events:none}
.wh-lights span{position:absolute;top:50%;left:50%;width:7px;height:7px;margin:-3.5px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px color-mix(in srgb,var(--c) 80%,#fff);transform-origin:center;animation:whBlink 1s ease-in-out infinite}
@keyframes whBlink{0%,100%{opacity:.35}50%{opacity:1}}
.wh-pointer{position:absolute;top:-16px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:28px solid var(--c);filter:drop-shadow(0 0 8px var(--c));z-index:6}
.wh-winner{animation:gaPop .6s cubic-bezier(.34,1.56,.64,1);overflow:visible}
.wh-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit}
.wh-conf span{position:absolute;top:-10px;width:6px;height:10px;border-radius:2px;opacity:0;animation:gaConf 1.4s ease-in forwards}
`

// ============================================================================
// View: Subathon Timer — countdown that grows with gifts
// ============================================================================

function SubathonView({ ov }: { ov: OverlayData }) {
    const s = ov.style || {}
    const barColor = s.barColor || '#00ff9d'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(0,0,0,0.6)'
    const borderRadius = s.borderRadius ?? 16
    const theme = s.theme || 'gradient'
    const fontSize = s.fontSize || 64

    const data: any = ov.data || {}
    const isRunning = !!data.isRunning
    const endsAt = data.endsAt ? new Date(data.endsAt).getTime() : null
    const pausedRem = Number(data.pausedRemaining || 0)
    const addedTotal = Number(data.addedTotal || 0)

    const [now, setNow] = useState(Date.now())
    useEffect(() => {
        if (!isRunning) return
        const t = window.setInterval(() => setNow(Date.now()), 250)
        return () => window.clearInterval(t)
    }, [isRunning])

    let remaining = 0
    if (isRunning && endsAt) remaining = Math.max(0, Math.floor((endsAt - now) / 1000))
    else if (!isRunning && pausedRem > 0) remaining = pausedRem

    const hh = Math.floor(remaining / 3600)
    const mm = Math.floor((remaining % 3600) / 60)
    const ss = remaining % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    const display = `${pad(hh)}:${pad(mm)}:${pad(ss)}`

    const expired = isRunning && remaining === 0
    const t = normalizeOverlayTheme(theme)
    return (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <style>{OVERLAY_THEME_CSS + SUBATHON_CSS}</style>
            <div className={`ov-card ${t}${isRunning ? ' ov-glow' : ''}`} style={{ ['--bar' as any]: barColor, ['--radius' as any]: `${borderRadius}px`, borderRadius, padding: '22px 40px', minWidth: 340, textAlign: 'center' }}>
                <div className="sub-label ov-accent">⏱️ {ov.title || 'Subathon'}</div>
                <div className={`sub-time${expired ? ' sub-expired' : ''}${isRunning ? ' sub-tick' : ''}`} style={{ color: expired ? '#ff3b6b' : textColor, fontSize }}>{display}</div>
                <div className="sub-foot">
                    {!isRunning && pausedRem > 0 && <span className="sub-chip">⏸ Duraklatıldı</span>}
                    {!isRunning && pausedRem === 0 && !endsAt && <span className="sub-chip" style={{ opacity: 0.6 }}>Beklemede</span>}
                    {addedTotal > 0 && <span className="sub-chip sub-added">+{Math.floor(addedTotal / 60)} dk eklendi</span>}
                </div>
            </div>
        </div>
    )
}

const SUBATHON_CSS = `
.sub-label{text-transform:uppercase;letter-spacing:3px;font-weight:800;font-size:14px;margin-bottom:9px}
.sub-time{font-family:'Orbitron','JetBrains Mono',monospace;font-weight:900;line-height:1;letter-spacing:2px;font-variant-numeric:tabular-nums;text-shadow:0 0 16px color-mix(in srgb,var(--accent) 70%,transparent),0 0 38px color-mix(in srgb,var(--accent) 32%,transparent)}
.sub-tick{animation:subTick 1s ease-in-out infinite}
@keyframes subTick{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}
.sub-expired{animation:subFlash .8s ease-in-out infinite;text-shadow:0 0 20px #ff3b6b}
@keyframes subFlash{0%,100%{opacity:1}50%{opacity:.5}}
.sub-foot{margin-top:13px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
.sub-chip{font-size:12px;font-weight:700;color:#fff;background:rgba(255,255,255,.1);padding:4px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.14)}
.sub-added{background:color-mix(in srgb,var(--accent) 18%,transparent);border-color:color-mix(in srgb,var(--accent) 35%,transparent);color:var(--accent);animation:ovPop .5s ease}
`

// ============================================================================
// Particle overlays — Gift Cannon / Like Fountain / Emoji Rain
// All three consume the raw liveEvents stream and spawn DOM particles.
// ============================================================================

// Shared hook: returns only the events newer than the last seen one.
function useNewEvents(liveEvents: TikTokLiveEvent[], onNew: (ev: TikTokLiveEvent) => void) {
    const seen = useRef<Set<string>>(new Set())
    useEffect(() => {
        for (const ev of liveEvents) {
            const id = ev._id || ''
            if (!id || seen.current.has(id)) continue
            seen.current.add(id)
            onNew(ev)
        }
        if (seen.current.size > 400) seen.current = new Set([...seen.current].slice(-200))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveEvents])
}

interface FlyingGift { id: string; avatar: string; giftIcon: string; user: string; giftName: string; count: number; top: number; dur: number }

function GiftCannonView({ ov, liveEvents }: { ov: OverlayData; liveEvents: TikTokLiveEvent[] }) {
    const c = ov.config || {}
    const [flying, setFlying] = useState<FlyingGift[]>([])
    const fromRight = (c as any).direction !== 'leftToRight'

    useNewEvents(liveEvents, (ev) => {
        if (ev.eventType !== 'gift') return
        const giftMeta = ev.giftName ? findGiftByName(ev.giftName) : null
        const g: FlyingGift = {
            id: ev._id || `${Date.now()}-${Math.random()}`,
            avatar: ev.profilePicture || '',
            giftIcon: giftMeta?.icon || '',
            user: ev.user || '',
            giftName: ev.giftName || '',
            count: ev.count || 1,
            top: 15 + Math.random() * 55,
            dur: 4 + Math.random() * 1.5,
        }
        setFlying((list) => [...list, g])
        window.setTimeout(() => setFlying((list) => list.filter((x) => x.id !== g.id)), (g.dur + 0.3) * 1000)
    })

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {flying.map((g) => (
                <div key={g.id} style={{
                    position: 'absolute', top: `${g.top}%`,
                    [fromRight ? 'right' : 'left']: 0,
                    display: 'flex', alignItems: 'center', gap: 10,
                    animation: `${fromRight ? 'ov-cannon-l' : 'ov-cannon-r'} ${g.dur}s linear forwards`,
                } as any}>
                    {g.avatar && <img src={g.avatar} alt="" style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid #ff2eb8', boxShadow: '0 0 20px #ff2eb8aa' }} />}
                    {g.giftIcon && <img src={g.giftIcon} alt="" style={{ width: 64, height: 64, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{g.user}</span>
                        <span style={{ color: '#ff9fdc', fontWeight: 700, fontSize: 14, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{g.giftName} ×{g.count}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

interface FloatHeart { id: string; left: number; size: number; dur: number; color: string; drift: number }

function LikeFountainView({ ov, liveEvents }: { ov: OverlayData; liveEvents: TikTokLiveEvent[] }) {
    const s = ov.style || {}
    const baseColor = s.barColor || '#ff2eb8'
    const [hearts, setHearts] = useState<FloatHeart[]>([])
    const palette = [baseColor, '#ff5fc4', '#a855f7', '#ff9fdc']

    useNewEvents(liveEvents, (ev) => {
        if (ev.eventType !== 'like') return
        // Spawn a few hearts proportional to like count (capped).
        const n = Math.min(8, Math.max(2, Math.ceil((ev.count || 1) / 3)))
        const batch: FloatHeart[] = Array.from({ length: n }).map((_, i) => ({
            id: `${ev._id}-${i}`,
            left: 10 + Math.random() * 80,
            size: 22 + Math.random() * 22,
            dur: 2.5 + Math.random() * 1.5,
            color: palette[Math.floor(Math.random() * palette.length)],
            drift: (Math.random() - 0.5) * 120,
        }))
        setHearts((list) => [...list, ...batch].slice(-80))
        batch.forEach((h) => window.setTimeout(() => setHearts((list) => list.filter((x) => x.id !== h.id)), (h.dur + 0.2) * 1000))
    })

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {hearts.map((h) => (
                <div key={h.id} style={{
                    position: 'absolute', bottom: -40, left: `${h.left}%`,
                    fontSize: h.size, color: h.color,
                    ['--drift' as any]: `${h.drift}px`,
                    animation: `ov-heart-rise ${h.dur}s ease-out forwards`,
                    filter: `drop-shadow(0 0 8px ${h.color}88)`,
                }}>❤</div>
            ))}
        </div>
    )
}

interface RainItem { id: string; left: number; size: number; dur: number; emoji: string; delay: number }
const DEFAULT_EMOJIS = ['🎉', '🔥', '😍', '👏', '💖', '✨', '😂', '🤩', '💯', '🚀']
function extractEmojis(text: string): string[] {
    const m = (text || '').match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu)
    return m ? m.slice(0, 6) : []
}

function EmojiRainView({ ov, liveEvents }: { ov: OverlayData; liveEvents: TikTokLiveEvent[] }) {
    const c = ov.config || {}
    const useChatEmojis = (c as any).source !== 'random'
    const [items, setItems] = useState<RainItem[]>([])

    useNewEvents(liveEvents, (ev) => {
        if (ev.eventType !== 'chat' && ev.eventType !== 'comment') return
        let emojis = useChatEmojis ? extractEmojis(ev.text || '') : []
        if (!emojis.length) {
            // fall back to a couple of random ones so the overlay always reacts
            emojis = [DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]]
        }
        const batch: RainItem[] = emojis.map((e, i) => ({
            id: `${ev._id}-${i}`,
            left: Math.random() * 95,
            size: 26 + Math.random() * 24,
            dur: 3 + Math.random() * 2,
            delay: Math.random() * 0.3,
            emoji: e,
        }))
        setItems((list) => [...list, ...batch].slice(-100))
        batch.forEach((it) => window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== it.id)), (it.dur + it.delay + 0.3) * 1000))
    })

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {items.map((it) => (
                <div key={it.id} style={{
                    position: 'absolute', top: -50, left: `${it.left}%`, fontSize: it.size,
                    animation: `ov-emoji-fall ${it.dur}s ${it.delay}s linear forwards`,
                }}>{it.emoji}</div>
            ))}
        </div>
    )
}

// ============================================================================
// View: MyActions — renders/plays the Actions & Events engine fires
// (overlay-alert, sound, tts, confetti, media). The single browser source
// that everything visual/audible runs through, à la TikFinity's MyActions.
// ============================================================================

function MyActionsView({ fires }: { fires: ActionFire[] }) {
    const processed = useRef<Set<string>>(new Set())
    const [visual, setVisual] = useState<ActionFire | null>(null)
    const queue = useRef<ActionFire[]>([])
    const showingRef = useRef(false)
    const [confetti, setConfetti] = useState<{ id: string; colors: string[]; intensity: number } | null>(null)

    // Process new fires as they arrive.
    useEffect(() => {
        for (const f of fires) {
            const id = f.fireId || ''
            if (!id || processed.current.has(id)) continue
            processed.current.add(id)
            dispatchFire(f)
        }
        // keep the processed set from growing forever
        if (processed.current.size > 200) {
            processed.current = new Set([...processed.current].slice(-100))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fires])

    function dispatchFire(f: ActionFire) {
        switch (f.actionType) {
            case 'sound': playSound(f.config); break
            case 'tts': speak(f.config); break
            case 'confetti':
                setConfetti({ id: f.fireId || String(Date.now()), colors: f.config?.colors?.length ? f.config.colors : ['#ff2eb8', '#a855f7', '#22d3ee'], intensity: f.config?.intensity || 5 })
                window.setTimeout(() => setConfetti(null), 3000)
                break
            case 'overlay-alert':
            case 'media':
                queue.current.push(f)
                pump()
                break
            default: break // keyboard/launch/points/wheel handled elsewhere
        }
    }

    function pump() {
        if (showingRef.current) return
        const next = queue.current.shift()
        if (!next) return
        showingRef.current = true
        setVisual(next)
        // Play attached sound for overlay-alert
        if (next.actionType === 'overlay-alert' && next.config?.sound) playSound({ preset: next.config.sound })
        const dur = Number(next.config?.durationMs) || 4000
        window.setTimeout(() => {
            setVisual(null)
            window.setTimeout(() => { showingRef.current = false; pump() }, 350)
        }, dur)
    }

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
            {confetti && <Confetti key={confetti.id} colors={confetti.colors} intensity={confetti.intensity} />}
            {visual && <ActionAlertCard fire={visual} />}
        </div>
    )
}

function ActionAlertCard({ fire }: { fire: ActionFire }) {
    const c = fire.config || {}
    const ctx = fire.context || {}
    const accent = c.accentColor || '#ff2eb8'
    const textColor = c.textColor || '#ffffff'
    const anim = c.animation || 'pop'
    const animClass = anim === 'slide' ? 'ov-actalert-slide' : anim === 'bounce' ? 'ov-actalert-bounce' : 'ov-actalert-pop'
    const isMedia = fire.actionType === 'media'
    const mediaUrl = c.mediaUrl
    // Detect video by explicit mediaType, by extension, OR by a data:video/ URI
    // (uploaded files are embedded as data-URIs without a .mp4 extension).
    const mediaType = c.mediaType || (/^data:video\//i.test(mediaUrl || '') || /\.(mp4|webm)(\?|$)/i.test(mediaUrl || '') ? 'video' : 'image')

    return (
        <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }} className={animClass}>
            {mediaUrl && mediaType === 'video' && (
                <video src={mediaUrl} autoPlay muted={false} playsInline
                    style={{ maxWidth: 520, maxHeight: 360, borderRadius: 18, boxShadow: `0 0 60px ${accent}66` }} />
            )}
            {mediaUrl && mediaType !== 'video' && (
                <img src={mediaUrl} alt=""
                    style={{ maxWidth: 420, maxHeight: 320, borderRadius: 18, boxShadow: `0 0 60px ${accent}66` }} />
            )}
            {!isMedia && (c.title || c.message) && (
                <div style={{
                    padding: '20px 34px', borderRadius: 18,
                    background: `linear-gradient(135deg, ${accent}33, rgba(15,7,32,0.92))`,
                    border: `1px solid ${accent}66`,
                    boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 50px ${accent}44`,
                    backdropFilter: 'blur(14px)', textAlign: 'center', maxWidth: 560,
                }}>
                    {c.title && (
                        <div style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800,
                            fontSize: 34, lineHeight: 1.1, color: textColor,
                            textShadow: `0 0 22px ${accent}aa`,
                        }}>{c.title}</div>
                    )}
                    {c.message && (
                        <div style={{ marginTop: 8, fontSize: 18, color: textColor, opacity: 0.85 }}>{c.message}</div>
                    )}
                    {ctx.profilePicture && (
                        <img src={ctx.profilePicture} alt="" style={{ width: 46, height: 46, borderRadius: '50%', marginTop: 12, border: `2px solid ${accent}` }} />
                    )}
                </div>
            )}
        </div>
    )
}

// Lightweight DOM confetti — no library, ~60 absolutely-positioned shards.
function Confetti({ colors, intensity }: { colors: string[]; intensity: number }) {
    const shards = Math.min(160, 20 * intensity)
    const pieces = Array.from({ length: shards }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.4
        const dur = 1.6 + Math.random() * 1.4
        const size = 6 + Math.random() * 8
        const color = colors[i % colors.length]
        const rot = Math.random() * 360
        const drift = (Math.random() - 0.5) * 200
        return (
            <div key={i} style={{
                position: 'absolute', top: -20, left: `${left}%`, width: size, height: size * 0.5,
                background: color, borderRadius: 2,
                ['--drift' as any]: `${drift}px`, ['--rot' as any]: `${rot}deg`,
                animation: `ov-confetti ${dur}s ${delay}s ease-in forwards`,
            }} />
        )
    })
    return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{pieces}</div>
}

// ── Audio helpers (synth presets + mp3) ─────────────────────────────────
let _audioCtx: AudioContext | null = null
function getAudioCtx() {
    if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { /* */ } }
    return _audioCtx
}
const SOUND_PRESETS: Record<string, { freqs: number[]; dur: number }> = {
    coin: { freqs: [988, 1319], dur: 0.18 },
    ding: { freqs: [1568], dur: 0.4 },
    bell: { freqs: [880, 1108, 1318], dur: 0.6 },
    airhorn: { freqs: [220, 233, 220], dur: 0.7 },
    applause: { freqs: [400, 600, 800, 1000], dur: 0.5 },
}
function playSound(config: any) {
    if (!config) return
    const vol = typeof config.volume === 'number' ? config.volume : 0.8
    if (config.mp3Url) {
        try { const a = new Audio(config.mp3Url); a.volume = Math.max(0, Math.min(1, vol)); a.play().catch(() => {}) } catch { /* */ }
        return
    }
    const preset = SOUND_PRESETS[config.preset]
    if (!preset) return
    const ctx = getAudioCtx()
    if (!ctx) return
    preset.freqs.forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.frequency.value = f; o.type = 'triangle'
        const start = ctx.currentTime + i * (preset.dur * 0.5)
        g.gain.setValueAtTime(0.0001, start)
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.25 * vol), start + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, start + preset.dur)
        o.connect(g); g.connect(ctx.destination)
        o.start(start); o.stop(start + preset.dur + 0.05)
    })
}
function speak(config: any) {
    if (!config?.text || !('speechSynthesis' in window)) return
    try {
        const u = new SpeechSynthesisUtterance(config.text)
        u.rate = config.rate || 1; u.pitch = config.pitch || 1
        u.volume = typeof config.volume === 'number' ? config.volume : 1
        if (config.voice) {
            const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith(config.voice) || x.name === config.voice)
            if (v) u.voice = v
        }
        window.speechSynthesis.speak(u)
    } catch { /* */ }
}

// ============================================================================
// View: Interaction Slider — auto-fed "this gift → does X" rotating menu
// ============================================================================

function InteractionSliderView({ ov }: { ov: OverlayData }) {
    const s = ov.style || {}
    const barColor = s.barColor || '#ff2eb8'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(15,7,32,0.82)'
    const [items, setItems] = useState<any[]>([])

    useEffect(() => {
        if (!ov.userId) return
        let alive = true
        const load = () => {
            fetch(`${API_URL}/api/automation/slider/${ov.userId}`)
                .then((r) => r.json())
                .then((d) => { if (alive) setItems(d.items || []) })
                .catch(() => {})
        }
        load()
        const t = window.setInterval(load, 20000) // refresh in case rules change
        return () => { alive = false; window.clearInterval(t) }
    }, [ov.userId])

    // No gift→action rules yet → show a scrolling EXAMPLE strip (faded) instead of
    // a static "bekleniyor" so the overlay isn't empty while the streamer tests /
    // sets up rules. Real rules replace it automatically once added in Aksiyonlar.
    const isDemo = !items.length
    const data = isDemo
        ? [{ giftName: 'Gül', label: 'Blok at' }, { giftName: 'Roket', label: 'Çark çevir' }, { giftName: 'Aslan', label: '+60sn' }, { giftName: 'Elmas', label: 'TNT yağmuru' }, { giftName: 'Yıldız', label: 'Konfeti' }]
        : items

    // Continuous marquee of gift→action chips.
    const doubled = [...data, ...data]
    return (
        <div style={{
            ...themeContainer(s.theme || 'glass', barColor, bgColor, s.borderRadius ?? 16),
            padding: '12px 0', width: '100%', maxWidth: 1280, overflow: 'hidden', position: 'relative',
            opacity: isDemo ? 0.6 : 1,
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, zIndex: 2, height: '100%',
                display: 'flex', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box', whiteSpace: 'nowrap',
                // Solid dark base UNDER the themed bgColor so the label is fully opaque
                // (bgColor itself is ~82% alpha) — otherwise the scrolling chips bleed
                // through and overlap the label text. Fade only in the last ~35px.
                background: `linear-gradient(90deg, ${bgColor} 0, ${bgColor} 180px, transparent 215px), linear-gradient(90deg, #0d0518 0, #0d0518 180px, transparent 215px)`,
                color: barColor, fontWeight: 800, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
            }}>🎁 HEDİYE → AKSİYON</div>
            <div className="ov-slider-track" style={{ display: 'flex', gap: 12, paddingLeft: 235, whiteSpace: 'nowrap' }}>
                {doubled.map((it, i) => (
                    <div key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                        borderRadius: 999, background: `${barColor}1a`, border: `1px solid ${barColor}44`,
                        flexShrink: 0,
                    }}>
                        <span style={{ color: barColor, fontWeight: 800, fontSize: 15 }}>🎁 {it.giftName || it.giftId}</span>
                        <span style={{ color: textColor, opacity: 0.5 }}>→</span>
                        <span style={{ color: textColor, fontWeight: 600, fontSize: 15 }}>{it.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ============================================================================
// Shared: theme-aware container style + status screen
// ============================================================================

function themeContainer(theme: string, barColor: string, bgColor: string, borderRadius: number): React.CSSProperties {
    const base: React.CSSProperties = { borderRadius, overflow: 'hidden' }
    if (theme === 'glass') {
        return {
            ...base,
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.15)',
        }
    }
    if (theme === 'gradient') {
        return {
            ...base,
            background: `linear-gradient(135deg, ${barColor}22, ${barColor}08, ${bgColor})`,
            border: `1px solid ${barColor}33`,
        }
    }
    if (theme === 'gaming') {
        return {
            ...base,
            background: bgColor,
            border: `2px solid ${barColor}66`,
            boxShadow: `0 0 28px ${barColor}22`,
        }
    }
    if (theme === 'minimal') {
        return { ...base, background: bgColor, border: '1px solid rgba(255,255,255,0.08)' }
    }
    // neon (default)
    return {
        ...base,
        background: bgColor,
        border: `1px solid ${barColor}44`,
        boxShadow: `0 0 22px ${barColor}33, inset 0 0 20px ${barColor}11`,
    }
}

function StatusScreen({ title, detail, color }: { title: string; detail?: string; color: string }) {
    return (
        <div style={{
            width: '100vw', height: '100vh', display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: 'transparent',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
        }}>
            <div style={{
                padding: '16px 20px', borderRadius: 12,
                background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${color}44`,
                color: '#fff', textAlign: 'center', minWidth: 280,
            }}>
                <div style={{ color, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{title}</div>
                {detail && <div style={{ color: '#8b8b9a', fontSize: 12 }}>{detail}</div>}
            </div>
        </div>
    )
}

const GLOBAL_CSS = `
    html, body, #root { background: transparent !important; margin: 0; padding: 0; }
    body { overflow: hidden; }
    * { box-sizing: border-box; }
    @keyframes ov-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    .ov-bump { transform: scale(1.03); }
    @keyframes ov-celebrate-kf { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
    .ov-celebrate { animation: ov-celebrate-kf 2s ease infinite; }
    @keyframes ov-float-kf {
        0% { opacity: 0; transform: translateY(0) scale(0.9); }
        25% { opacity: 1; transform: translateY(-8px) scale(1.05); }
        100% { opacity: 0; transform: translateY(-28px) scale(1); }
    }
    .ov-float { animation: ov-float-kf 1.1s ease-out forwards; pointer-events: none; }
    @keyframes ov-giftpop-kf {
        0% { opacity: 0; transform: scale(0.6) translateY(30px); }
        60% { opacity: 1; transform: scale(1.08) translateY(-6px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .ov-giftpop { animation: ov-giftpop-kf 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes ov-chatrow-kf {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .ov-chatrow, .ov-feedrow { animation: ov-chatrow-kf 0.25s ease-out; }

    /* MyActions alert animations */
    @keyframes ov-actalert-pop-kf {
        0% { opacity: 0; transform: translate(-50%,-50%) scale(0.7); }
        55% { opacity: 1; transform: translate(-50%,-50%) scale(1.06); }
        100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
    }
    .ov-actalert-pop { animation: ov-actalert-pop-kf 0.5s cubic-bezier(0.34,1.56,0.64,1); }
    @keyframes ov-actalert-slide-kf {
        0% { opacity: 0; transform: translate(-50%,-50%) translateY(60px); }
        100% { opacity: 1; transform: translate(-50%,-50%) translateY(0); }
    }
    .ov-actalert-slide { animation: ov-actalert-slide-kf 0.45s ease-out; }
    @keyframes ov-actalert-bounce-kf {
        0% { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
        40% { opacity: 1; transform: translate(-50%,-50%) scale(1.15); }
        60% { transform: translate(-50%,-50%) scale(0.92); }
        80% { transform: translate(-50%,-50%) scale(1.04); }
        100% { transform: translate(-50%,-50%) scale(1); }
    }
    .ov-actalert-bounce { animation: ov-actalert-bounce-kf 0.7s ease-out; }

    /* Confetti shard fall */
    @keyframes ov-confetti {
        0% { opacity: 1; transform: translateY(0) translateX(0) rotate(0deg); }
        100% { opacity: 0; transform: translateY(105vh) translateX(var(--drift)) rotate(var(--rot)); }
    }

    /* Interaction slider marquee */
    @keyframes ov-slider-marquee {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
    }
    .ov-slider-track { animation: ov-slider-marquee 30s linear infinite; }

    /* Gift cannon — fly across the screen */
    @keyframes ov-cannon-l {
        0% { transform: translateX(120%); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateX(-100vw); opacity: 0; }
    }
    @keyframes ov-cannon-r {
        0% { transform: translateX(-120%); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateX(100vw); opacity: 0; }
    }

    /* Like fountain — hearts rise + drift + fade */
    @keyframes ov-heart-rise {
        0% { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; }
        15% { opacity: 1; transform: translateY(-8vh) scale(1); }
        100% { transform: translateY(-100vh) translateX(var(--drift)) scale(0.9); opacity: 0; }
    }

    /* Emoji rain — fall from top */
    @keyframes ov-emoji-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(110vh) rotate(40deg); opacity: 0; }
    }
`
