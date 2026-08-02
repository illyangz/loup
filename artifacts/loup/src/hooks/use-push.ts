import { useCallback, useEffect, useState } from "react"
import {
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
} from "@workspace/api-client-react"

// Convert a base64url VAPID key to the Uint8Array PushManager expects.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

const pushSupported =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // main.tsx registers the worker in production; register on demand
  // otherwise (e.g. dev) so the toggle still works.
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}

export function usePushNotifications() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(
    pushSupported && Notification.permission === "denied",
  )

  useEffect(() => {
    if (!pushSupported) return
    let cancelled = false
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = await reg?.pushManager.getSubscription()
        if (!cancelled) setEnabled(Boolean(sub))
      } catch {
        // Leave disabled.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setPermissionDenied(permission === "denied")
        return false
      }
      setPermissionDenied(false)
      const reg = await getRegistration()
      await navigator.serviceWorker.ready
      const { publicKey } = await getPushPublicKey()
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
            .buffer as ArrayBuffer,
        }))
      const json = sub.toJSON()
      await subscribePush({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      })
      setEnabled(true)
      return true
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await unsubscribePush({ endpoint: sub.endpoint }).catch(() => {})
        await sub.unsubscribe()
      }
      setEnabled(false)
    } finally {
      setBusy(false)
    }
  }, [])

  return { supported: pushSupported, enabled, busy, permissionDenied, enable, disable }
}
