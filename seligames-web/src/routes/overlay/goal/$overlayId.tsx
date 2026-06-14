import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { GOAL_THEME_CSS, normalizeGoalTheme } from '../../../overlays/goalThemes'

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
    const [justCompleted, setJustCompleted] = useState(false)
    const [display, setDisplay] = useState(0)
    const socketRef = useRef<Socket | null>(null)
    const prevValueRef = useRef(0)
    const wasCompleteRef = useRef(false)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        fetch(`${API_URL}/api/goals/overlay/${overlayId}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(true); return }
                setGoal(data)
                prevValueRef.current = data.currentValue
                wasCompleteRef.current = data.isCompleted
                setDisplay(data.currentValue)
            })
            .catch(() => setError(true))
    }, [overlayId])

    useEffect(() => {
        const socket = io(API_URL, { transports: ['websocket', 'polling'] })
        socketRef.current = socket
        socket.on('connect', () => socket.emit('join-overlay', overlayId))
        socket.on('goal-update', (data: any) => {
            if (data.overlayId !== overlayId) return
            setGoal(prev => prev ? { ...prev, currentValue: data.currentValue, isCompleted: data.isCompleted } : prev)
            if (data.isCompleted && !wasCompleteRef.current) {
                setJustCompleted(true)
                setTimeout(() => setJustCompleted(false), 4500)
            }
            wasCompleteRef.current = data.isCompleted
            prevValueRef.current = data.currentValue
        })
        return () => { socket.disconnect() }
    }, [overlayId])

    // Smooth count-up animation for the displayed number
    useEffect(() => {
        if (!goal) return
        const from = display
        const to = goal.currentValue
        if (from === to) return
        const dur = 900
        const start = performance.now()
        const step = (now: number) => {
            const t = Math.min((now - start) / dur, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setDisplay(Math.round(from + (to - from) * eased))
            if (t < 1) rafRef.current = requestAnimationFrame(step)
        }
        rafRef.current = requestAnimationFrame(step)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goal?.currentValue])

    if (error || !goal) return null

    const s = goal.style
    const pct = Math.min((goal.currentValue / goal.targetValue) * 100, 100)
    const theme = normalizeGoalTheme(s.theme)
    const done = goal.isCompleted

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
            <style>{GOAL_THEME_CSS}</style>
            <div
                className={`sg ${theme}${done ? ' is-done' : ''}${justCompleted ? ' celebrate' : ''}`}
                style={{
                    ['--bar' as any]: s.barColor || '#ff2eb8',
                    borderRadius: s.borderRadius,
                    ['--radius' as any]: `${s.borderRadius}px`,
                }}
            >
                <div className="sg-head">
                    <span className="sg-title" style={{ fontSize: s.fontSize }}>{goal.title}</span>
                    {s.showNumbers && (
                        <span className="sg-nums" style={{ fontSize: Math.round(s.fontSize * 0.74) }}>
                            {display.toLocaleString('tr-TR')} / {goal.targetValue.toLocaleString('tr-TR')}
                        </span>
                    )}
                </div>
                <div className="sg-track">
                    <div className={`sg-fill shine ${s.animation || 'smooth'}`} style={{ width: `${pct}%` }}>
                        {theme === 'fire' && <><span className="ember" style={{ left: '20%' }} /><span className="ember" style={{ left: '55%', animationDelay: '.6s' }} /><span className="ember" style={{ left: '82%', animationDelay: '1.1s' }} /></>}
                        {theme === 'gold' && <><span className="spark" style={{ left: '30%', top: '28%' }} /><span className="spark" style={{ left: '68%', top: '62%', animationDelay: '.8s' }} /></>}
                    </div>
                    {pct > 1 && pct < 100 && <span className="sg-tip" style={{ left: `calc(${pct}% - 5px)` }} />}
                    {s.showPercentage && <span className="sg-pct">{pct.toFixed(0)}%</span>}
                </div>
                {done && <div className="sg-done-badge">★ TAMAMLANDI ★</div>}
                {justCompleted && (
                    <div className="sg-confetti">
                        {Array.from({ length: 22 }).map((_, i) => (
                            <span key={i} style={{
                                left: `${(i * 4.5) % 100}%`,
                                background: ['#ff2eb8', '#a855f7', '#22d3ee', '#ffd700', '#48f0c8'][i % 5],
                                animationDelay: `${(i % 6) * 0.12}s`,
                            }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
