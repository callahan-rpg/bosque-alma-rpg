import { useEffect, useRef, useState } from 'react'

/**
 * WeatherEffects: Renderiza efeitos visuais em Canvas diretamente sobre o cenário do Domínio.
 *
 * Suporta:
 * - 'aurora' | 'aurora_storm': Ondas de Aurora Boreal cósmica e mística (verde, ciano, violeta)
 * - 'fireflies' | 'embers': Vaga-lumes mágicos / faíscas brilhantes flutuando suavemente
 * - 'snowy': Véu da geada / neve caindo
 * - 'rainy' | 'cyber_rain': Chuva barométrica / mística
 * - 'storm' | 'emp_storm': Tempestade com clarões de relâmpagos
 * - 'foggy' | 'cloudy' | 'acid_fog': Névoa rasteira e densa
 */
export default function WeatherEffects({ condition = 'none', enabled = true }) {
  const canvasRef = useRef(null)
  const [fxEnabled, setFxEnabled] = useState(() => {
    return localStorage.getItem('jardim_weather_fx') !== 'false'
  })
  const [opacity, setOpacity] = useState(() => {
    const saved = localStorage.getItem('jardim_weather_opacity')
    return saved ? Number(saved) : 100
  })

  useEffect(() => {
    const handleToggle = (e) => {
      if (e.detail !== undefined) {
        setFxEnabled(e.detail)
      } else {
        setFxEnabled(localStorage.getItem('jardim_weather_fx') !== 'false')
      }
    }
    const handleOpacityChange = (e) => {
      if (e.detail !== undefined) {
        setOpacity(e.detail)
      } else {
        const saved = localStorage.getItem('jardim_weather_opacity')
        setOpacity(saved ? Number(saved) : 100)
      }
    }
    window.addEventListener('weather_fx_toggle', handleToggle)
    window.addEventListener('weather_opacity_change', handleOpacityChange)
    return () => {
      window.removeEventListener('weather_fx_toggle', handleToggle)
      window.removeEventListener('weather_opacity_change', handleOpacityChange)
    }
  }, [])

  const normalizedCondition = (condition || 'none').toLowerCase().trim()
  const activeCondition =
    normalizedCondition === 'aurora' || normalizedCondition === 'aurora_storm' ? 'aurora' :
    normalizedCondition === 'fireflies' || normalizedCondition === 'embers' ? 'fireflies' :
    normalizedCondition === 'snowy' ? 'snowy' :
    normalizedCondition === 'rainy' || normalizedCondition === 'cyber_rain' ? 'rainy' :
    normalizedCondition === 'storm' || normalizedCondition === 'emp_storm' ? 'storm' :
    normalizedCondition === 'foggy' || normalizedCondition === 'cloudy' || normalizedCondition === 'acid_fog' ? 'foggy' :
    'none'

  useEffect(() => {
    if (!enabled || !fxEnabled) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const particles = []

    // 🌨️ NEVE / VÉU DA GEADA
    if (activeCondition === 'snowy') {
      const flakeCount = 130
      for (let i = 0; i < flakeCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.5 + 1.2,
          speed: Math.random() * 1.5 + 0.8,
          drift: (Math.random() - 0.5) * 0.8,
          opacity: Math.random() * 0.6 + 0.3,
          swing: Math.random() * Math.PI * 2,
          swingSpeed: Math.random() * 0.03 + 0.01,
        })
      }
    }

    // 🌧️ CHUVA / TEMPESTADE
    if (activeCondition === 'rainy' || activeCondition === 'storm') {
      const dropCount = activeCondition === 'storm' ? 350 : 180
      for (let i = 0; i < dropCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * (activeCondition === 'storm' ? 35 : 20) + 12,
          speed: Math.random() * (activeCondition === 'storm' ? 18 : 10) + 10,
          opacity: Math.random() * 0.45 + 0.2,
          slant: activeCondition === 'storm' ? -3 : -1,
        })
      }
    }

    // 🌫️ NEBLINA / NÉVOA RASTEIRA
    if (activeCondition === 'foggy') {
      const fogCount = 28
      for (let i = 0; i < fogCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 140 + 80,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.15,
          opacity: Math.random() * 0.08 + 0.03,
        })
      }
    }

    // ✨ VAGA-LUMES MÁGICOS / BRASAS
    if (activeCondition === 'fireflies') {
      const count = 45
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.8 + 1.5,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.5 - 0.15,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.04 + 0.015,
          baseColor: Math.random() > 0.4 ? '163, 230, 53' : '250, 204, 21' // dourado ou verde-esmeralda
        })
      }
    }

    // 🌿 CLIMA CALMO / PARTÍCULAS MÍSTICAS DO BOSQUE (Pólen & Esporos Arcanos)
    if (activeCondition === 'none') {
      const count = 30
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.2 + 1.0,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -Math.random() * 0.35 - 0.1,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.03 + 0.012,
          baseColor: Math.random() > 0.5 ? '192, 132, 252' : (Math.random() > 0.5 ? '250, 204, 21' : '52, 211, 153')
        })
      }
    }

    // Relâmpagos em tempestade
    let lightningOpacity = 0
    let nextLightningTime = Date.now() + Math.random() * 6000 + 4000

    let startTime = Date.now()

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      const elapsed = (Date.now() - startTime) / 1000

      // 🌌 AURORA BOREAL MÍSTICA (Ondas de luz suave no céu)
      if (activeCondition === 'aurora') {
        const bands = 4
        for (let b = 0; b < bands; b++) {
          ctx.save()
          ctx.beginPath()

          const yBase = height * 0.22 + b * 45
          ctx.moveTo(0, height)
          ctx.lineTo(0, yBase)

          const waveFreq = 0.0022 + b * 0.0006
          const speed = elapsed * (0.65 + b * 0.25)

          for (let x = 0; x <= width; x += 12) {
            const y = yBase +
              Math.sin(x * waveFreq + speed) * 35 +
              Math.sin(x * waveFreq * 2 - speed * 0.7) * 20
            ctx.lineTo(x, y)
          }

          ctx.lineTo(width, height)
          ctx.closePath()

          const grad = ctx.createLinearGradient(0, yBase - 60, 0, yBase + 160)
          if (b % 2 === 0) {
            grad.addColorStop(0, 'rgba(52, 211, 153, 0)')
            grad.addColorStop(0.35, 'rgba(52, 211, 153, 0.28)')
            grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.22)')
            grad.addColorStop(1, 'rgba(168, 85, 247, 0)')
          } else {
            grad.addColorStop(0, 'rgba(168, 85, 247, 0)')
            grad.addColorStop(0.4, 'rgba(192, 132, 252, 0.25)')
            grad.addColorStop(0.7, 'rgba(52, 211, 153, 0.18)')
            grad.addColorStop(1, 'rgba(14, 165, 233, 0)')
          }

          ctx.fillStyle = grad
          ctx.fill()
          ctx.restore()
        }
      }

      // ⛈️ RELÂMPAGO
      if (activeCondition === 'storm') {
        const now = Date.now()
        if (now > nextLightningTime) {
          lightningOpacity = 0.85
          nextLightningTime = now + Math.random() * 8000 + 5000
        }
        if (lightningOpacity > 0) {
          ctx.fillStyle = `rgba(230, 245, 255, ${lightningOpacity})`
          ctx.fillRect(0, 0, width, height)
          lightningOpacity -= 0.04
        }
      }

      // 🌨️ NEVE
      if (activeCondition === 'snowy') {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
          ctx.fill()

          p.y += p.speed
          p.x += p.drift + Math.sin(p.swing) * 0.4
          p.swing += p.swingSpeed

          if (p.y > height) {
            p.y = -p.radius
            p.x = Math.random() * width
          }
          if (p.x > width) p.x = 0
          if (p.x < 0) p.x = width
        }
      }

      // 🌧️ CHUVA
      if (activeCondition === 'rainy' || activeCondition === 'storm') {
        ctx.lineWidth = activeCondition === 'storm' ? 1.5 : 1.2
        ctx.strokeStyle = activeCondition === 'storm' ? 'rgba(190, 220, 255, 0.7)' : 'rgba(210, 230, 255, 0.55)'

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + p.slant, p.y + p.length)
          ctx.stroke()

          p.y += p.speed
          p.x += p.slant * (p.speed / 10)

          if (p.y > height) {
            p.y = -p.length
            p.x = Math.random() * width
          }
        }
      }

      // 🌫️ NÉVOA
      if (activeCondition === 'foggy') {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
          gradient.addColorStop(0, `rgba(200, 215, 220, ${p.opacity})`)
          gradient.addColorStop(1, 'rgba(200, 215, 220, 0)')

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()

          p.x += p.vx
          p.y += p.vy

          if (p.x < -p.radius) p.x = width + p.radius
          if (p.x > width + p.radius) p.x = -p.radius
          if (p.y < -p.radius) p.y = height + p.radius
          if (p.y > height + p.radius) p.y = -p.radius
        }
      }

      // ✨ VAGA-LUMES
      if (activeCondition === 'fireflies') {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          p.phase += p.pulseSpeed
          const glow = (Math.sin(p.phase) + 1) / 2
          const curOpacity = 0.2 + glow * 0.75

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3)
          grad.addColorStop(0, `rgba(${p.baseColor}, ${curOpacity})`)
          grad.addColorStop(0.4, `rgba(${p.baseColor}, ${curOpacity * 0.4})`)
          grad.addColorStop(1, `rgba(${p.baseColor}, 0)`)

          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
          ctx.fill()

          p.x += p.vx + Math.sin(p.phase) * 0.3
          p.y += p.vy

          if (p.y < -10) {
            p.y = height + 10
            p.x = Math.random() * width
          }
          if (p.x < 0) p.x = width
          if (p.x > width) p.x = 0
        }
      }

      // 🌿 CLIMA CALMO / PARTÍCULAS DO BOSQUE
      if (activeCondition === 'none') {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          p.phase += p.pulseSpeed
          const glow = (Math.sin(p.phase) + 1) / 2
          const curOpacity = 0.15 + glow * 0.55

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5)
          grad.addColorStop(0, `rgba(${p.baseColor}, ${curOpacity})`)
          grad.addColorStop(0.5, `rgba(${p.baseColor}, ${curOpacity * 0.35})`)
          grad.addColorStop(1, `rgba(${p.baseColor}, 0)`)

          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2)
          ctx.fill()

          p.x += p.vx + Math.sin(p.phase) * 0.25
          p.y += p.vy

          if (p.y < -15) {
            p.y = height + 15
            p.x = Math.random() * width
          }
          if (p.x < 0) p.x = width
          if (p.x > width) p.x = 0
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [activeCondition, enabled, fxEnabled])

  if (!enabled || !fxEnabled) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="weather-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 4,
        opacity: opacity / 100,
        transition: 'opacity 0.25s ease',
      }}
    />
  )
}
