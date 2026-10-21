// Confetti em canvas, sem dependência. Respeita prefers-reduced-motion (não faz nada).
interface Particle { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; color: string; age: number; life: number }

let canvas: HTMLCanvasElement | undefined
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let raf = 0
let last = 0

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function palette(): string[] {
  const cs = getComputedStyle(document.documentElement)
  return ['--accent', '--ok', '--attention', '--text'].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean)
}

function ensureCanvas() {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60'
    document.body.append(canvas)
    ctx = canvas.getContext('2d')
  }
  const dpr = devicePixelRatio || 1
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function frame(t: number) {
  const dt = Math.min(0.05, (t - last) / 1000)
  last = t
  ctx!.clearRect(0, 0, innerWidth, innerHeight)
  particles = particles.filter((p) => p.age < p.life && p.y < innerHeight + 40)
  for (const p of particles) {
    p.age += dt
    p.vy += 900 * dt // gravidade
    p.vx *= 1 - 1.4 * dt // arrasto do ar
    p.vy *= 1 - 0.6 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.vr * dt
    ctx!.save()
    ctx!.translate(p.x, p.y)
    ctx!.rotate(p.rot)
    ctx!.globalAlpha = Math.min(1, (p.life - p.age) * 2)
    ctx!.fillStyle = p.color
    ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    ctx!.restore()
  }
  if (particles.length) raf = requestAnimationFrame(frame)
  else {
    raf = 0
    canvas?.remove()
    canvas = undefined
  }
}

// `big` = fechou o dia: mais peças, saindo de cima.
export function burst(x: number, y: number, big = false) {
  if (reduced()) return
  ensureCanvas()
  const colors = palette()
  const n = big ? 120 : 36
  for (let i = 0; i < n; i++) {
    const a = big ? Math.PI * (0.15 + Math.random() * 0.7) : -Math.PI / 2 + (Math.random() - 0.5) * 2.2
    const speed = (big ? 380 : 300) + Math.random() * (big ? 420 : 320)
    particles.push({
      x: big ? x + (Math.random() - 0.5) * innerWidth * 0.8 : x, y: big ? y - 40 : y,
      vx: Math.cos(a) * speed * (big ? 0.6 : 1), vy: Math.sin(a) * speed * (big ? 0.6 : 1) * (big ? 1 : 1),
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, color: colors[i % colors.length]!, age: 0, life: 1.1 + Math.random() * 0.9,
    })
  }
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
}
