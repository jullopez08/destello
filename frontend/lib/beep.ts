// Aviso para el equipo (comanda lista para el mesero, comanda nueva en cocina, mesa que pasó el tiempo máximo):
// dos tonos cortos con Web Audio, sin archivos, y vibración. Julieth (2026-10-20): en el bolsillo, en una cocina con
// ruido, la vibración se nota más que el sonido; cada aviso vibra distinto para reconocerlo sin mirar.
// El navegador solo deja sonar y vibrar después de que la persona tocó la pantalla (el PIN lo cumple).
// En iPhone el navegador no vibra (Apple no lo permite en páginas web): ahí queda el sonido y el aviso en pantalla.
let ctx: AudioContext | null = null

export type Alert = "ready" | "late" | "new"

const VIBRATION: Record<Alert, number[]> = {
  ready: [300, 150, 300],
  late: [700, 200, 700, 200, 700],
  new: [250, 120, 250],
}

export function beep(kind: Alert) {
  try {
    navigator.vibrate?.(VIBRATION[kind])
  } catch {
    // Sin vibración (iPhone o computador): queda el sonido.
  }
  try {
    ctx ??= new AudioContext()
    for (const [freq, at] of [[880, 0], [1320, 0.18]] as const) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.25, ctx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + 0.17)
    }
  } catch {
    // Sin audio (navegador viejo o bloqueado): el aviso en pantalla sigue.
  }
}
