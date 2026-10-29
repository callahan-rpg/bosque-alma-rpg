import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  calculateMaxHp,
  calculateMaxRam,
  CYBERPUNK_ROLES,
  CYBERPUNK_ATTRIBUTES_LIST
} from '../../firebase/cyberpunkService'

export default function CyberpunkCharacterPopupModal({
  targetUser,
  currentUser,
  onClose,
  onOpenPrivateChat
}) {
  const [cyberData, setCyberData] = useState(null)
  const [loadingData, setLoadingData] = useState(true)

  // Posição arrastável na tela
  const [pos, setPos] = useState(() => {
    const width = 370
    const height = 560
    const defaultX = Math.max(16, Math.min(window.innerWidth - width - 20, Math.round((window.innerWidth - width) / 2)))
    const defaultY = Math.max(70, Math.min(window.innerHeight - height - 20, Math.round((window.innerHeight - height) / 2)))
    return { x: defaultX, y: defaultY }
  })

  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const panelRef = useRef(null)

  const uid = targetUser?.uid || targetUser?.id

  // Carrega ficha do usuário do universo Cyberpunk
  useEffect(() => {
    let isMounted = true

    async function fetchCyberDetails() {
      if (!uid) {
        setLoadingData(false)
        return
      }

      try {
        setLoadingData(true)
        const docRef = doc(db, 'cyberpunk_characters', uid)
        const snap = await getDoc(docRef)
        if (isMounted) {
          if (snap.exists()) {
            setCyberData(snap.data())
          } else {
            setCyberData(null)
          }
          setLoadingData(false)
        }
      } catch (err) {
        console.error('[CyberpunkCharacterPopupModal] Erro ao buscar dados da ficha:', err)
        if (isMounted) setLoadingData(false)
      }
    }

    fetchCyberDetails()

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
      const maxX = panel ? window.innerWidth - panel.offsetWidth : window.innerWidth - 370
      const maxY = panel ? window.innerHeight - panel.offsetHeight : window.innerHeight - 560
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
      const maxX = panel ? window.innerWidth - panel.offsetWidth : window.innerWidth - 370
      const maxY = panel ? window.innerHeight - panel.offsetHeight : window.innerHeight - 560
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

  // Consolidação dos dados da ficha
  const handleName = cyberData?.handle || targetUser?.characterName || targetUser?.nick || 'Viajante'
  const avatarUrl = cyberData?.avatarUrl || targetUser?.avatarUrl || ''
  const roleClass = cyberData?.roleClass || 'dock_solo'
  const roleInfo = CYBERPUNK_ROLES.find(r => r.id === roleClass) || {
    name: 'Mercenário das Docas',
    icon: '🎯'
  }
  const faction = cyberData?.faction || 'Porto Seguro da Sentinela'
  const streetCred = cyberData?.streetCred || 1
  const eurodollars = cyberData?.eurodollars ?? 2000

  // Atributos exatos do RPG Cyberpunk Sentinela 1:
  // Força, Destreza, Sabedoria, Inteligência, Vitalidade
  const attributes = {
    forca: cyberData?.attributes?.forca ?? 10,
    destreza: cyberData?.attributes?.destreza ?? 10,
    sabedoria: cyberData?.attributes?.sabedoria ?? 10,
    inteligencia: cyberData?.attributes?.inteligencia ?? 10,
    vitalidade: cyberData?.attributes?.vitalidade ?? 10
  }

  // Cálculos vitais:
  // HP Máximo: 50 + vitalidade * 10
  // RAM Máxima (funciona como o vigor do Jardim): 10 + Math.floor(vitalidade / 2)
  const hpMax = calculateMaxHp(attributes.vitalidade)
  const ramMax = calculateMaxRam(attributes.vitalidade)
  const hpCurrent = Math.min(hpMax, cyberData?.hpCurrent ?? hpMax)
  const ramCurrent = Math.min(ramMax, cyberData?.ramCurrent ?? ramMax)

  const humanityMax = cyberData?.humanityMax || 100
  const humanityCurrent = Math.min(humanityMax, cyberData?.humanityCurrent ?? 85)

  const hpPercent = Math.min(100, Math.max(0, Math.round((hpCurrent / Math.max(1, hpMax)) * 100)))
  const ramPercent = Math.min(100, Math.max(0, Math.round((ramCurrent / Math.max(1, ramMax)) * 100)))
  const humanityPercent = Math.min(100, Math.max(0, Math.round((humanityCurrent / Math.max(1, humanityMax)) * 100)))

  // Abertura do dossiê / ficha completa
  const handleOpenSheet = () => {
    const targetUrl = isSelf ? '/cyberpunk/personagem' : `/cyberpunk/personagem/${uid}`
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const handlePrivateChat = () => {
    if (onOpenPrivateChat) {
      onOpenPrivateChat({
        uid,
        characterName: handleName,
        avatarUrl
      })
    }
    if (onClose) onClose()
  }

  return (
    <div
      ref={panelRef}
      className="cb-float-panel"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header com drag handle */}
      <div
        className="cb-popup-header"
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
        title="Clique e arraste para mover o HUD"
      >
        <div className="cb-popup-header-title">
          <span className="cb-drag-handle-dots" title="Arrastar">⠿</span>
          <span className="cb-popup-status-dot online" title="Sinal biométrico ativo na Sentinela 1" />
          <span className="cb-popup-header-tag">DOSSIÊ // SENTINELA 1</span>
        </div>
        <button
          type="button"
          className="cb-popup-close-btn"
          onClick={onClose}
          title="Fechar Card"
        >
          ✕
        </button>
      </div>

      {/* Hero com Avatar Holográfico & Identidade */}
      <div className="cb-popup-hero">
        <div className="cb-popup-avatar-container">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={handleName}
              className="cb-popup-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex'
                }
              }}
            />
          ) : null}
          <div
            className="cb-popup-avatar-placeholder"
            style={{ display: avatarUrl ? 'none' : 'flex' }}
          >
            👤
          </div>
          <span className="cb-popup-role-icon" title={roleInfo.name}>
            {roleInfo.icon}
          </span>
        </div>

        <div className="cb-popup-identity">
          <div className="cb-popup-role-line">
            <span className="cb-popup-role-badge">{roleInfo.name}</span>
            <span className="cb-popup-cred-badge">Cred Nv. {streetCred}</span>
          </div>

          <h3 className="cb-popup-name">{handleName}</h3>

          <div className="cb-popup-meta-row">
            <span className="cb-popup-meta-pill">🪐 Sentinela 1</span>
            <span className="cb-popup-meta-pill">🛡️ {faction}</span>
          </div>

          <div className="cb-popup-eddies">
            €$ {eurodollars.toLocaleString()} <span className="cb-eddies-sub">EDDIES</span>
          </div>
        </div>
      </div>

      {/* Barras de Status Vitais: HP, RAM (Vigor), Humanidade */}
      <div className="cb-popup-stats-section">
        {/* Barra de Vida (HP) */}
        <div className="cb-popup-bar-item">
          <div className="cb-popup-bar-labels">
            <span className="cb-popup-bar-title hp">
              <span className="bar-icon">❤️</span> INTEGRIDADE FÍSICA (HP)
            </span>
            <span className="cb-popup-bar-value">{hpCurrent} / {hpMax}</span>
          </div>
          <div className="cb-popup-bar-track hp">
            <div
              className="cb-popup-bar-fill hp"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Barra de RAM (Funciona como o Vigor) */}
        <div className="cb-popup-bar-item">
          <div className="cb-popup-bar-labels">
            <span className="cb-popup-bar-title ram">
              <span className="bar-icon">💾</span> MEMÓRIA RAM (VIGOR)
            </span>
            <span className="cb-popup-bar-value">{ramCurrent} / {ramMax} RAM</span>
          </div>
          <div className="cb-popup-bar-track ram">
            <div
              className="cb-popup-bar-fill ram"
              style={{ width: `${ramPercent}%` }}
            />
          </div>
        </div>

        {/* Barra de Humanidade */}
        <div className="cb-popup-bar-item">
          <div className="cb-popup-bar-labels">
            <span className="cb-popup-bar-title humanity">
              <span className="bar-icon">🧠</span> HUMANIDADE / PSICOSE
            </span>
            <span className="cb-popup-bar-value">{humanityCurrent} / {humanityMax}</span>
          </div>
          <div className="cb-popup-bar-track humanity">
            <div
              className="cb-popup-bar-fill humanity"
              style={{ width: `${humanityPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grade com os 5 Atributos Exatos: Força, Destreza, Sabedoria, Inteligência, Vitalidade */}
      <div className="cb-popup-attrs-section">
        <div className="cb-popup-attrs-header">
          <span className="cb-attrs-title">TELEMETRIA DE ATRIBUTOS</span>
          <span className="cb-attrs-sub">SENTINELA 1 CORE</span>
        </div>

        <div className="cb-popup-attrs-grid">
          {/* Força */}
          <div className="cb-popup-attr-card" title="Força: Potência mecânica bruta e manejo de carga">
            <span className="cb-attr-icon">🦾</span>
            <span className="cb-attr-label">FOR</span>
            <span className="cb-attr-num">{attributes.forca}</span>
          </div>

          {/* Destreza */}
          <div className="cb-popup-attr-card" title="Destreza: Reflexos sob microgravidade e precisão">
            <span className="cb-attr-icon">⚡</span>
            <span className="cb-attr-label">DES</span>
            <span className="cb-attr-num">{attributes.destreza}</span>
          </div>

          {/* Sabedoria */}
          <div className="cb-popup-attr-card" title="Sabedoria: Percepção situacional e intuição nas docas">
            <span className="cb-attr-icon">👁️</span>
            <span className="cb-attr-label">SAB</span>
            <span className="cb-attr-num">{attributes.sabedoria}</span>
          </div>

          {/* Inteligência */}
          <div className="cb-popup-attr-card" title="Inteligência: Hacking orbital, ciberespaço e criptografia">
            <span className="cb-attr-icon">🧠</span>
            <span className="cb-attr-label">INT</span>
            <span className="cb-attr-num">{attributes.inteligencia}</span>
          </div>

          {/* Vitalidade */}
          <div className="cb-popup-attr-card highlight" title="Vitalidade: Resistência a radiação e define HP/RAM">
            <span className="cb-attr-icon">❤️</span>
            <span className="cb-attr-label">VIT</span>
            <span className="cb-attr-num">{attributes.vitalidade}</span>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="cb-popup-actions-section">
        <button
          type="button"
          className="cb-popup-action-btn primary"
          onClick={handleOpenSheet}
          title="Abrir a Ficha de Personagem Completa em uma nova aba"
        >
          <span className="btn-icon">📁</span>
          <span className="btn-text">Dossiê Completo / Ficha</span>
          <span className="btn-arrow">↗</span>
        </button>

        {!isSelf && onOpenPrivateChat && (
          <button
            type="button"
            className="cb-popup-action-btn whisper"
            onClick={handlePrivateChat}
            title="Abrir canal privado criptografado"
          >
            <span>💬 Canal Privado</span>
          </button>
        )}
      </div>
    </div>
  )
}
