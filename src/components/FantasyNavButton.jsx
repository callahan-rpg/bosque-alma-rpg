import React from 'react'

/**
 * FantasyNavButton
 * Botão de navegação RPG inspirado em pedras de ametista, moldura metálica chanfrada,
 * gemas brilhantes nas extremidades e tipografia gótica/fantasia.
 */
export default function FantasyNavButton({
  label,
  onClick,
  className = '',
  icon = null,
  disabled = false,
  title = '',
  style = {}
}) {
  const textStr = typeof label === 'string' ? label : ''
  const lengthClass = textStr.length > 20 ? 'is-very-compact' : textStr.length > 14 ? 'is-compact' : ''

  return (
    <button
      type="button"
      className={`fantasy-rpg-btn ${lengthClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || textStr}
      style={style}
    >
      {/* Moldura de Fundo em SVG com acabamento chanfrado de alta fidelidade */}
      <div className="fantasy-btn-frame">
        <svg
          className="fantasy-btn-svg"
          viewBox="0 0 280 64"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Gradientes da Moldura Metálica Externa */}
            <linearGradient id="metalTopBevel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4a4f5d" />
              <stop offset="40%" stopColor="#2e3340" />
              <stop offset="100%" stopColor="#15171e" />
            </linearGradient>

            <linearGradient id="metalBottomBevel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1d24" />
              <stop offset="60%" stopColor="#2a2e3a" />
              <stop offset="100%" stopColor="#454b59" />
            </linearGradient>

            {/* Gradiente da Face de Pedra Ametista Central */}
            <linearGradient id="amethystCoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#12051e" />
              <stop offset="25%" stopColor="#240a3d" />
              <stop offset="48%" stopColor="#3d1163" />
              <stop offset="50%" stopColor="#551a8b" />
              <stop offset="52%" stopColor="#3d1163" />
              <stop offset="78%" stopColor="#22093a" />
              <stop offset="100%" stopColor="#10031c" />
            </linearGradient>

            {/* Gradiente da Borda Roxa de Neon Interna */}
            <linearGradient id="purpleNeonEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="20%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#e9d5ff" />
              <stop offset="80%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>

            {/* Gradiente das Gemas Laterais em Gota/Amêndoa */}
            <radialGradient id="gemGlow" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#f0abfc" />
              <stop offset="55%" stopColor="#c026d3" />
              <stop offset="85%" stopColor="#6b21a8" />
              <stop offset="100%" stopColor="#2e1065" />
            </radialGradient>

            {/* Gradiente das Gemas Menores dos Cantos */}
            <radialGradient id="cornerGem" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#e879f9" />
              <stop offset="75%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#3b0764" />
            </radialGradient>

            {/* Filtro de Brilho Místico */}
            <filter id="purpleGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Sombra Externa do Botão */}
          <polygon
            points="28,2 252,2 278,32 252,62 28,62 2,32"
            fill="#060408"
            opacity="0.9"
            transform="translate(0, 1.5)"
          />

          {/* Base Chanfrada Metálica Externa */}
          <polygon
            points="28,2 252,2 278,32 252,62 28,62 2,32"
            fill="url(#metalTopBevel)"
            stroke="#1c1f26"
            strokeWidth="1.5"
          />

          {/* Destaque Metálico Superior (Luz refletida) */}
          <polyline
            points="3,31 28,3 252,3 277,31"
            fill="none"
            stroke="#636b7d"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Sombra Metálica Inferior */}
          <polyline
            points="3,33 28,61 252,61 277,33"
            fill="none"
            stroke="#0b0d11"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Moldura Interna Chanfrada */}
          <polygon
            points="33,7 247,7 269,32 247,57 33,57 11,32"
            fill="#100b17"
            stroke="#1d152b"
            strokeWidth="1"
          />

          {/* Núcleo de Ametista (Fundo do Botão) */}
          <polygon
            points="36,9 244,9 265,32 244,55 36,55 15,32"
            fill="url(#amethystCoreGrad)"
          />

          {/* Borda Neon Roxa Interna */}
          <polygon
            points="37,10 243,10 263,32 243,54 37,54 17,32"
            fill="none"
            stroke="url(#purpleNeonEdge)"
            strokeWidth="1.6"
            strokeOpacity="0.85"
            className="fantasy-svg-neon-edge"
          />

          {/* ── GEMA ESQUERDA (Amêndoa / Teardrop) ── */}
          {/* Engaste / Bezel Metálico */}
          <path
            d="M 12 32 C 12 24, 27 25, 27 32 C 27 39, 12 40, 12 32 Z"
            fill="#1a1c23"
            stroke="#3a3f4d"
            strokeWidth="1"
          />
          {/* Gema de Ametista */}
          <path
            d="M 14 32 C 14 26, 25 27, 25 32 C 25 37, 14 38, 14 32 Z"
            fill="url(#gemGlow)"
            className="fantasy-side-gem"
          />
          {/* Brilho da Gema Esquerda */}
          <ellipse cx="18" cy="30" rx="2.5" ry="1.2" fill="#ffffff" opacity="0.9" />

          {/* ── GEMA DIREITA (Amêndoa / Teardrop) ── */}
          {/* Engaste / Bezel Metálico */}
          <path
            d="M 268 32 C 268 24, 253 25, 253 32 C 253 39, 268 40, 268 32 Z"
            fill="#1a1c23"
            stroke="#3a3f4d"
            strokeWidth="1"
          />
          {/* Gema de Ametista */}
          <path
            d="M 266 32 C 266 26, 255 27, 255 32 C 255 37, 266 38, 266 32 Z"
            fill="url(#gemGlow)"
            className="fantasy-side-gem"
          />
          {/* Brilho da Gema Direita */}
          <ellipse cx="262" cy="30" rx="2.5" ry="1.2" fill="#ffffff" opacity="0.9" />

          {/* ── 4 GEMAS PEQUENAS DOS CANTOS (Rebites / Studs) ── */}
          {/* Canto Superior Esquerdo */}
          <circle cx="34" cy="9" r="3.2" fill="#1e222a" stroke="#4b5263" strokeWidth="0.8" />
          <circle cx="34" cy="9" r="2.2" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="33.5" cy="8.5" r="0.7" fill="#ffffff" opacity="0.9" />

          {/* Canto Superior Direito */}
          <circle cx="246" cy="9" r="3.2" fill="#1e222a" stroke="#4b5263" strokeWidth="0.8" />
          <circle cx="246" cy="9" r="2.2" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="245.5" cy="8.5" r="0.7" fill="#ffffff" opacity="0.9" />

          {/* Canto Inferior Esquerdo */}
          <circle cx="34" cy="55" r="3.2" fill="#1e222a" stroke="#4b5263" strokeWidth="0.8" />
          <circle cx="34" cy="55" r="2.2" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="33.5" cy="54.5" r="0.7" fill="#ffffff" opacity="0.9" />

          {/* Canto Inferior Direito */}
          <circle cx="246" cy="55" r="3.2" fill="#1e222a" stroke="#4b5263" strokeWidth="0.8" />
          <circle cx="246" cy="55" r="2.2" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="245.5" cy="54.5" r="0.7" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>

      {/* Camada de Brilho e Shimmer Especular no Hover */}
      <div className="fantasy-btn-shimmer" />

      {/* Rótulo de Texto com Tipografia Fantasia e Brilho Lilás */}
      <span className="fantasy-btn-text">
        {icon && <span className="fantasy-btn-icon">{icon}</span>}
        <span className="fantasy-btn-label">{label}</span>
      </span>
    </button>
  )
}
