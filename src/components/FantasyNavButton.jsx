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
      {/* Moldura de Fundo em SVG com acabamento chanfrado mais fino e elegante */}
      <div className="fantasy-btn-frame">
        <svg
          className="fantasy-btn-svg"
          viewBox="0 0 280 52"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Gradientes da Moldura Metálica Externa Mais Fina */}
            <linearGradient id="metalTopBevel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3d424f" />
              <stop offset="40%" stopColor="#252934" />
              <stop offset="100%" stopColor="#12141a" />
            </linearGradient>

            <linearGradient id="metalBottomBevel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#15171d" />
              <stop offset="60%" stopColor="#232731" />
              <stop offset="100%" stopColor="#383d49" />
            </linearGradient>

            {/* Gradiente da Face de Pedra Ametista Central */}
            <linearGradient id="amethystCoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#150624" />
              <stop offset="25%" stopColor="#260b40" />
              <stop offset="50%" stopColor="#3d1163" />
              <stop offset="75%" stopColor="#240a3c" />
              <stop offset="100%" stopColor="#12041e" />
            </linearGradient>

            {/* Gradiente da Borda Roxa de Neon Interna */}
            <linearGradient id="purpleNeonEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="25%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#d8b4fe" />
              <stop offset="75%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
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
          </defs>

          {/* Sombra Externa do Botão */}
          <polygon
            points="24,2 256,2 278,26 256,50 24,50 2,26"
            fill="#050307"
            opacity="0.85"
            transform="translate(0, 1)"
          />

          {/* Base Chanfrada Metálica Externa Fina */}
          <polygon
            points="24,2 256,2 278,26 256,50 24,50 2,26"
            fill="url(#metalTopBevel)"
            stroke="#16181f"
            strokeWidth="1"
          />

          {/* Destaque Metálico Superior Sutil */}
          <polyline
            points="3,25 24,2.5 256,2.5 277,25"
            fill="none"
            stroke="#4e5566"
            strokeWidth="0.9"
            strokeLinecap="round"
          />

          {/* Sombra Metálica Inferior */}
          <polyline
            points="3,27 24,49.5 256,49.5 277,27"
            fill="none"
            stroke="#0a0c10"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* Núcleo de Ametista Expandido (Borda cinza mais fina) */}
          <polygon
            points="25,4.5 255,4.5 273,26 255,47.5 25,47.5 7,26"
            fill="url(#amethystCoreGrad)"
          />

          {/* Borda Neon Roxa Interna Delicada */}
          <polygon
            points="26,5.5 254,5.5 271,26 254,46.5 26,46.5 9,26"
            fill="none"
            stroke="url(#purpleNeonEdge)"
            strokeWidth="1.2"
            strokeOpacity="0.85"
            className="fantasy-svg-neon-edge"
          />

          {/* ── GEMA ESQUERDA (Amêndoa / Teardrop) ── */}
          <path
            d="M 6 26 C 6 20, 18 20, 18 26 C 18 32, 6 32, 6 26 Z"
            fill="#14161c"
            stroke="#2f3440"
            strokeWidth="0.8"
          />
          <path
            d="M 7.5 26 C 7.5 21, 16.5 21, 16.5 26 C 16.5 31, 7.5 31, 7.5 26 Z"
            fill="url(#gemGlow)"
            className="fantasy-side-gem"
          />
          <ellipse cx="11" cy="24.5" rx="1.8" ry="0.9" fill="#ffffff" opacity="0.9" />

          {/* ── GEMA DIREITA (Amêndoa / Teardrop) ── */}
          <path
            d="M 274 26 C 274 20, 262 20, 262 26 C 262 32, 274 32, 274 26 Z"
            fill="#14161c"
            stroke="#2f3440"
            strokeWidth="0.8"
          />
          <path
            d="M 272.5 26 C 272.5 21, 263.5 21, 263.5 26 C 263.5 31, 272.5 31, 272.5 26 Z"
            fill="url(#gemGlow)"
            className="fantasy-side-gem"
          />
          <ellipse cx="269" cy="24.5" rx="1.8" ry="0.9" fill="#ffffff" opacity="0.9" />

          {/* ── 4 GEMAS PEQUENAS DOS CANTOS (Rebites / Studs) ── */}
          {/* Superior Esquerdo */}
          <circle cx="25" cy="5" r="2.2" fill="#181b22" stroke="#3d4352" strokeWidth="0.6" />
          <circle cx="25" cy="5" r="1.4" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="24.6" cy="4.6" r="0.5" fill="#ffffff" opacity="0.9" />

          {/* Superior Direito */}
          <circle cx="255" cy="5" r="2.2" fill="#181b22" stroke="#3d4352" strokeWidth="0.6" />
          <circle cx="255" cy="5" r="1.4" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="254.6" cy="4.6" r="0.5" fill="#ffffff" opacity="0.9" />

          {/* Inferior Esquerdo */}
          <circle cx="25" cy="47" r="2.2" fill="#181b22" stroke="#3d4352" strokeWidth="0.6" />
          <circle cx="25" cy="47" r="1.4" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="24.6" cy="46.6" r="0.5" fill="#ffffff" opacity="0.9" />

          {/* Inferior Direito */}
          <circle cx="255" cy="47" r="2.2" fill="#181b22" stroke="#3d4352" strokeWidth="0.6" />
          <circle cx="255" cy="47" r="1.4" fill="url(#cornerGem)" className="fantasy-corner-gem" />
          <circle cx="254.6" cy="46.6" r="0.5" fill="#ffffff" opacity="0.9" />
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
