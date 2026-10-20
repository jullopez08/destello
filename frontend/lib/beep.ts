// Aviso con sonido para el equipo (comanda lista para el mesero, comanda nueva en cocina), sin archivos: dos tonos
// cortos con Web Audio. El navegador solo deja sonar después de que la persona tocó la pantalla (el PIN lo cumple).
let ctx: AudioContext | null = null

export function beep() {
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
    navigator.vibrate?.([120, 60, 120])
  } catch {
    // Sin audio (navegador viejo o bloqueado): el aviso en pantalla sigue.
  }
}
