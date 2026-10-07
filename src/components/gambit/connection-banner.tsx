'use client'

export function ConnectionBanner({ status }: { status: 'connecting' | 'connected' | 'reconnecting' }) {
  if (status === 'connected') return null
  return (
    <div className="fixed top-0 inset-x-0 z-[60] px-4 py-2 text-center text-xs tracking-wide bg-amber-500/15 border-b border-amber-500/30 text-amber-200">
      Connection interrupted. Reconnecting...
    </div>
  )
}
