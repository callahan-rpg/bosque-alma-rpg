import { useState } from 'react'

export default function EditProfileModal({ profile, onSave, onClose }) {
  const [name, setName] = useState(profile?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '')

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      avatarUrl: avatarUrl.trim()
    })
    onClose()
  }

  return (
    <div className="chat-user-modal-overlay" onClick={onClose}>
      <div className="chat-user-modal-card profile-edit-card" onClick={(e) => e.stopPropagation()}>
        <div className="chat-user-modal-header">
          <div className="chat-user-modal-title">
            <span className="chat-user-status-dot online" />
            <span className="chat-user-header-name">Configurar Identidade</span>
          </div>
          <button type="button" className="chat-user-modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-edit-form">
          <div className="profile-avatar-preview-section">
            <div className="profile-current-avatar-circle">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar Preview" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <span className="profile-avatar-placeholder-icon">👤</span>
              )}
            </div>
            <p className="profile-avatar-hint">Escolha uma foto ou insira um link abaixo</p>
          </div>

          <div className="profile-presets-row">
            {PRESET_AVATARS.map((url, idx) => (
              <button
                key={idx}
                type="button"
                className={`profile-preset-avatar-btn ${avatarUrl === url ? 'selected' : ''}`}
                onClick={() => setAvatarUrl(url)}
              >
                <img src={url} alt={`Preset ${idx + 1}`} />
              </button>
            ))}
          </div>

          <div className="profile-form-group">
            <label className="profile-form-label">Seu Nome / Personagem:</label>
            <input
              type="text"
              className="profile-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alma, Valerius, Elora..."
              maxLength={24}
              required
            />
          </div>

          <div className="profile-form-group">
            <label className="profile-form-label">URL da Foto de Perfil (Opcional):</label>
            <input
              type="url"
              className="profile-form-input"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://exemplo.com/minha-foto.jpg"
            />
          </div>

          <div className="chat-user-modal-actions">
            <button type="submit" className="chat-action-btn primary">
              Salvar Identidade
            </button>
            <button type="button" className="chat-action-btn secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
