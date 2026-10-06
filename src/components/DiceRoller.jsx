import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext.jsx'

const DICE_TYPES = [
  { type: 'D4',   faces: 4,   icon: '▲' },
  { type: 'D6',   faces: 6,   icon: '⬡' },
  { type: 'D10',  faces: 10,  icon: '◆' },
  { type: 'D20',  faces: 20,  icon: '⬟' },
  { type: 'D100', faces: 100, icon: '●' },
]

const MIN_WIDTH  = 280
const MAX_WIDTH  = 520
const MIN_HEIGHT = 340

export default function DiceRoller({ onClose }) {
  const { user, character, profile } = useAuth()
  const chatDisplayName = profile?.chatName || character?.name || profile?.characterName || profile?.nick || 'Viajante'
  const [selected, setSelected] = useState(DICE_TYPES[2]) // D10 padrão
  const [count, setCount]       = useState(1)
  const [rolling, setRolling]   = useState(false)
  const [result, setResult]     = useState(null)
  const [history, setHistory]   = useState([])

  const [pos, setPos]         = useState({ x: Math.max(20, window.innerWidth - 340), y: 90 })
  const [size, setSize]       = useState({ w: 300, h: null })

  const dragging    = useRef(false)
  const resizing    = useRef(false)
  const resizeEdge  = useRef(null)
  const dragStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const resizeStart = useRef({ mx: 0, my: 0, w: 300, h: 0, px: 0, py: 0 })
  const panelRef    = useRef(null)

  useEffect(() => {
    let unsub = () => {}
    try {
      const q = query(
        collection(db, 'dice_rolls'),
        orderBy('timestamp', 'desc'),
        limit(20)
      )
      unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          setHistory(list)
        },
        (err) => {
          console.warn('[DiceRoller] onSnapshot ordenado falhou, tentando fallback:', err)
          try {
            const qFallback = query(collection(db, 'dice_rolls'), limit(20))
            unsub = onSnapshot(qFallback, (snap) => {
              const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
              list.sort((a, b) => {
                const getMs = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : new Date(t || 0).getTime())
                return getMs(b.timestamp) - getMs(a.timestamp)
              })
              setHistory(list)
            })
          } catch (e) {
            console.error('[DiceRoller] Erro no fallback do snapshot:', e)
          }
        }
      )
    } catch (err) {
      console.error('[DiceRoller] Falha ao iniciar escuta de rolagens:', err)
    }
    return () => unsub()
  }, [])

  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  const onResizeMouseDown = useCallback((edge) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current  = true
    resizeEdge.current = edge
    const panel = panelRef.current
    const curH = panel ? panel.offsetHeight : MIN_HEIGHT
    resizeStart.current = {
      mx: e.clientX,
      my: e.clientY,
      w:  size.w,
      h:  curH,
      px: pos.x,
      py: pos.y,
    }
  }, [size, pos])

  useEffect(() => {
    function onMouseMove(e) {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx
        const dy = e.clientY - dragStart.current.my
        const panel = panelRef.current
        const maxX = panel ? window.innerWidth  - panel.offsetWidth  : 9999
        const maxY = panel ? window.innerHeight - panel.offsetHeight : 9999
        setPos({
          x: Math.max(0, Math.min(dragStart.current.px + dx, maxX)),
          y: Math.max(0, Math.min(dragStart.current.py + dy, maxY)),
        })
        return
      }

      if (resizing.current) {
        const dx = e.clientX - resizeStart.current.mx
        const dy = e.clientY - resizeStart.current.my
        const edge = resizeEdge.current

        let newW = resizeStart.current.w
        let newH = resizeStart.current.h
        let newPx = resizeStart.current.px

        if (edge === 'right')        { newW = resizeStart.current.w + dx }
        if (edge === 'left')         { newW = resizeStart.current.w - dx; newPx = resizeStart.current.px + dx }
        if (edge === 'bottom')       { newH = resizeStart.current.h + dy }
        if (edge === 'bottom-right') { newW = resizeStart.current.w + dx; newH = resizeStart.current.h + dy }
        if (edge === 'bottom-left')  { newW = resizeStart.current.w - dx; newH = resizeStart.current.h + dy; newPx = resizeStart.current.px + dx }

        newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newW))
        newH = newH < MIN_HEIGHT ? null : newH

        setSize({ w: newW, h: newH })
        if (edge === 'left' || edge === 'bottom-left') {
          setPos((prev) => ({ ...prev, x: Math.max(0, newPx) }))
        }
      }
    }

    function onMouseUp() {
      dragging.current  = false
      resizing.current  = false
      resizeEdge.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [])

  function handleSelectDice(d) {
    if (selected.type === d.type) {
      setCount((prev) => (prev >= 5 ? prev : prev + 1))
    } else {
      setSelected(d)
      setCount(1)
    }
    setResult(null)
  }

  function decreaseCount() {
    setCount((prev) => (prev > 1 ? prev - 1 : 1))
    setResult(null)
  }

  async function roll() {
    if (rolling) return
    setRolling(true)
    setResult(null)
    await new Promise((r) => setTimeout(r, 600))

    const currentRolls = Array.from({ length: count }, () => Math.floor(Math.random() * selected.faces) + 1)
    const total = currentRolls.reduce((acc, v) => acc + v, 0)
    const diceName = count > 1 ? `${count}${selected.type}` : selected.type

    const rollData = { total, rolls: currentRolls, diceType: diceName, faces: selected.faces, count }
    setResult(rollData)
    setRolling(false)

    const now = new Date()
    const newEntry = {
      playerUid: user?.uid || 'anon',
      uid: user?.uid || 'anon',
      playerName: chatDisplayName,
      characterName: chatDisplayName,
      avatarUrl: character?.avatarUrl || '',
      diceType: diceName,
      dice: diceName,
      label: diceName,
      faces: selected.faces,
      count,
      rolls: currentRolls,
      results: currentRolls,
      result: total,
      total,
      timestamp: now,
    }

    // Atualização otimista imediata no histórico local
    setHistory((prev) => [
      { id: 'local_' + Date.now(), ...newEntry },
      ...prev.filter((p) => !p.id.startsWith('local_')).slice(0, 19),
    ])

    try {
      await addDoc(collection(db, 'dice_rolls'), {
        ...newEntry,
        timestamp: serverTimestamp(),
      })
    } catch (err) {
      console.warn('[DiceRoller] Erro ao salvar rolagem no Firebase:', err)
    }
  }

  function formatTime(ts) {
    if (!ts) return 'agora'
    if (ts.toDate) {
      return ts.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    if (ts instanceof Date) {
      return ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    const d = new Date(ts)
    if (isNaN(d.getTime())) return 'agora'
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const diceLabel = count > 1 ? `${count}${selected.type}` : selected.type

  const isCritFail    = result && (result.count === 1 ? result.total === 1    : result.total === result.count)
  const isCritSuccess = result && (result.count === 1 ? result.total === result.faces : result.total === result.count * result.faces)
  const resultColorClass = isCritFail ? 'crit-fail' : isCritSuccess ? 'crit-success' : ''

  const panelStyle = {
    left:   pos.x,
    top:    pos.y,
    width:  size.w,
    ...(size.h !== null ? { height: size.h, overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {}),
  }

  return (
    <div ref={panelRef} className="dice-float-panel" style={panelStyle}>
      <div className="resize-handle resize-right"       onMouseDown={onResizeMouseDown('right')} />
      <div className="resize-handle resize-left"        onMouseDown={onResizeMouseDown('left')} />
      <div className="resize-handle resize-bottom"      onMouseDown={onResizeMouseDown('bottom')} />
      <div className="resize-handle resize-bottom-right" onMouseDown={onResizeMouseDown('bottom-right')} />
      <div className="resize-handle resize-bottom-left"  onMouseDown={onResizeMouseDown('bottom-left')} />

      <div className="dice-float-header" onMouseDown={onHeaderMouseDown}>
        <span className="dice-float-title">🎲 DADOS</span>
        <button className="dice-close" onClick={onClose} title="Fechar">×</button>
      </div>

      <div className="dice-float-types">
        {DICE_TYPES.map((d) => {
          const isSelected = selected.type === d.type
          return (
            <button
              key={d.type}
              className={`dice-type-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectDice(d)}
              title={isSelected
                ? count < 5
                  ? `Adicionar mais um ${d.type} (será ${count + 1})`
                  : `Máximo de 5 dados atingido`
                : d.type}
            >
              {isSelected && count > 1 && (
                <span className="dice-count-badge">{count}x</span>
              )}
              <span className="dice-face-icon">{d.icon}</span>
              <span className="dice-label">{d.type}</span>
            </button>
          )
        })}
      </div>

      {count > 1 && (
        <div className="dice-qty-row">
          <button
            className="dice-qty-btn"
            onClick={decreaseCount}
            title="Remover um dado"
            disabled={rolling}
          >
            −
          </button>
          <span className="dice-qty-label">
            {diceLabel}
          </span>
          <button
            className="dice-qty-btn"
            onClick={() => { if (count < 5) { setCount(c => c + 1); setResult(null) } }}
            title={count < 5 ? 'Adicionar um dado' : 'Máximo de 5 dados'}
            disabled={rolling || count >= 5}
          >
            +
          </button>
        </div>
      )}

      <div className="dice-float-result" style={size.h !== null ? { flex: '0 0 auto' } : {}}>
        {rolling ? (
          <div className="dice-rolling">
            <span className="dice-roll-icon">{selected.icon}</span>
            <span className="dice-roll-label">Rolando {diceLabel}…</span>
          </div>
        ) : result !== null ? (
          <>
            <div className={`dice-result-number ${resultColorClass}`}>
              {result.total}
            </div>
            {result.count > 1 && (
              <div className="dice-breakdown">
                [
                {result.rolls.map((r, i) => {
                  let rClass = ''
                  if (r === 1) rClass = 'crit-fail'
                  else if (r === result.faces) rClass = 'crit-success'
                  return (
                    <span key={i}>
                      <span className={`dice-val-tag ${rClass}`}>{r}</span>
                      {i < result.rolls.length - 1 && ' + '}
                    </span>
                  )
                })}
                ]
              </div>
            )}
            <div className="dice-result-label">
              {chatDisplayName} · {result.diceType}
            </div>
          </>
        ) : (
          <div className="dice-result-label">
            {count > 1 ? `${diceLabel} SELECIONADOS` : 'SELECIONE E ROLE'}
          </div>
        )}
      </div>

      <div style={{ padding: '0 12px 12px' }}>
        <button className="dice-roll-btn" onClick={roll} disabled={rolling}>
          {rolling ? 'Rolando…' : `ROLAR ${diceLabel}`}
        </button>
      </div>

      <div
        className={`dice-float-history ${size.h !== null ? 'expanded' : ''}`}
        style={size.h !== null ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}}
      >
        <div className="dice-float-history-title">ÚLTIMAS ROLAGENS</div>
        {history.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
            Nenhuma rolagem ainda.
          </p>
        ) : (
          <div className="dice-history-list">
            {history.map((entry) => {
              const faces = entry.faces || 20
              const entryCount = entry.count || 1
              const rolls = Array.isArray(entry.rolls) ? entry.rolls : (Array.isArray(entry.results) ? entry.results : [])
              const displayName = entry.playerName || entry.characterName || entry.nick || 'Viajante'
              const diceLabelName = entry.diceType || entry.dice || entry.label || `${entryCount}D${faces}`
              const totalVal = entry.result !== undefined ? entry.result : (entry.total !== undefined ? entry.total : 0)

              let itemClass = ''
              if (totalVal === 1 || totalVal === entryCount) itemClass = 'crit-fail'
              else if (totalVal === faces || totalVal === entryCount * faces) itemClass = 'crit-success'

              return (
                <div key={entry.id} className="dice-history-item">
                  <div className="dice-history-main-row">
                    <span className="dice-history-player">{displayName}</span>
                    <span className="dice-history-type">{diceLabelName}</span>
                    <span className={`dice-history-result ${itemClass}`}>{totalVal}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  {rolls.length > 1 && (
                    <div className="dice-history-breakdown">
                      {rolls.map((r, i) => {
                        let rClass = ''
                        if (r === 1) rClass = 'crit-fail'
                        else if (r === faces) rClass = 'crit-success'
                        return (
                          <span key={i}>
                            <span className={`dice-val-tag ${rClass}`}>{r}</span>
                            {i < rolls.length - 1 && <span className="dice-breakdown-sep"> + </span>}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
