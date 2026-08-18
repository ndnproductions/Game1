/**
 * Tiny oscillator-based sound so the prototype has feedback without shipping
 * any audio assets. Swap for real samples during the polish pass.
 */
let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (ctx) return ctx
  try {
    ctx = new AudioContext()
  } catch {
    return null
  }
  return ctx
}

/** Browsers require a gesture before audio starts; call this on first touch. */
export function unlockAudio(): void {
  const c = context()
  if (c && c.state === 'suspended') void c.resume()
}

function blip(freq: number, duration: number, type: OscillatorType, gain: number): void {
  const c = context()
  if (!c || c.state !== 'running') return

  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  amp.gain.setValueAtTime(gain, c.currentTime)
  amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration)
  osc.connect(amp).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + duration)
}

export function playPickUp(): void {
  blip(420, 0.06, 'sine', 0.06)
}

export function playPlace(): void {
  blip(280, 0.08, 'triangle', 0.09)
}

export function playInvalid(): void {
  blip(140, 0.12, 'sawtooth', 0.05)
}

/** Pitch climbs with the combo so streaks sound like they are building. */
export function playClear(lines: number, combo: number): void {
  const steps = Math.min(lines, 4)
  for (let i = 0; i < steps; i++) {
    const freq = 520 * Math.pow(1.26, i + Math.min(combo, 6) * 0.5)
    setTimeout(() => blip(freq, 0.16, 'square', 0.05), i * 70)
  }
}

export function playGameOver(): void {
  const notes = [330, 262, 208, 165]
  notes.forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.07), i * 130))
}

export function vibrate(ms: number | number[]): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Unsupported on iOS Safari; silently skip.
  }
}
