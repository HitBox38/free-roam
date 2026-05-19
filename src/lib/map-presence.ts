export interface MapPresenceSample {
  lat: number
  lng: number
  screenX: number
  screenY: number
}

interface MapPresenceThrottleOptions {
  emit: (sample: MapPresenceSample) => void
  minIntervalMs?: number
  distanceThresholdPx?: number
  now?: () => number
  requestAnimationFrameFn?: (callback: FrameRequestCallback) => number
  cancelAnimationFrameFn?: (id: number) => void
  setTimeoutFn?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearTimeoutFn?: (handle: ReturnType<typeof setTimeout>) => void
}

export interface MapPresenceThrottler {
  queue: (sample: MapPresenceSample) => void
  setFocused: (focused: boolean) => void
  setConnectionReady: (connectionReady: boolean) => void
  flush: () => void
  clearPending: () => void
  cancel: () => void
}

const DEFAULT_MIN_INTERVAL_MS = 500
const DEFAULT_DISTANCE_THRESHOLD_PX = 4
const RAF_FALLBACK_MS = 16

function distanceInPixels(
  previous: MapPresenceSample,
  next: MapPresenceSample
): number {
  return Math.hypot(next.screenX - previous.screenX, next.screenY - previous.screenY)
}

export function throttleMapPresence(
  options: MapPresenceThrottleOptions
): MapPresenceThrottler {
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS
  const distanceThresholdPx =
    options.distanceThresholdPx ?? DEFAULT_DISTANCE_THRESHOLD_PX
  const now = options.now ?? (() => Date.now())
  const requestAnimationFrameFn =
    options.requestAnimationFrameFn ??
    ((callback: FrameRequestCallback): number =>
      Number(
        setTimeout(() => {
          callback(now())
        }, RAF_FALLBACK_MS)
      ))
  const cancelAnimationFrameFn =
    options.cancelAnimationFrameFn ??
    ((id: number) => {
      clearTimeout(id)
    })
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout

  let focused = false
  let connectionReady = false
  let pending: MapPresenceSample | null = null
  let lastObserved: MapPresenceSample | null = null
  let lastEmittedAt = Number.NEGATIVE_INFINITY
  let frameHandle: number | null = null
  let trailingHandle: ReturnType<typeof setTimeout> | null = null

  const clearTrailing = () => {
    if (!trailingHandle) {
      return
    }

    clearTimeoutFn(trailingHandle)
    trailingHandle = null
  }

  const clearFrame = () => {
    if (frameHandle === null) {
      return
    }

    cancelAnimationFrameFn(frameHandle)
    frameHandle = null
  }

  const emitPending = () => {
    if (!pending || !focused || !connectionReady) {
      pending = null
      return
    }

    options.emit(pending)
    lastEmittedAt = now()
    pending = null
    clearTrailing()
  }

  const scheduleTrailing = (delayMs: number) => {
    if (trailingHandle) {
      return
    }

    trailingHandle = setTimeoutFn(() => {
      trailingHandle = null
      emitPending()
    }, Math.max(0, delayMs))
  }

  const processPending = () => {
    if (!pending || !focused || !connectionReady) {
      pending = null
      clearTrailing()
      return
    }

    const elapsedMs = now() - lastEmittedAt
    if (elapsedMs >= minIntervalMs) {
      emitPending()
      return
    }

    scheduleTrailing(minIntervalMs - elapsedMs)
  }

  const scheduleProcess = () => {
    if (frameHandle !== null) {
      return
    }

    frameHandle = requestAnimationFrameFn(() => {
      frameHandle = null
      processPending()
    })
  }

  const clearPending = () => {
    pending = null
    clearTrailing()
    clearFrame()
  }

  return {
    queue: (sample) => {
      if (!focused || !connectionReady) {
        return
      }

      if (lastObserved && distanceInPixels(lastObserved, sample) < distanceThresholdPx) {
        return
      }

      lastObserved = sample
      pending = sample
      scheduleProcess()
    },
    setFocused: (nextFocused) => {
      focused = nextFocused
      if (!focused) {
        clearPending()
      }
    },
    setConnectionReady: (nextConnectionReady) => {
      connectionReady = nextConnectionReady
      if (!connectionReady) {
        clearPending()
      }
    },
    flush: () => {
      emitPending()
    },
    clearPending,
    cancel: () => {
      clearPending()
      lastObserved = null
      focused = false
      connectionReady = false
    },
  }
}
