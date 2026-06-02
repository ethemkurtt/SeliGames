import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { findGiftByName } from '@/data/tiktokGifts'

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
    const barColor = s.barColor || '#00ff9d'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(0,0,0,0.6)'
    const fontSize = s.fontSize || 18
    const borderRadius = s.borderRadius ?? 12
    const theme = s.theme || 'neon'
    const animation = s.animation || 'smooth'
    const showPercentage = s.showPercentage !== false
    const showNumbers = s.showNumbers !== false

    const target = ov.targetValue || 0
    const current = ov.currentValue || 0
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
    const completed = target > 0 && current >= target
    const icon = GOAL_ICONS[ov.subType] || '🎯'

    const [bump, setBump] = useState(false)
    useEffect(() => {
        if (valueDelta && valueDelta > 0) {
            setBump(true)
            const t = window.setTimeout(() => setBump(false), 260)
            return () => window.clearTimeout(t)
        }
    }, [valueDelta])

    const containerStyle = themeContainer(theme, barColor, bgColor, borderRadius)

    return (
        <div
            className={`${bump ? 'ov-bump' : ''} ${completed ? 'ov-celebrate' : ''}`}
            style={{
                ...containerStyle,
                padding: theme === 'glass' ? '20px 24px' : '16px 20px',
                minWidth: 320, maxWidth: 640, width: '100%',
                transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
                <div style={{
                    color: textColor, fontSize, fontWeight: 700,
                    textShadow: theme === 'neon' ? `0 0 8px ${barColor}66` : 'none',
                    letterSpacing: theme === 'gaming' ? '1px' : '0',
                    textTransform: theme === 'gaming' ? 'uppercase' : 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                    minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    <span style={{ fontSize: fontSize + 2 }}>{icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ov.title}</span>
                </div>
                {showNumbers && (
                    <div style={{
                        color: barColor, fontSize: fontSize * 0.75, fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        textShadow: theme === 'neon' ? `0 0 6px ${barColor}88` : 'none',
                        flexShrink: 0,
                    }}>
                        {current.toLocaleString()} / {target.toLocaleString()}
                    </div>
                )}
            </div>

            <div style={{
                height: theme === 'gaming' ? 28 : 22,
                borderRadius,
                background: theme === 'glass' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
                overflow: 'hidden', position: 'relative',
            }}>
                <div style={{
                    width: `${pct}%`, height: '100%', borderRadius,
                    background: theme === 'gradient'
                        ? `linear-gradient(90deg, ${barColor}, ${barColor}bb, ${barColor})`
                        : theme === 'gaming'
                            ? `linear-gradient(90deg, ${barColor}dd, ${barColor}, ${barColor}dd)`
                            : `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                    boxShadow: theme === 'neon' ? `0 0 16px ${barColor}88, 0 0 4px ${barColor}` : `0 0 8px ${barColor}44`,
                    transition: animation === 'smooth' ? 'width 900ms cubic-bezier(0.4, 0, 0.2, 1)'
                        : animation === 'bounce' ? 'width 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                        : animation === 'pulse' ? 'width 500ms ease' : 'width 250ms ease',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {theme === 'neon' && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: `linear-gradient(90deg, transparent, ${barColor}44, transparent)`,
                            backgroundSize: '200% 100%',
                            animation: 'ov-shimmer 2s linear infinite',
                        }} />
                    )}
                </div>
                {showPercentage && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#fff', fontSize: 12, fontWeight: 800,
                        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                        letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums',
                    }}>{pct.toFixed(0)}%</div>
                )}
            </div>

            {completed && (
                <div style={{
                    textAlign: 'center', marginTop: 10,
                    color: barColor, fontSize: 13, fontWeight: 800,
                    letterSpacing: '2px', textTransform: 'uppercase',
                    textShadow: `0 0 12px ${barColor}88`,
                }}>🎉 TAMAMLANDI!</div>
            )}

            {valueDelta !== null && valueDelta > 0 && (
                <div key={`delta-${Date.now()}`} className="ov-float" style={{
                    position: 'absolute', right: 16, top: 6,
                    color: barColor, fontSize: Math.max(14, fontSize * 0.85), fontWeight: 900,
                    textShadow: `0 0 10px ${barColor}, 0 1px 3px rgba(0,0,0,0.8)`,
                    pointerEvents: 'none',
                }}>+{valueDelta} {icon}</div>
            )}
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

    return (
        <div className="ov-giftpop" style={{
            ...themeContainer(theme, barColor, s.backgroundColor || 'rgba(0,0,0,0.6)', borderRadius),
            padding: '24px 32px', textAlign: 'center',
            minWidth: 280, maxWidth: 560, position: 'relative',
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {iconUrl ? (
                    <img src={iconUrl} alt={gift.name} style={{
                        width: c.iconSize || 96, height: c.iconSize || 96,
                        objectFit: 'contain',
                        filter: `drop-shadow(0 0 16px ${barColor}cc)`,
                    }} />
                ) : (
                    <div style={{ fontSize: c.iconSize || 72, filter: `drop-shadow(0 0 16px ${barColor}cc)` }}>
                        {gift.icon || '🎁'}
                    </div>
                )}
                <div style={{
                    color: textColor, fontSize, fontWeight: 800,
                    textShadow: theme === 'neon' ? `0 0 8px ${barColor}88` : '0 1px 3px rgba(0,0,0,0.8)',
                }}>{gift.user}</div>
                <div style={{
                    color: barColor, fontSize: fontSize * 0.85, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 8,
                    textShadow: theme === 'neon' ? `0 0 6px ${barColor}88` : '0 1px 2px rgba(0,0,0,0.8)',
                }}>
                    <span>{gift.name}</span>
                    {gift.count > 1 && <span style={{ color: '#ffd700' }}>×{gift.count}</span>}
                </div>
                {diamonds > 0 && (
                    <div style={{
                        marginTop: 4, padding: '4px 12px',
                        background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)',
                        borderRadius: 999, color: '#ffd700',
                        fontSize: fontSize * 0.7, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                    }}>💎 {diamonds.toLocaleString()}</div>
                )}
            </div>
        </div>
    )
}

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
    const barColor = s.barColor || '#00ff9d'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(0,0,0,0.6)'
    const fontSize = s.fontSize || 24
    const borderRadius = s.borderRadius ?? 12
    const theme = s.theme || 'neon'

    const items = (ov.data?.items || []) as LastXItem[]
    const last = items[0]
    const meta = LASTX_LABELS[ov.subType] || { label: ov.title, icon: '🎯' }
    const catalogGift = last?.gift ? findGiftByName(last.gift) : undefined

    return (
        <div style={{
            ...themeContainer(theme, barColor, bgColor, borderRadius),
            padding: '16px 20px', minWidth: 260, maxWidth: 520,
            position: 'relative',
        }}>
            <div style={{
                color: barColor, fontSize: 12, textTransform: 'uppercase',
                letterSpacing: 2, fontWeight: 700, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                <span>{meta.icon}</span>
                <span>{ov.title || meta.label}</span>
            </div>
            {last ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {catalogGift && (
                        <img src={catalogGift.icon} alt={catalogGift.name} style={{
                            width: 56, height: 56, objectFit: 'contain',
                            filter: `drop-shadow(0 0 10px ${barColor}88)`,
                        }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            color: textColor, fontSize, fontWeight: 800,
                            textShadow: theme === 'neon' ? `0 0 8px ${barColor}66` : 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{last.user}</div>
                        {last.gift && (
                            <div style={{
                                color: barColor, fontSize: fontSize * 0.55, fontWeight: 600,
                                marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {last.gift}{last.count && last.count > 1 ? ` ×${last.count}` : ''}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ color: textColor, opacity: 0.5, fontSize, fontStyle: 'italic' }}>Bekleniyor...</div>
            )}
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
    const barColor = s.barColor || '#00ff9d'
    const textColor = s.textColor || '#ffffff'
    const bgColor = s.backgroundColor || 'rgba(0,0,0,0.6)'
    const borderRadius = s.borderRadius ?? 12
    const theme = s.theme || 'neon'
    const maxItems = c.maxItems || 5

    const allItems = (ov.data?.items || []) as LeaderItem[]
    const items = [...allItems].sort((a, b) => b.score - a.score).slice(0, maxItems)
    const subIcon = ov.subType === 'likes' ? '❤️' : ov.subType === 'gifts' ? '🎁' : '🏆'

    return (
        <div style={{
            ...themeContainer(theme, barColor, bgColor, borderRadius),
            padding: '16px 20px', minWidth: 300, maxWidth: 560,
        }}>
            <div style={{
                color: barColor, fontSize: 14, textTransform: 'uppercase',
                letterSpacing: 2, fontWeight: 800, marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                textShadow: theme === 'neon' ? `0 0 6px ${barColor}88` : 'none',
            }}>
                <span>{subIcon}</span>
                <span>{ov.title}</span>
            </div>
            {items.length === 0 ? (
                <div style={{ color: textColor, opacity: 0.5, padding: '12px 0', fontStyle: 'italic' }}>Bekleniyor...</div>
            ) : items.map((item, i) => (
                <div key={`${item.user}-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 0',
                    borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                    <div style={{
                        color: barColor, fontSize: 18, fontWeight: 800,
                        width: 32, textAlign: 'center',
                        textShadow: theme === 'neon' && i < 3 ? `0 0 8px ${barColor}88` : 'none',
                    }}>{MEDALS[i] || i + 1}</div>
                    <div style={{
                        color: textColor, fontSize: 15, fontWeight: 600, flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{item.user}</div>
                    <div style={{
                        color: barColor, fontSize: 15, fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                    }}>{item.score.toLocaleString()}</div>
                </div>
            ))}
        </div>
    )
}

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

    return (
        <div style={{
            ...themeContainer(theme, barColor, bgColor, borderRadius),
            padding: '16px 20px', minWidth: 340, maxWidth: 640,
        }}>
            <div style={{
                color: barColor, fontSize: 14, textTransform: 'uppercase',
                letterSpacing: 2, fontWeight: 800, marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6,
            }}>📊 {ov.title}</div>
            {items.length === 0 ? (
                <div style={{ color: textColor, opacity: 0.5, padding: '12px 0', fontStyle: 'italic' }}>Bekleniyor...</div>
            ) : items.map((item, i) => {
                const w = (item.score / maxScore) * 100
                return (
                    <div key={`${item.user}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                            color: textColor, fontSize: 13, fontWeight: 600,
                            width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{item.user}</div>
                        <div style={{
                            flex: 1, height: 22, borderRadius: 11,
                            background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative',
                        }}>
                            <div style={{
                                width: `${w}%`, height: '100%', borderRadius: 11,
                                background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                                boxShadow: `0 0 8px ${barColor}66`,
                                transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
                            }} />
                        </div>
                        <div style={{
                            color: barColor, fontSize: 13, fontWeight: 800,
                            width: 58, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                        }}>{item.score.toLocaleString()}</div>
                    </div>
                )
            })}
        </div>
    )
}

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

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [messages.length])

    return (
        <div style={{
            ...themeContainer(theme, barColor, bgColor, borderRadius),
            padding: 12, minWidth: 300, maxWidth: 420, width: '100%',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            maxHeight: '90vh',
        }}>
            <div style={{
                color: barColor, fontSize: 12, textTransform: 'uppercase',
                letterSpacing: 2, fontWeight: 800, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6,
            }}>💬 {ov.title || 'Canlı Chat'}</div>
            <div ref={scrollRef} style={{
                flex: 1, overflowY: 'auto', maxHeight: '80vh',
            }}>
                {messages.length === 0 ? (
                    <div style={{ color: textColor, opacity: 0.4, padding: 8, fontStyle: 'italic', fontSize }}>
                        Mesaj bekleniyor...
                    </div>
                ) : messages.map((m) => (
                    <div key={m._id} className="ov-chatrow" style={{
                        padding: '5px 0', display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                        {m.profilePicture && (
                            <img src={m.profilePicture} alt="" style={{
                                width: 22, height: 22, borderRadius: '50%',
                                flexShrink: 0, objectFit: 'cover',
                            }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ color: barColor, fontWeight: 700, fontSize, marginRight: 6 }}>{m.user}:</span>
                            <span style={{ color: textColor, fontSize }}>{m.text}</span>
                        </div>
                    </div>
                ))}
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

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [events.length])

    return (
        <div style={{
            ...themeContainer(theme, barColor, bgColor, borderRadius),
            padding: 12, minWidth: 300, maxWidth: 440, width: '100%',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            maxHeight: '90vh',
        }}>
            <div style={{
                color: barColor, fontSize: 12, textTransform: 'uppercase',
                letterSpacing: 2, fontWeight: 800, marginBottom: 8,
            }}>📋 {ov.title || 'Event Akışı'}</div>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', maxHeight: '80vh' }}>
                {events.length === 0 ? (
                    <div style={{ color: textColor, opacity: 0.4, padding: 8, fontStyle: 'italic', fontSize }}>
                        Event bekleniyor...
                    </div>
                ) : events.map((e) => {
                    const giftInfo = e.eventType === 'gift' && e.giftName ? findGiftByName(e.giftName) : undefined
                    return (
                        <div key={e._id} className="ov-feedrow" style={{
                            padding: '6px 0', display: 'flex', gap: 8, alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            {giftInfo ? (
                                <img src={giftInfo.icon} alt={giftInfo.name} style={{
                                    width: 24, height: 24, objectFit: 'contain', flexShrink: 0,
                                }} />
                            ) : (
                                <span style={{ fontSize: 18, flexShrink: 0 }}>{e.icon || '📌'}</span>
                            )}
                            <div style={{ flex: 1, minWidth: 0, fontSize, color: textColor }}>
                                <b style={{ color: barColor, marginRight: 4 }}>{e.user}</b>
                                <span>{e.text}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

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

    return (
        <div style={{ position: 'relative', width: size, height: size + 80 }}>
            {/* Pointer */}
            <div style={{
                position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: '24px solid #ffd000',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
                zIndex: 10,
            }} />
            {/* Wheel */}
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.21, 0.99)',
                    filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.6))',
                }}
            >
                {slices.map((sl, i) => {
                    const labelAngle = i * sliceAngle + sliceAngle / 2
                    const labelPos = polarToCartesian(size / 2, size / 2, size / 2 - 50, labelAngle)
                    const color = sl.color || '#bd00ff'
                    return (
                        <g key={i}>
                            <path d={arcPath(i)} fill={color} stroke="#0a0a0f" strokeWidth={2} />
                            <text
                                x={labelPos.x}
                                y={labelPos.y}
                                fill="#fff"
                                fontSize={size / 22}
                                fontWeight={800}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${labelAngle} ${labelPos.x} ${labelPos.y})`}
                                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', pointerEvents: 'none' }}
                            >{sl.label}</text>
                        </g>
                    )
                })}
                <circle cx={size / 2} cy={size / 2} r={18} fill="#0a0a0f" stroke="#ffd000" strokeWidth={3} />
            </svg>
            {/* Winner announcement */}
            {showResult && winner && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    textAlign: 'center',
                    color: textColor,
                    fontSize: 26, fontWeight: 900,
                    textShadow: '0 0 10px rgba(255,208,0,0.8), 0 2px 6px rgba(0,0,0,0.7)',
                    animation: 'ov-giftpop-kf 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                    🎉 {winner}
                    {lastSpin?.user ? <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4, fontWeight: 600 }}>{lastSpin.user}</div> : null}
                </div>
            )}
        </div>
    )
}

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
    return (
        <div style={{
            ...themeContainer(theme, barColor, bgColor, borderRadius),
            padding: '20px 32px',
            minWidth: 320,
            textAlign: 'center',
        }}>
            <div style={{
                color: barColor, fontSize: 14, textTransform: 'uppercase',
                letterSpacing: 3, fontWeight: 800, marginBottom: 8,
                textShadow: theme === 'neon' ? `0 0 8px ${barColor}aa` : 'none',
            }}>
                ⏱️ {ov.title || 'Subathon'}
            </div>
            <div style={{
                color: expired ? '#ff006e' : textColor,
                fontSize,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                letterSpacing: 2,
                textShadow: theme === 'neon' ? `0 0 14px ${barColor}cc, 0 0 32px ${barColor}55` : '0 2px 8px rgba(0,0,0,0.5)',
            }}>{display}</div>
            <div style={{
                marginTop: 10, fontSize: 12, color: textColor, opacity: 0.7,
                display: 'flex', justifyContent: 'center', gap: 16,
            }}>
                {!isRunning && pausedRem > 0 && <span>⏸ Duraklatıldı</span>}
                {!isRunning && pausedRem === 0 && !endsAt && <span style={{ opacity: 0.5 }}>Beklemede</span>}
                {addedTotal > 0 && <span>+{Math.floor(addedTotal / 60)} dk eklendi</span>}
            </div>
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
    const mediaType = c.mediaType || (/\.(mp4|webm)$/i.test(mediaUrl || '') ? 'video' : 'image')

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

    if (!items.length) {
        return <div style={{ color: textColor, opacity: 0.5, fontStyle: 'italic', padding: 16 }}>Etkileşim eşlemesi bekleniyor…</div>
    }

    // Continuous marquee of gift→action chips.
    const doubled = [...items, ...items]
    return (
        <div style={{
            ...themeContainer(s.theme || 'glass', barColor, bgColor, s.borderRadius ?? 16),
            padding: '12px 0', width: '100%', maxWidth: 1280, overflow: 'hidden', position: 'relative',
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, zIndex: 2, height: '100%',
                display: 'flex', alignItems: 'center', padding: '0 14px',
                background: `linear-gradient(90deg, ${bgColor}, transparent)`,
                color: barColor, fontWeight: 800, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
            }}>🎁 HEDİYE → AKSİYON</div>
            <div className="ov-slider-track" style={{ display: 'flex', gap: 12, paddingLeft: 220, whiteSpace: 'nowrap' }}>
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
`
