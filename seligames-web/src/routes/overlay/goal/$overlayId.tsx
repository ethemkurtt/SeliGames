import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export const Route = createFileRoute('/overlay/goal/$overlayId')({
    component: GoalOverlay,
})

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

interface GoalData {
    title: string
    type: string
    targetValue: number
    currentValue: number
    isCompleted: boolean
    isActive: boolean
    style: {
        barColor: string
        backgroundColor: string
        textColor: string
        fontSize: number
        borderRadius: number
        showPercentage: boolean
        showNumbers: boolean
        animation: string
        theme: string
    }
}

function GoalOverlay() {
    const { overlayId } = Route.useParams()
    const [goal, setGoal] = useState<GoalData | null>(null)
    const [error, setError] = useState(false)
    const [flash, setFlash] = useState(false)
    const socketRef = useRef<Socket | null>(null)
    const prevValueRef = useRef(0)

    useEffect(() => {
        fetch(`${API_URL}/api/goals/overlay/${overlayId}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(true); return }
                setGoal(data)
                prevValueRef.current = data.currentValue
            })
            .catch(() => setError(true))
    }, [overlayId])

    useEffect(() => {
        const socket = io(API_URL, { transports: ['websocket', 'polling'] })
        socketRef.current = socket

        socket.on('connect', () => {
            socket.emit('join-overlay', overlayId)
        })

        socket.on('goal-update', (data: any) => {
            if (data.overlayId === overlayId) {
                setGoal(prev => prev ? {
                    ...prev,
                    currentValue: data.currentValue,
                    isCompleted: data.isCompleted
                } : prev)

                if (data.currentValue > prevValueRef.current) {
                    setFlash(true)
                    setTimeout(() => setFlash(false), 600)
                }
                prevValueRef.current = data.currentValue
            }
        })

        return () => { socket.disconnect() }
    }, [overlayId])

    if (error) return null
    if (!goal) return null

    const pct = Math.min((goal.currentValue / goal.targetValue) * 100, 100)
    const s = goal.style
    const isNeon = s.theme === 'neon'
    const isGaming = s.theme === 'gaming'
    const isGlass = s.theme === 'glass'
    const isGradient = s.theme === 'gradient'

    const containerStyle: React.CSSProperties = {
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        padding: isGlass ? '20px 24px' : '16px 20px',
        borderRadius: s.borderRadius,
        background: isGlass
            ? 'rgba(255,255,255,0.08)'
            : isGradient
                ? `linear-gradient(135deg, ${s.barColor}22, ${s.barColor}08)`
                : s.backgroundColor,
        backdropFilter: isGlass ? 'blur(24px)' : undefined,
        border: isNeon
            ? `1px solid ${s.barColor}44`
            : isGlass
                ? '1px solid rgba(255,255,255,0.15)'
                : isGaming
                    ? `2px solid ${s.barColor}66`
                    : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isNeon
            ? `0 0 20px ${s.barColor}33, inset 0 0 20px ${s.barColor}11`
            : isGaming
                ? `0 0 30px ${s.barColor}22`
                : 'none',
        overflow: 'hidden',
        minWidth: 300,
        maxWidth: 600,
        transition: 'all 0.3s ease',
    }

    const barTrackStyle: React.CSSProperties = {
        height: isGaming ? 28 : 22,
        borderRadius: s.borderRadius,
        background: isGlass ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        position: 'relative',
    }

    const barFillStyle: React.CSSProperties = {
        width: `${pct}%`,
        height: '100%',
        borderRadius: s.borderRadius,
        background: isGradient
            ? `linear-gradient(90deg, ${s.barColor}, ${s.barColor}bb, ${s.barColor})`
            : isGaming
                ? `linear-gradient(90deg, ${s.barColor}dd, ${s.barColor}, ${s.barColor}dd)`
                : `linear-gradient(90deg, ${s.barColor}, ${s.barColor}cc)`,
        boxShadow: isNeon
            ? `0 0 16px ${s.barColor}88, 0 0 4px ${s.barColor}`
            : `0 0 8px ${s.barColor}44`,
        transition: s.animation === 'smooth'
            ? 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
            : s.animation === 'bounce'
                ? 'width 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                : 'width 0.3s ease',
        position: 'relative',
    }

    const animationClass = flash && s.animation === 'pulse'
        ? { animation: 'overlayPulse 0.6s ease' }
        : {}

    return (
        <div style={{
            width: '100vw', height: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
        }}>
            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { background: transparent !important; overflow: hidden; }
                @keyframes overlayPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes completeCelebrate {
                    0%, 100% { filter: brightness(1); }
                    50% { filter: brightness(1.3); }
                }
            `}</style>

            <div style={{
                ...containerStyle,
                ...animationClass,
                ...(goal.isCompleted ? { animation: 'completeCelebrate 2s ease infinite' } : {})
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 10
                }}>
                    <div style={{
                        color: s.textColor, fontSize: s.fontSize, fontWeight: 700,
                        textShadow: isNeon ? `0 0 8px ${s.barColor}66` : 'none',
                        letterSpacing: isGaming ? '1px' : '0',
                        textTransform: isGaming ? 'uppercase' as const : 'none' as const,
                    }}>
                        {goal.title}
                    </div>
                    {s.showNumbers && (
                        <div style={{
                            color: s.barColor, fontSize: s.fontSize * 0.75, fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            textShadow: isNeon ? `0 0 6px ${s.barColor}88` : 'none',
                        }}>
                            {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div style={barTrackStyle}>
                    <div style={barFillStyle}>
                        {isNeon && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                background: `linear-gradient(90deg, transparent, ${s.barColor}44, transparent)`,
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 2s linear infinite',
                            }} />
                        )}
                    </div>

                    {/* Percentage centered on track */}
                    {s.showPercentage && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#fff', fontSize: 12, fontWeight: 700,
                            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                            letterSpacing: '0.5px',
                        }}>
                            {pct.toFixed(0)}%
                        </div>
                    )}
                </div>

                {/* Completed badge */}
                {goal.isCompleted && (
                    <div style={{
                        textAlign: 'center', marginTop: 8,
                        color: s.barColor, fontSize: 13, fontWeight: 700,
                        letterSpacing: '2px', textTransform: 'uppercase',
                        textShadow: `0 0 10px ${s.barColor}88`,
                    }}>
                        TAMAMLANDI!
                    </div>
                )}
            </div>
        </div>
    )
}
