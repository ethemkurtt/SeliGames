import { createFileRoute } from '@tanstack/react-router'
import { LiveOverlay } from '@/components/live/LiveOverlay'

export const Route = createFileRoute('/live/$overlayId')({
    component: UniversalLive,
})

function UniversalLive() {
    const { overlayId } = Route.useParams()
    return <LiveOverlay overlayId={overlayId} />
}
