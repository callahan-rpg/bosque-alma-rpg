import { useEffect, useRef, useState } from 'react'

/**
 * WeatherEffects: Renderiza efeitos visuais em Canvas diretamente sobre o cenário do Domínio.
 *
 * @param {string} condition - Condição do tempo ('snowy', 'rainy', 'storm', 'foggy', 'cloudy', 'sunny', 'none')
 * @param {boolean} enabled - Se os efeitos estão ativados
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

  useEffect(() => {
    if (!enabled || !fxEnabled || !condition || condition === 'none' || condition === 'sunny') return

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
    if (condition === 'snowy') {
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

    // 🌧️ CHUVA / BREJO / TEMPESTADE
    if (condition === 'rainy' || condition === 'storm') {
      const dropCount = condition === 'storm' ? 350 : 180
      for (let i = 0; i < dropCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * (condition === 'storm' ? 35 : 20) + 12,
          speed: Math.random() * (condition === 'storm' ? 18 : 10) + 10,
          opacity: Math.random() * 0.45 + 0.2,
          slant: condition === 'storm' ? -3 : -1,
        })
      }
    }

    // 🌫️ NEBLINA / NÉVOA RASTEIRA
    if (condition === 'foggy' || condition === 'cloudy') {
      const fogCount = 25
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

    // 🌋 FAGULHAS DE LAVA / BRASAS DE CALOR
    if (condition === 'lava' || condition === 'embers') {
      const sparkCount = 140
      for (let i = 0; i < sparkCount; i++) {
        const isAsh = Math.random() < 0.22
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: isAsh ? Math.random() * 2 + 0.8 : Math.random() * 2.8 + 0.8,
          speedY: Math.random() * 1.8 + 0.7,
          driftX: (Math.random() - 0.5) * 0.9,
          swing: Math.random() * Math.PI * 2,
          swingSpeed: Math.random() * 0.04 + 0.015,
          opacity: Math.random() * 0.7 + 0.3,
          color: isAsh
            ? 'rgba(100, 90, 85,'
            : Math.random() < 0.35
              ? 'rgba(255, 200, 60,' // Dourado incandescente
              : Math.random() < 0.7
                ? 'rgba(255, 95, 20,' // Laranja ardente
                : 'rgba(255, 35, 10,', // Vermelho brasa
          glow: !isAsh && Math.random() < 0.6
        })
      }
    }

    // ⚡ Procedural Lightning Generator
    const createLightningBolt = (w, h) => {
      const startX = Math.random() * (w * 0.7) + (w * 0.15)
      const endX = startX + (Math.random() - 0.5) * (w * 0.35)
      const segments = []
      const branches = []

      let currX = startX
      let currY = 0
      const totalSteps = Math.floor(Math.random() * 8 + 10)
      const stepY = h / totalSteps

      for (let i = 0; i <= totalSteps; i++) {
        const nextX = i === totalSteps ? endX : currX + (Math.random() - 0.5) * 65
        const nextY = Math.min(h, currY + stepY + (Math.random() - 0.5) * 15)
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY })

        // 30% de chance de criar bifurcação / galho elétrico
        if (i > 1 && i < totalSteps - 2 && Math.random() < 0.35) {
          let bX = currX
          let bY = currY
          const branchDir = Math.random() < 0.5 ? -1 : 1
          const branchSteps = Math.floor(Math.random() * 4 + 3)
          for (let b = 0; b < branchSteps; b++) {
            const nBX = bX + (Math.random() * 35 + 10) * branchDir
            const nBY = bY + (Math.random() * 25 + 12)
            branches.push({ x1: bX, y1: bY, x2: nBX, y2: nBY })
            bX = nBX
            bY = nBY
          }
        }

        currX = nextX
        currY = nextY
      }

      return { segments, branches, alpha: 1.0 }
    }

    // Relâmpagos e Raios
    let activeBolt = null
    let lightningFlash = 0
    let nextLightningTime = Date.now() + Math.random() * 3000 + 1500

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // ⚡ Efeito de Raios (Tempestade Arcana e Tempestade de Raios Seca)
      if (condition === 'storm' || condition === 'lightning') {
        const now = Date.now()
        if (now > nextLightningTime) {
          lightningFlash = 0.8
          activeBolt = createLightningBolt(width, height)
          // Intervalo entre raios: de 3 a 7 segundos
          nextLightningTime = now + Math.random() * 4500 + 2500
        }

        // Clarão do ambiente
        if (lightningFlash > 0) {
          ctx.fillStyle = `rgba(225, 235, 255, ${lightningFlash * 0.35})`
          ctx.fillRect(0, 0, width, height)
          lightningFlash -= 0.06
        }

        // Desenho dos raios elétricos no céu
        if (activeBolt && activeBolt.alpha > 0) {
          ctx.save()
          // Halo / Brilho Externo violeta-elétrico
          ctx.shadowColor = 'rgba(190, 140, 255, 0.95)'
          ctx.shadowBlur = 18
          ctx.strokeStyle = `rgba(168, 85, 247, ${activeBolt.alpha * 0.85})`
          ctx.lineWidth = 4.5
          ctx.beginPath()
          activeBolt.segments.forEach(s => {
            ctx.moveTo(s.x1, s.y1)
            ctx.lineTo(s.x2, s.y2)
          })
          activeBolt.branches.forEach(b => {
            ctx.moveTo(b.x1, b.y1)
            ctx.lineTo(b.x2, b.y2)
          })
          ctx.stroke()

          // Núcleo branco incandescente do raio
          ctx.strokeStyle = `rgba(255, 255, 255, ${activeBolt.alpha})`
          ctx.lineWidth = 1.8
          ctx.stroke()
          ctx.restore()

          activeBolt.alpha -= 0.07
          if (activeBolt.alpha <= 0) activeBolt = null
        }
      }

      if (condition === 'snowy') {
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

      if (condition === 'rainy' || condition === 'storm') {
        ctx.lineWidth = condition === 'storm' ? 1.5 : 1.2
        ctx.strokeStyle = condition === 'storm' ? 'rgba(190, 220, 255, 0.7)' : 'rgba(210, 230, 255, 0.55)'

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

      if (condition === 'foggy' || condition === 'cloudy') {
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

      if (condition === 'lava' || condition === 'embers') {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = `${p.color} ${p.opacity})`
          if (p.glow) {
            ctx.shadowColor = 'rgba(255, 120, 30, 0.85)'
            ctx.shadowBlur = 9
          } else {
            ctx.shadowBlur = 0
          }
          ctx.fill()
          ctx.shadowBlur = 0

          p.y -= p.speedY
          p.x += p.driftX + Math.sin(p.swing) * 0.7
          p.swing += p.swingSpeed

          if (p.y < -12) {
            p.y = height + 12
            p.x = Math.random() * width
          }
          if (p.x > width + 12) p.x = -12
          if (p.x < -12) p.x = width + 12
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [condition, enabled, fxEnabled])

  if (!enabled || !fxEnabled || !['rainy', 'storm', 'foggy', 'snowy', 'cloudy', 'lava', 'embers', 'lightning'].includes(condition)) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="weather-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
        opacity: opacity / 100,
        transition: 'opacity 0.2s ease',
      }}
    />
  )
}
