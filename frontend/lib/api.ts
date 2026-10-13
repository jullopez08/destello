// Todas las llamadas van a /api/* del mismo origen; proxy.ts las reenvía al
// backend. La sesión es la cookie httpOnly access_token: aquí no se toca.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
  }
}

// El backend responde 403 terms_not_accepted mientras la dueña no acepte los
// términos; 401 cuando la sesión venció. La app escucha estos eventos.
export const SESSION_EXPIRED_EVENT = "destello:session-expired"
export const TERMS_REQUIRED_EVENT = "destello:terms-required"

export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: options.body !== undefined && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
      body: options.body instanceof FormData ? options.body : options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      signal: options.signal,
    })
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.", 0)
  }

  const text = await response.text()
  const data = text ? safeJson(text) : null

  if (!response.ok) {
    const raw = (data as { message?: string | string[]; error?: string } | null) ?? {}
    const message = Array.isArray(raw.message) ? raw.message[0] : raw.message
    const code = raw.error === "terms_not_accepted" ? "terms_not_accepted" : undefined

    if (typeof window !== "undefined") {
      if (response.status === 401 && !path.startsWith("/auth/login")) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      if (code === "terms_not_accepted") window.dispatchEvent(new Event(TERMS_REQUIRED_EVENT))
    }

    throw new ApiError(message || "Algo salió mal. Inténtalo de nuevo.", response.status, code)
  }

  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Algo salió mal. Inténtalo de nuevo."
}
