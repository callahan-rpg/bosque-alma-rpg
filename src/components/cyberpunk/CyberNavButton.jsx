import React from 'react'

export default function CyberNavButton({
  label,
  onClick,
  className = '',
  icon = '➔',
  disabled = false,
  title = '',
  position = 'right'
}) {
  const isLeft = position === 'left'

  return (
    <button
      type="button"
      className={`cb-nav-btn ${isLeft ? 'cb-nav-left' : 'cb-nav-right'} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
    >
      <div className="cb-nav-btn-glow" />
      <span className="cb-nav-btn-content">
        {isLeft && <span className="cb-nav-btn-icon">‹</span>}
        <span className="cb-nav-btn-label">{label}</span>
        {!isLeft && <span className="cb-nav-btn-icon">›</span>}
      </span>
      <div className="cb-nav-btn-corner-accent" />
    </button>
  )
}
