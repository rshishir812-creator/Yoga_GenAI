import { useCallback, useEffect, useState } from 'react'

export type Orientation = 'portrait' | 'landscape'

/** Heuristic: consider a device "mobile" if it has touch support and a small screen */
function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const narrowScreen = window.innerWidth <= 768
  return hasTouch && narrowScreen
}

function getOrientation(): Orientation {
  if (typeof window === 'undefined') return 'landscape'
  // Use screen.orientation if available (more reliable than matchMedia on mobile)
  if (screen.orientation?.type) {
    return screen.orientation.type.startsWith('portrait') ? 'portrait' : 'landscape'
  }
  return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'
}

/**
 * Reactive hook that returns:
 *  - `orientation` — 'portrait' | 'landscape' (updates on rotation / resize)
 *  - `isMobile` — heuristic based on touch + viewport width
 *  - `isPortraitMobile` — convenience shorthand
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<Orientation>(getOrientation)
  const [isMobile, setIsMobile] = useState<boolean>(detectIsMobile)

  const update = useCallback(() => {
    setOrientation(getOrientation())
    setIsMobile(detectIsMobile())
  }, [])

  useEffect(() => {
    // Listen to both resize and orientation change for broad browser support
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)

    const mql = window.matchMedia('(orientation: portrait)')
    mql.addEventListener?.('change', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      mql.removeEventListener?.('change', update)
    }
  }, [update])

  return {
    orientation,
    isMobile,
    isPortraitMobile: isMobile && orientation === 'portrait',
  }
}
