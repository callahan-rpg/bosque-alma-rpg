import React, { useEffect, useRef } from 'react'
import { useLocationTransition } from '../../contexts/LocationTransitionContext.jsx'

export default function LocationTransitionOverlay() {
  const { isTransitioning, transitionEffect, transitionPhase, targetLocationName } = useLocationTransition()
  const canvasRef = useRef(null)

  // Renderizador dinâmico de partículas e vórtice para o efeito Redemoinho d'Água
  useEffect(() => {
    if (!isTransitioning || transitionEffect !== 'water_whirlpool') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let startTime = Date.now()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    // Criar partículas de redemoinho (gotas, espuma, bolhas luminosas)
    const particleCount = 220
    const particles = []
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const maxRadius = Math.sqrt(cx * cx + cy * cy) * 1.1

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * maxRadius + 30,
        speed: 0.04 + Math.random() * 0.06,
        size: Math.random() * 4 + 1.2,
        color: Math.random() > 0.4 ? 'rgba(56, 189, 248, ' : (Math.random() > 0.5 ? 'rgba(125, 211, 252, ' : 'rgba(255, 255, 255, '),
        opacity: Math.random() * 0.7 + 0.3,
        spiralSpeed: Math.random() * 4 + 3,
        wobble: Math.random() * Math.PI * 2,
      })
    }

    // Camadas de anéis de água concêntricos
    const ringCount = 8
    const rings = Array.from({ length: ringCount }, (_, i) => ({
      rotation: (i * Math.PI) / 4,
      rotationSpeed: (i % 2 === 0 ? 1 : -1) * (0.015 + i * 0.005),
      radiusFactor: (i + 1) / ringCount,
    }))

    const render = () => {
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      const isSwallowing = transitionPhase === 'swallowing' || transitionPhase === 'switching'
      const isEmerging = transitionPhase === 'emerging'

      const currentCx = canvas.width / 2
      const currentCy = canvas.height / 2

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 1. Fundo Gradiente Abissal Aquático Dinâmico
      const bgGrad = ctx.createRadialGradient(
        currentCx, currentCy, 10,
        currentCx, currentCy, maxRadius
      )

      if (isSwallowing) {
        bgGrad.addColorStop(0, 'rgba(3, 15, 38, 0.95)')
        bgGrad.addColorStop(0.25, 'rgba(8, 47, 73, 0.85)')
        bgGrad.addColorStop(0.55, 'rgba(12, 74, 110, 0.7)')
        bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0.88)')
      } else {
        bgGrad.addColorStop(0, 'rgba(14, 116, 144, 0.4)')
        bgGrad.addColorStop(0.4, 'rgba(3, 105, 161, 0.25)')
        bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0)')
      }

      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 2. Anéis de Correnteza do Vórtice Girando
      const swallowProgress = Math.min(1, elapsed / 1.8)
      const emergeProgress = Math.min(1, elapsed / 1.7)
      const speedMultiplier = isSwallowing ? (0.6 + swallowProgress * 1.8) : Math.max(0.2, 1.8 * (1 - emergeProgress * 0.8))

      rings.forEach((ring, idx) => {
        ring.rotation += ring.rotationSpeed * speedMultiplier
        const ringRadius = (maxRadius * ring.radiusFactor) * (isSwallowing ? (1 - swallowProgress * 0.15) : (0.85 + emergeProgress * 0.25))

        ctx.save()
        ctx.translate(currentCx, currentCy)
        ctx.rotate(ring.rotation)

        // Traçado espiral elíptico de água
        ctx.beginPath()
        ctx.ellipse(0, 0, ringRadius, ringRadius * 0.75, 0, 0, Math.PI * 2)
        ctx.strokeStyle = idx % 2 === 0
          ? `rgba(56, 189, 248, ${0.15 + (idx / ringCount) * 0.15})`
          : `rgba(165, 243, 252, ${0.1 + (idx / ringCount) * 0.12})`
        ctx.lineWidth = 2 + idx * 1.5
        ctx.setLineDash([40 + idx * 15, 20 + idx * 10])
        ctx.lineDashOffset = -elapsed * 90 * speedMultiplier
        ctx.stroke()
        ctx.restore()
      })

      // 3. Partículas em Espiral Logarítmica (Sugadas suavemente para o centro no Swallow, Expelidas no Emerge)
      particles.forEach((p) => {
        if (isSwallowing) {
          // Espiral suave para dentro em direção ao centro do redemoinho
          p.angle += p.speed * (0.8 + swallowProgress * 1.5)
          p.radius -= p.spiralSpeed * (1.2 + swallowProgress * 1.8)

          // Quando atinge o centro, recicla na borda
          if (p.radius <= 10) {
            p.radius = maxRadius + Math.random() * 60
            p.angle = Math.random() * Math.PI * 2
          }
        } else if (isEmerging) {
          // Espiral para fora / dispersão suave de bolhas
          p.angle += p.speed * Math.max(0.3, 1.3 * (1 - emergeProgress * 0.7))
          p.radius += p.spiralSpeed * Math.max(0.4, 2.2 * (1 - emergeProgress * 0.8))

          if (p.radius > maxRadius) {
            p.radius = 20 + Math.random() * 50
          }
        }

        const px = currentCx + Math.cos(p.angle) * p.radius
        const py = currentCy + Math.sin(p.angle) * (p.radius * 0.78)

        // Desenhar partícula luminosa
        const distRatio = Math.min(1, Math.max(0, p.radius / maxRadius))
        const fadeMultiplier = isEmerging ? Math.max(0, 1 - emergeProgress * 0.9) : 1
        const dynamicAlpha = isSwallowing ? (1 - distRatio * 0.3) * p.opacity : distRatio * p.opacity * fadeMultiplier

        ctx.beginPath()
        ctx.arc(px, py, p.size * (1 + (1 - distRatio) * 0.8), 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${Math.max(0.05, dynamicAlpha)})`
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // 4. Olho Central do Redemoinho (Singularidade Aquática Profunda)
      const coreRadius = isSwallowing
        ? (30 + swallowProgress * 25 + Math.sin(elapsed * 6) * 8)
        : Math.max(10, 80 * (1 - emergeProgress))
      const coreGrad = ctx.createRadialGradient(
        currentCx, currentCy, 0,
        currentCx, currentCy, Math.max(15, coreRadius * 2.5)
      )
      coreGrad.addColorStop(0, 'rgba(2, 6, 23, 1)')
      coreGrad.addColorStop(0.35, 'rgba(8, 47, 73, 0.95)')
      coreGrad.addColorStop(0.7, 'rgba(14, 116, 144, 0.6)')
      coreGrad.addColorStop(1, 'rgba(56, 189, 248, 0)')

      ctx.beginPath()
      ctx.arc(currentCx, currentCy, Math.max(15, coreRadius * 2.5), 0, Math.PI * 2)
      ctx.fillStyle = coreGrad
      ctx.fill()

      // 5. Onda de Choque Aquática Radial (Na emergência)
      if (isEmerging) {
        const shockRadius = Math.min(maxRadius, elapsed * maxRadius * 2.5)
        ctx.beginPath()
        ctx.arc(currentCx, currentCy, shockRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(125, 211, 252, ${Math.max(0, 0.8 - shockRadius / maxRadius)})`
        ctx.lineWidth = 6
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [isTransitioning, transitionEffect, transitionPhase])

  if (!isTransitioning) return null

  return (
    <div
      className={`location-transition-overlay effect-${transitionEffect} phase-${transitionPhase}`}
      aria-hidden="true"
    >
      {/* 1. Redemoinho d'Água (Canvas interativo com partículas e correntezas) */}
      {transitionEffect === 'water_whirlpool' && (
        <div className="whirlpool-container">
          <canvas ref={canvasRef} className="whirlpool-canvas" />

          {/* Efeito SVG de Distorção de Água e Caustics */}
          <div className="whirlpool-svg-vortex">
            <svg viewBox="0 0 400 400" className="vortex-spiral-svg">
              <defs>
                <radialGradient id="vortexGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#0369a1" stopOpacity="0.6" />
                  <stop offset="80%" stopColor="#0c4a6e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx="200" cy="200" r="180" fill="url(#vortexGlow)" />
              {/* Braços espirais do redemoinho */}
              <path
                d="M 200 200 Q 260 120 340 180 T 360 300"
                fill="none"
                stroke="rgba(186, 230, 253, 0.45)"
                strokeWidth="4"
                strokeLinecap="round"
                className="vortex-arm arm-1"
              />
              <path
                d="M 200 200 Q 140 280 60 220 T 40 100"
                fill="none"
                stroke="rgba(125, 211, 252, 0.45)"
                strokeWidth="4"
                strokeLinecap="round"
                className="vortex-arm arm-2"
              />
              <path
                d="M 200 200 Q 280 260 220 340 T 100 360"
                fill="none"
                stroke="rgba(56, 189, 248, 0.5)"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="vortex-arm arm-3"
              />
              <path
                d="M 200 200 Q 120 140 180 60 T 300 40"
                fill="none"
                stroke="rgba(224, 242, 254, 0.6)"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="vortex-arm arm-4"
              />
            </svg>
          </div>

          {/* Caustics subaquáticos luminosos e gotas orbitando */}
          <div className="whirlpool-water-caustics" />
        </div>
      )}

      {/* 2. Vórtice Arcano Dimensional */}
      {transitionEffect === 'portal_arcane' && (
        <div className="arcane-portal-container">
          <div className="arcane-rune-ring outer-ring" />
          <div className="arcane-rune-ring middle-ring" />
          <div className="arcane-rune-ring inner-ring" />
          <div className="arcane-singularity-core" />
        </div>
      )}

      {/* 3. Névoa Mística */}
      {transitionEffect === 'mystic_mist' && (
        <div className="mystic-mist-container">
          <div className="mist-fog-layer layer-1" />
          <div className="mist-fog-layer layer-2" />
          <div className="mist-wisps" />
        </div>
      )}

      {/* 4. Vendaval de Folhas Encantadas */}
      {transitionEffect === 'leaf_dissolve' && (
        <div className="leaf-storm-container">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className={`swirling-leaf leaf-${(i % 4) + 1}`} style={{ '--i': i }} />
          ))}
        </div>
      )}

      {/* 5. Fenda de Relâmpago */}
      {transitionEffect === 'lightning_flash' && (
        <div className="lightning-flash-container">
          <div className="lightning-bolt" />
          <div className="lightning-glow-screen" />
        </div>
      )}

      {/* 6. Fade Suave */}
      {transitionEffect === 'fade' && (
        <div className="simple-fade-screen" />
      )}

      {/* Indicador Elegante de Destino Mágico */}
      {targetLocationName && (
        <div className="transition-location-badge">
          <span className="badge-rune">✧</span>
          <span className="badge-text">Viajando para <strong>{targetLocationName}</strong></span>
          <span className="badge-rune">✧</span>
        </div>
      )}
    </div>
  )
}
