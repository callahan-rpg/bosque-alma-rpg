export default function VeuNavButton({ label, onClick, position = 'right' }) {
  return (
    <button
      type="button"
      className="veu-nav-btn"
      onClick={onClick}
      title={`Caminhar para ${label}`}
    >
      {position === 'left' && <span style={{ color: '#ef4444' }}>←</span>}
      <span>{label}</span>
      {position !== 'left' && <span style={{ color: '#ef4444' }}>→</span>}
    </button>
  )
}

