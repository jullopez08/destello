"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"

type Toast = { text: string; error: boolean } | null

const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((text: string, error = false) => {
    setToast({ text, error })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), error ? 4200 : 2600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <div className={`toast${toast.error ? " error" : ""}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
