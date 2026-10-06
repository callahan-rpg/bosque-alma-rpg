import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function EditProfileModal({ profile, onSave, onClose }) {
  const { profile: authProfile } = useAuth()

  // Nome do chat (independente da ficha): prefere chatName, cai no characterName
  const currentChatName = authProfile?.chatName || authProfile?.characterName || authProfile?.nick || profile?.name || ''
  const currentAvatarUrl = authProfile?.avatarUrl || profile?.avatarUrl || ''

  const [chatName, setChatName] = useState(currentChatName)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)

  const sheetName = authProfile?.characterName || authProfile?.nick || 'Viajante'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!chatName.trim()) return

    // Salva apenas chatName e avatarUrl — não altera characterName (ficha)
    onSave({
      chatName: chatName.trim(),
      avatarUrl: avatarUrl.trim()
    })
    onClose()
  }

  const handleResetToSheetName = () => {
    setChatName(sheetName)
  }

  return (
    <div className="chat-user-modal-overlay" onClick={onClose}>
      <div className="chat-user-modal-card profile-edit-card" onClick={(e) => e.stopPropagation()}>
        <div className="chat-user-modal-header">
          <div className="chat-user-modal-title">
            <span className="chat-user-status-dot online" />
            <span className="chat-user-header-name">Configurar Identidade do Chat</span>
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
            <p className="profile-avatar-hint">Insira o link da sua foto no campo abaixo</p>
          </div>

          <div className="profile-form-group">
            <label className="profile-form-label">
              Nome exibido no Chat:
              <span className="profile-chatname-hint">
                (independente da ficha do personagem)
              </span>
            </label>
            <input
              type="text"
              className="profile-form-input"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              placeholder="Ex: Alma, Valerius, Elora..."
              maxLength={24}
              required
            />
            {sheetName !== chatName && (
              <button
                type="button"
                className="profile-reset-name-btn"
                onClick={handleResetToSheetName}
                title={`Usar o nome da ficha: ${sheetName}`}
              >
                ↩ Usar nome da ficha ({sheetName})
              </button>
            )}
            <small className="profile-chatname-info">
              📜 Nome da ficha: <strong>{sheetName}</strong> — não será alterado aqui
            </small>
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
              Salvar Identidade do Chat
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
