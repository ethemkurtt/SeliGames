import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AppLayout } from '@/components/layout/AppLayout'

function RootLayout() {
    const { location } = useRouterState()
    const path = location.pathname

    // Overlay routes — render bare for OBS Browser Source (transparent bg, no chrome)
    if (path.startsWith('/live') || path.startsWith('/overlay')) {
        return <Outlet />
    }
    // Admin panel — its own sidebar layout
    if (path.startsWith('/admin')) {
        return <AdminLayout><Outlet /></AdminLayout>
    }
    // Authenticated user area
    if (path.startsWith('/dashboard') || path.startsWith('/profile') || path.startsWith('/subscription') || path.startsWith('/billing')) {
        return <AppLayout><Outlet /></AppLayout>
    }
    // Default: marketing site (landing, pricing, features, mods, login, register, etc.)
    return <SiteLayout><Outlet /></SiteLayout>
}

export const Route = createRootRoute({
    component: () => (
        <>
            <RootLayout />
            {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
        </>
    ),
})
