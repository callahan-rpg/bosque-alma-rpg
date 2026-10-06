import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { calculateMaxHp, calculateMaxVigor } from '../../utils/characterStats'
import { sendFriendRequest, removeFriend } from '../../utils/friendsService'

export default function CharacterPopupModal({
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
  const [fullData, setFullData] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [friendLoading, setFriendLoading] = useState(false)
  const [friendStatusMsg, setFriendStatusMsg] = useState('')

  // Posição arrastável na tela
  const [pos, setPos] = useState(() => {
    const width = 360
    const height = 540
    const defaultX = Math.max(16, Math.min(window.innerWidth - width - 20, Math.round((window.innerWidth - width) / 2)))
    const defaultY = Math.max(70, Math.min(window.innerHeight - height - 20, Math.round((window.innerHeight - height) / 2)))
    return { x: defaultX, y: defaultY }
  })

  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const panelRef = useRef(null)

  const uid = targetUser?.uid || targetUser?.id

  // Carrega dados completos do Firestore
  useEffect(() => {
    let isMounted = true

    async function fetchCharacterDetails() {
      if (!uid) {
        setLoadingData(false)
        return
      }

      try {
        setLoadingData(true)
        const docRef = doc(db, 'players', uid)
        const snap = await getDoc(docRef)
        if (isMounted) {
          if (snap.exists()) {
            setFullData(snap.data())
          } else {
            setFullData(null)
          }
          setLoadingData(false)
        }
      } catch (err) {
        console.error('[CharacterPopupModal] Erro ao buscar dados do jogador:', err)
        if (isMounted) setLoadingData(false)
      }
    }

    fetchCharacterDetails()

    return () => {
      isMounted = false
    }
  }, [uid])

  // Handlers para arrastar (mouse e touch)
  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input')) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  const onHeaderTouchStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input')) return
    const touch = e.touches[0]
    dragging.current = true
    dragStart.current = { mx: touch.clientX, my: touch.clientY, px: pos.x, py: pos.y }
  }, [pos])

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      const panel = panelRef.current
      const maxX = panel ? window.innerWidth - panel.offsetWidth : window.innerWidth - 360
      const maxY = panel ? window.innerHeight - panel.offsetHeight : window.innerHeight - 500
      setPos({
        x: Math.max(0, Math.min(dragStart.current.px + dx, Math.max(0, maxX))),
        y: Math.max(0, Math.min(dragStart.current.py + dy, Math.max(0, maxY))),
      })
    }

    function onTouchMove(e) {
      if (!dragging.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - dragStart.current.mx
      const dy = touch.clientY - dragStart.current.my
      const panel = panelRef.current
      const maxX = panel ? window.innerWidth - panel.offsetWidth : window.innerWidth - 360
      const maxY = panel ? window.innerHeight - panel.offsetHeight : window.innerHeight - 500
      setPos({
        x: Math.max(0, Math.min(dragStart.current.px + dx, Math.max(0, maxX))),
        y: Math.max(0, Math.min(dragStart.current.py + dy, Math.max(0, maxY))),
      })
    }

    function onEnd() {
      dragging.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [])

  if (!targetUser) return null

  const isSelf = uid === currentUser?.uid

  // Dados consolidados
  const charName = fullData?.characterName || fullData?.nick || targetUser?.characterName || targetUser?.nick || 'Viajante'
  const race = fullData?.race || targetUser?.race || 'Humano'
  const level = fullData?.level || targetUser?.level || 1
  const avatarUrl = fullData?.avatarUrl || targetUser?.avatarUrl || ''
  const locationName = fullData?.locationName || targetUser?.locationName || 'Bosque de Alma'

  const attributes = {
    forca: fullData?.attributes?.forca ?? targetUser?.attributes?.forca ?? 10,
    destreza: fullData?.attributes?.destreza ?? targetUser?.attributes?.destreza ?? 10,
    poder: fullData?.attributes?.poder ?? targetUser?.attributes?.poder ?? 10,
    sabedoria: fullData?.attributes?.sabedoria ?? targetUser?.attributes?.sabedoria ?? 10,
    vitalidade: fullData?.attributes?.vitalidade ?? targetUser?.attributes?.vitalidade ?? 10
  }

  // Cálculos de HP e Vigor
  const hpMax = calculateMaxHp(attributes.vitalidade)
  const vigorMax = calculateMaxVigor(attributes.vitalidade)

  const hpCurrent = Math.min(hpMax, fullData?.hpCurrent ?? targetUser?.hpCurrent ?? hpMax)
  const vigorCurrent = Math.min(vigorMax, fullData?.vigorCurrent ?? fullData?.almaCurrent ?? targetUser?.vigorCurrent ?? targetUser?.almaCurrent ?? vigorMax)

  const hpPercent = Math.min(100, Math.max(0, Math.round((hpCurrent / Math.max(1, hpMax)) * 100)))
  const vigorPercent = Math.min(100, Math.max(0, Math.round((vigorCurrent / Math.max(1, vigorMax)) * 100)))

  const individualityName = fullData?.individuality?.name || targetUser?.individuality?.name || ''

  // Ação ao clicar em "Inventário" — abre em nova guia
  const handleOpenInventoryTab = () => {
    const targetUrl = isSelf ? '/personagem' : `/personagem/${uid}`
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleToggleFriend() {
    if (friendLoading || isSelf || !currentUser?.uid) return
    setFriendLoading(true)
    setFriendStatusMsg('')
    try {
      if (isFriend) {
        if (window.confirm(`Deseja desfazer a amizade com ${charName}?`)) {
          await removeFriend(currentUser.uid, uid)
          setFriendStatusMsg('Amizade desfeita.')
        }
      } else {
        await sendFriendRequest(
          {
            uid: currentUser.uid,
            characterName: currentChar?.name || 'Viajante',
            avatarUrl: currentChar?.avatarUrl || null
          },
          {
            uid,
            characterName: charName,
            avatarUrl
          }
        )
        setFriendStatusMsg('Solicitação enviada!')
      }
    } catch (err) {
      console.error('[CharacterPopupModal] Erro na amizade:', err)
      setFriendStatusMsg('Erro ao atualizar amizade.')
    } finally {
      setFriendLoading(false)
    }
  }

  function handlePrivateChat() {
    if (onOpenPrivateChat) {
      onOpenPrivateChat({
        uid,
        characterName: charName,
        avatarUrl
      })
    }
    if (onClose) onClose()
  }

  return (
    <div
      ref={panelRef}
      className="char-float-panel"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cabeçalho do Card com Drag Handle */}
      <div
        className="char-popup-header"
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
        title="Clique e arraste para mover"
      >
        <div className="char-popup-header-title">
          <span className="char-drag-handle-dots" title="Arrastar">⠿</span>
          <span className="char-popup-status-dot online" title="Presente no Bosque" />
          <span className="char-popup-header-name">{charName}</span>
        </div>
        <button
          type="button"
          className="char-popup-close-btn"
          onClick={onClose}
          title="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Banner com Avatar e Identidade */}
      <div className="char-popup-hero">
        <div className="char-popup-avatar-container">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={charName}
              className="char-popup-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex'
                }
              }}
            />
          ) : null}
          <div
            className="char-popup-avatar-placeholder"
            style={{ display: avatarUrl ? 'none' : 'flex' }}
          >
            👤
          </div>
          <span className="char-popup-level-badge">Nv. {level}</span>
        </div>

        <div className="char-popup-identity">
          <h3 className="char-popup-name">{charName}</h3>
          <div className="char-popup-meta-row">
            <span className="char-popup-race-badge">{race}</span>
            <span className="char-popup-loc-badge">📍 {locationName}</span>
          </div>
          {(targetUser.role === 'admin' || fullData?.role === 'admin' || fullData?.role === 'master') && (
            <span className="char-popup-role-badge">🔮 MESTRE DO BOSQUE</span>
          )}
          {individualityName && (
            <span className="char-popup-individuality-pill" title="Individualidade Arcana">
              ✨ {individualityName}
            </span>
          )}
          {friendStatusMsg && (
            <span className="char-popup-feedback-msg">{friendStatusMsg}</span>
          )}
        </div>
      </div>

      {/* Barras de Status Vitais: HP e Vigor */}
      <div className="char-popup-stats-section">
        {/* Barra de Vida */}
        <div className="char-popup-bar-item">
          <div className="char-popup-bar-labels">
            <span className="char-popup-bar-title">
              <span className="bar-icon">❤️</span> VIDA (HP)
            </span>
            <span className="char-popup-bar-value">{hpCurrent} / {hpMax}</span>
          </div>
          <div className="char-popup-bar-track hp">
            <div
              className="char-popup-bar-fill hp"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Barra de Vigor */}
        <div className="char-popup-bar-item">
          <div className="char-popup-bar-labels">
            <span className="char-popup-bar-title">
              <span className="bar-icon">⚡</span> VIGOR
            </span>
            <span className="char-popup-bar-value">{vigorCurrent} / {vigorMax}</span>
          </div>
          <div className="char-popup-bar-track vigor">
            <div
              className="char-popup-bar-fill vigor"
              style={{ width: `${vigorPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grade de Atributos */}
      <div className="char-popup-attributes-section">
        <div className="char-popup-attrs-title">Atributos</div>
        <div className="char-popup-attrs-grid">
          <div className="char-popup-attr-card" title="Força">
            <span className="attr-icon">⚔️</span>
            <span className="attr-abbr">FOR</span>
            <span className="attr-num">{attributes.forca}</span>
          </div>
          <div className="char-popup-attr-card" title="Destreza">
            <span className="attr-icon">🏃</span>
            <span className="attr-abbr">DES</span>
            <span className="attr-num">{attributes.destreza}</span>
          </div>
          <div className="char-popup-attr-card" title="Poder">
            <span className="attr-icon">🔮</span>
            <span className="attr-abbr">POD</span>
            <span className="attr-num">{attributes.poder}</span>
          </div>
          <div className="char-popup-attr-card" title="Sabedoria">
            <span className="attr-icon">📜</span>
            <span className="attr-abbr">SAB</span>
            <span className="attr-num">{attributes.sabedoria}</span>
          </div>
          <div className="char-popup-attr-card" title="Vitalidade">
            <span className="attr-icon">🛡️</span>
            <span className="attr-abbr">VIT</span>
            <span className="attr-num">{attributes.vitalidade}</span>
          </div>
        </div>
      </div>

      {/* Botão de Inventário & Ações */}
      <div className="char-popup-actions-section">
        {/* Botão Principal de Inventário (abre em nova guia) */}
        <button
          type="button"
          className="char-popup-inventory-btn"
          onClick={handleOpenInventoryTab}
          title="Abrir ficha e inventário completo em uma nova guia"
        >
          <span className="inv-icon">🎒</span>
          <span className="inv-text">Inventário</span>
          <span className="inv-tab-icon">↗</span>
        </button>

        {/* Ações Sociais */}
        {!isSelf && (
          <div className="char-popup-social-row">
            {onOpenPrivateChat && (
              <button
                type="button"
                className="char-popup-sub-btn whisper"
                onClick={handlePrivateChat}
                title="Enviar sussurro privado"
              >
                💬 Sussurrar
              </button>
            )}

            <button
              type="button"
              className={`char-popup-sub-btn friend ${isFriend ? 'is-friend' : ''}`}
              onClick={handleToggleFriend}
              disabled={friendLoading}
              title={isFriend ? 'Desfazer amizade' : 'Adicionar como amigo'}
            >
              {isFriend ? '💔 Amigo' : '👥 Adicionar'}
            </button>

            {onToggleIgnore && (
              <button
                type="button"
                className={`char-popup-sub-btn ignore ${isIgnored ? 'active' : ''}`}
                onClick={() => onToggleIgnore(uid)}
                title={isIgnored ? 'Desbloquear mensagens deste usuário' : 'Ignorar mensagens deste usuário'}
              >
                {isIgnored ? '🔊 Desbloquear' : '🚫 Ignorar'}
              </button>
            )}
          </div>
        )}

        {/* Ação de Mestre / Admin */}
        {isAdmin && !isSelf && (
          <div className="char-popup-admin-row">
            <button
              type="button"
              className="char-popup-sub-btn admin-mute"
              onClick={() => {
                if (window.confirm(`Deseja silenciar as mensagens de ${charName}?`)) {
                  onAdminAction?.(targetUser, 'mute')
                  if (onClose) onClose()
                }
              }}
            >
              🔨 Silenciar Mensagens
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
