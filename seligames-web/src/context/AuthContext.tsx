import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '@/lib/api'

interface User {
    id?: string
    _id?: string
    username?: string
    email?: string
    role?: string
    subscriptionPlan?: string
    subscriptionStatus?: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    login: (token: string, user: User) => void
    logout: () => void
    refresh: () => Promise<void>
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
    const [user, setUser] = useState<User | null>(() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
    })

    // On mount, if we have a token, verify by fetching profile (gets latest role + subscription)
    useEffect(() => {
        if (!token) return
        api.get('/auth/profile').then((r) => {
            const fresh = r.data
            setUser(fresh)
            localStorage.setItem('user', JSON.stringify(fresh))
        }).catch(() => {
            // Token invalid → clear
            logout()
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(newUser))
        setToken(newToken)
        setUser(newUser)
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    const refresh = async () => {
        try {
            const r = await api.get('/auth/profile')
            setUser(r.data)
            localStorage.setItem('user', JSON.stringify(r.data))
        } catch { /* */ }
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refresh, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
