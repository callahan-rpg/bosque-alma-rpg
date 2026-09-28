import { useState } from 'react'
import { sendFriendRequest, removeFriend } from '../../utils/friendsService'

export default function ChatUserActionModal({
  targetUser,
  currentUser,
  currentChar,
  isFriend = false,
  isIgnored = false,
  isAdmin = false,
  onOpenPrivateChat,
  onToggleIgnore,
  onClose,
  onAdminAction
}) {
  const [friendLoading, setFriendLoading] = useState(false)
  const [friendStatusMsg, setFriendStatusMsg] = useState('')

  if (!targetUser) return null

  const isSelf = targetUser.uid === currentUser?.uid

  async function handleToggleFriend() {
    if (friendLoading || isSelf) return
    setFriendLoading(true)
    setFriendStatusMsg('')
    try {
      if (isFriend) {
        if (window.confirm(`Deseja desfazer a amizade com ${targetUser.characterName}?`)) {
          await removeFriend(currentUser.uid, targetUser.uid)
          setFriendStatusMsg('Amizade desfeita.')
        }
      } else {
        await sendFriendRequest(
          {
            uid: currentUser.uid,
            characterName: currentChar?.name || 'Viajante',
            avatarUrl: currentChar?.avatarUrl || null
          },
          targetUser
        )
        setFriendStatusMsg('Solicitação de amizade enviada!')
      }
    } catch (err) {
      console.error('[ChatUserActionModal] Erro:', err)
      setFriendStatusMsg('Erro ao atualizar amizade.')
    } finally {
      setFriendLoading(false)
    }
  }

  function handlePrivateChat() {
    onOpenPrivateChat(targetUser)
    onClose()
  }

  return (
    <div className="chat-user-modal-overlay" onClick={onClose}>
      <div className="chat-user-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="chat-user-modal-header">
          <div className="chat-user-modal-title">
            <span className="chat-user-status-dot online" />
            <span className="chat-user-header-name">
              {targetUser.characterName || 'Viajante'}
            </span>
          </div>
          <button
            type="button"
            className="chat-user-modal-close"
            onClick={onClose}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="chat-user-modal-body">
          <div className="chat-user-avatar-wrapper">
            {targetUser.avatarUrl ? (
              <img
                src={targetUser.avatarUrl}
                alt={targetUser.characterName}
                className="chat-user-modal-avatar"
              />
            ) : (
              <div className="chat-user-modal-avatar placeholder">
                👤
              </div>
            )}
          </div>

          <div className="chat-user-modal-info">
            <h4 className="chat-user-info-name">{targetUser.characterName}</h4>
            <p className="chat-user-info-loc">
              📍 <span>{targetUser.locationName || 'Bosque de Alma'}</span>
            </p>
            {targetUser.role === 'admin' && (
              <span className="chat-role-badge admin">Mestre / Guardiã</span>
            )}
            {friendStatusMsg && (
              <span className="chat-friend-status-feedback">{friendStatusMsg}</span>
            )}
          </div>
        </div>

        <div className="chat-user-modal-actions">
          {!isSelf && (
            <>
              <button
                type="button"
                className="chat-action-btn primary"
                onClick={handlePrivateChat}
              >
                💬 Sussurrar (Chat Privado)
              </button>

              <button
                type="button"
                className={`chat-action-btn ${isFriend ? 'danger' : 'secondary'}`}
                onClick={handleToggleFriend}
                disabled={friendLoading}
              >
                {isFriend ? '💔 Desfazer Amizade' : '👥 Adicionar Amigo'}
              </button>

              <button
                type="button"
                className={`chat-action-btn ${isIgnored ? 'active-warning' : 'secondary'}`}
                onClick={() => onToggleIgnore(targetUser.uid)}
              >
                {isIgnored ? '🔊 Desbloquear Voz' : '🚫 Ignorar Mensagens'}
              </button>
            </>
          )}

          {/* Ações Administrativas de Mestre */}
          {isAdmin && !isSelf && (
            <div className="chat-admin-actions-section">
              <div className="chat-admin-divider"><span>Ações de Mestre</span></div>
              <button
                type="button"
                className="chat-action-btn danger"
                onClick={() => {
                  if (window.confirm(`Deseja silenciar ${targetUser.characterName}?`)) {
                    onAdminAction?.(targetUser, 'mute')
                    onClose()
                  }
                }}
              >
                🔨 Silenciar Mensagens
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
