import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Navbar } from '@/components/Navbar'
import { theme } from '@/theme'

function RootLayout() {
  const { location } = useRouterState()
  const isOverlay = location.pathname.startsWith('/overlay') || location.pathname.startsWith('/live')

  if (isOverlay) {
    return <Outlet />
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
      <TanStackRouterDevtools />
    </ThemeProvider>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
