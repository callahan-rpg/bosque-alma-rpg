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
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext.jsx'

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
const COLLECTION = 'cyberpunk_dice_rolls'

export default function CyberpunkDiceRoller({ onClose }) {
  const { user, profile } = useAuth()
  const chatDisplayName = profile?.chatName || profile?.characterName || profile?.nick || 'Agente'

  const [selected, setSelected] = useState(DICE_TYPES[2]) // D10 padrão
  const [count, setCount]       = useState(1)
  const [rolling, setRolling]   = useState(false)
  const [result, setResult]     = useState(null)
  const [history, setHistory]   = useState([])

  const [pos, setPos]   = useState({ x: Math.max(20, window.innerWidth - 340), y: 90 })
  const [size, setSize] = useState({ w: 300, h: null })

  const dragging    = useRef(false)
  const resizing    = useRef(false)
  const resizeEdge  = useRef(null)
  const dragStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const resizeStart = useRef({ mx: 0, my: 0, w: 300, h: 0, px: 0, py: 0 })
  const panelRef    = useRef(null)

  // Histórico em tempo real via Firestore (coleção exclusiva Cyberpunk)
  useEffect(() => {
    let unsub = () => {}
    try {
      const q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'), limit(20))
      unsub = onSnapshot(
        q,
        (snap) => setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => {
          console.warn('[CyberpunkDiceRoller] onSnapshot falhou, fallback:', err)
          try {
            const qFallback = query(collection(db, COLLECTION), limit(20))
            unsub = onSnapshot(qFallback, (snap) => {
              const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
              list.sort((a, b) => {
                const ms = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : new Date(t || 0).getTime())
                return ms(b.timestamp) - ms(a.timestamp)
              })
              setHistory(list)
            })
          } catch (e) { console.error('[CyberpunkDiceRoller] Erro fallback:', e) }
        }
      )
    } catch (err) { console.error('[CyberpunkDiceRoller] Falha ao iniciar escuta:', err) }
    return () => unsub()
  }, [])

  // — Drag —
  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  // — Resize —
  const onResizeMouseDown = useCallback((edge) => (e) => {
    e.preventDefault(); e.stopPropagation()
    resizing.current = true
    resizeEdge.current = edge
    const panel = panelRef.current
    const curH = panel ? panel.offsetHeight : MIN_HEIGHT
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: curH, px: pos.x, py: pos.y }
  }, [size, pos])

  useEffect(() => {
    function onMouseMove(e) {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx
        const dy = e.clientY - dragStart.current.my
        const panel = panelRef.current
        const maxX = panel ? window.innerWidth  - panel.offsetWidth  : 9999
        const maxY = panel ? window.innerHeight - panel.offsetHeight : 9999
        setPos({ x: Math.max(0, Math.min(dragStart.current.px + dx, maxX)), y: Math.max(0, Math.min(dragStart.current.py + dy, maxY)) })
        return
      }
      if (resizing.current) {
        const dx = e.clientX - resizeStart.current.mx
        const dy = e.clientY - resizeStart.current.my
        const edge = resizeEdge.current
        let newW = resizeStart.current.w, newH = resizeStart.current.h, newPx = resizeStart.current.px
        if (edge === 'right')        { newW = resizeStart.current.w + dx }
        if (edge === 'left')         { newW = resizeStart.current.w - dx; newPx = resizeStart.current.px + dx }
        if (edge === 'bottom')       { newH = resizeStart.current.h + dy }
        if (edge === 'bottom-right') { newW = resizeStart.current.w + dx; newH = resizeStart.current.h + dy }
        if (edge === 'bottom-left')  { newW = resizeStart.current.w - dx; newH = resizeStart.current.h + dy; newPx = resizeStart.current.px + dx }
        newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newW))
        newH = newH < MIN_HEIGHT ? null : newH
        setSize({ w: newW, h: newH })
        if (edge === 'left' || edge === 'bottom-left') setPos((prev) => ({ ...prev, x: Math.max(0, newPx) }))
      }
    }
    function onMouseUp() { dragging.current = false; resizing.current = false; resizeEdge.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [])

  function handleSelectDice(d) {
    if (selected.type === d.type) {
      setCount((prev) => (prev >= 5 ? prev : prev + 1))
    } else {
      setSelected(d); setCount(1)
    }
    setResult(null)
  }

  function decreaseCount() { setCount((prev) => (prev > 1 ? prev - 1 : 1)); setResult(null) }

  async function roll() {
    if (rolling) return
    setRolling(true); setResult(null)
    await new Promise((r) => setTimeout(r, 600))
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * selected.faces) + 1)
    const total = rolls.reduce((a, v) => a + v, 0)
    const diceName = count > 1 ? `${count}${selected.type}` : selected.type
    const rollData = { total, rolls, diceType: diceName, faces: selected.faces, count }
    setResult(rollData); setRolling(false)

    const now = new Date()
    const entry = {
      playerUid: user?.uid || 'anon', uid: user?.uid || 'anon',
      playerName: chatDisplayName, characterName: chatDisplayName,
      diceType: diceName, dice: diceName, label: diceName,
      faces: selected.faces, count, rolls, results: rolls,
      result: total, total, timestamp: now,
    }
    setHistory((prev) => [{ id: 'local_' + Date.now(), ...entry }, ...prev.filter((p) => !p.id.startsWith('local_')).slice(0, 19)])
    try {
      await addDoc(collection(db, COLLECTION), { ...entry, timestamp: serverTimestamp() })
    } catch (err) { console.warn('[CyberpunkDiceRoller] Erro ao salvar rolagem:', err) }
  }

  function formatTime(ts) {
    if (!ts) return 'agora'
    if (ts.toDate) return ts.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    if (ts instanceof Date) return ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const d = new Date(ts)
    return isNaN(d.getTime()) ? 'agora' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const diceLabel = count > 1 ? `${count}${selected.type}` : selected.type
  const isCritFail    = result && (result.count === 1 ? result.total === 1 : result.total === result.count)
  const isCritSuccess = result && (result.count === 1 ? result.total === result.faces : result.total === result.count * result.faces)
  const resultClass   = isCritFail ? 'cb-dice-crit-fail' : isCritSuccess ? 'cb-dice-crit-success' : ''

  const panelStyle = {
    left: pos.x, top: pos.y, width: size.w,
    ...(size.h !== null ? { height: size.h, overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {}),
  }

  return (
    <div ref={panelRef} className="cb-dice-panel" style={panelStyle}>
      {/* Handles de resize */}
      <div className="cb-dice-resize cb-dice-resize-right"        onMouseDown={onResizeMouseDown('right')} />
      <div className="cb-dice-resize cb-dice-resize-left"         onMouseDown={onResizeMouseDown('left')} />
      <div className="cb-dice-resize cb-dice-resize-bottom"       onMouseDown={onResizeMouseDown('bottom')} />
      <div className="cb-dice-resize cb-dice-resize-bottom-right" onMouseDown={onResizeMouseDown('bottom-right')} />
      <div className="cb-dice-resize cb-dice-resize-bottom-left"  onMouseDown={onResizeMouseDown('bottom-left')} />

      {/* Header arrastável */}
      <div className="cb-dice-header" onMouseDown={onHeaderMouseDown}>
        <span className="cb-dice-title">
          <span className="cb-dice-title-icon">⬟</span>
          MÓDULO DE DADOS
        </span>
        <button className="cb-dice-close" onClick={onClose} title="Encerrar Módulo">×</button>
      </div>

      {/* Seletor de tipo de dado */}
      <div className="cb-dice-types">
        {DICE_TYPES.map((d) => {
          const isSel = selected.type === d.type
          return (
            <button
              key={d.type}
              className={`cb-dice-type-btn${isSel ? ' cb-dice-selected' : ''}`}
              onClick={() => handleSelectDice(d)}
              title={isSel ? (count < 5 ? `Adicionar mais um ${d.type} (${count + 1})` : 'Máximo 5 dados') : d.type}
            >
              {isSel && count > 1 && <span className="cb-dice-badge">{count}x</span>}
              <span className="cb-dice-face">{d.icon}</span>
              <span className="cb-dice-face-label">{d.type}</span>
            </button>
          )
        })}
      </div>

      {/* Ajuste de quantidade */}
      {count > 1 && (
        <div className="cb-dice-qty-row">
          <button className="cb-dice-qty-btn" onClick={decreaseCount} disabled={rolling} title="Remover dado">−</button>
          <span className="cb-dice-qty-label">{diceLabel}</span>
          <button
            className="cb-dice-qty-btn"
            onClick={() => { if (count < 5) { setCount((c) => c + 1); setResult(null) } }}
            disabled={rolling || count >= 5}
            title={count < 5 ? 'Adicionar dado' : 'Máximo de 5 dados'}
          >+</button>
        </div>
      )}

      {/* Área de resultado */}
      <div className="cb-dice-result-area" style={size.h !== null ? { flex: '0 0 auto' } : {}}>
        {rolling ? (
          <div className="cb-dice-rolling">
            <span className="cb-dice-rolling-icon">{selected.icon}</span>
            <span className="cb-dice-rolling-label">PROCESSANDO {diceLabel}…</span>
          </div>
        ) : result !== null ? (
          <>
            <div className={`cb-dice-result-number ${resultClass}`}>{result.total}</div>
            {result.count > 1 && (
              <div className="cb-dice-breakdown">
                {result.rolls.map((r, i) => {
                  let rCls = ''
                  if (r === 1) rCls = 'cb-dice-crit-fail'
                  else if (r === result.faces) rCls = 'cb-dice-crit-success'
                  return (
                    <span key={i}>
                      <span className={`cb-dice-val ${rCls}`}>{r}</span>
                      {i < result.rolls.length - 1 && ' + '}
                    </span>
                  )
                })}
              </div>
            )}
            <div className="cb-dice-result-label">
              {chatDisplayName} · {result.diceType}
              {isCritSuccess && ' · CRÍTICO ⚡'}
              {isCritFail && ' · FALHA CRÍTICA 💀'}
            </div>
          </>
        ) : (
          <div className="cb-dice-result-label">
            {count > 1 ? `${diceLabel} CONFIGURADOS` : 'SELECIONE E PROCESSE'}
          </div>
        )}
      </div>

      {/* Botão de rolar */}
      <div className="cb-dice-roll-wrap">
        <button className="cb-dice-roll-btn" onClick={roll} disabled={rolling}>
          {rolling ? 'PROCESSANDO…' : `EXECUTAR ${diceLabel}`}
        </button>
      </div>

      {/* Histórico */}
      <div
        className={`cb-dice-history${size.h !== null ? ' cb-dice-history-expanded' : ''}`}
        style={size.h !== null ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}}
      >
        <div className="cb-dice-history-title">LOG DE ROLAGENS</div>
        {history.length === 0 ? (
          <p className="cb-dice-history-empty">Nenhum registro encontrado.</p>
        ) : (
          <div className="cb-dice-history-list">
            {history.map((entry) => {
              const faces    = entry.faces || 20
              const ec       = entry.count || 1
              const rolls    = Array.isArray(entry.rolls) ? entry.rolls : (Array.isArray(entry.results) ? entry.results : [])
              const name     = entry.playerName || entry.characterName || 'Agente'
              const dName    = entry.diceType || entry.dice || entry.label || `${ec}D${faces}`
              const val      = entry.result !== undefined ? entry.result : (entry.total !== undefined ? entry.total : 0)
              let itemCls    = ''
              if (val === 1 || val === ec) itemCls = 'cb-dice-crit-fail'
              else if (val === faces || val === ec * faces) itemCls = 'cb-dice-crit-success'
              return (
                <div key={entry.id} className="cb-dice-history-item">
                  <div className="cb-dice-history-row">
                    <span className="cb-dice-hist-player">{name}</span>
                    <span className="cb-dice-hist-type">{dName}</span>
                    <span className={`cb-dice-hist-val ${itemCls}`}>{val}</span>
                    <span className="cb-dice-hist-time">{formatTime(entry.timestamp)}</span>
                  </div>
                  {rolls.length > 1 && (
                    <div className="cb-dice-history-breakdown">
                      {rolls.map((r, i) => {
                        let rCls = ''
                        if (r === 1) rCls = 'cb-dice-crit-fail'
                        else if (r === faces) rCls = 'cb-dice-crit-success'
                        return (
                          <span key={i}>
                            <span className={`cb-dice-val ${rCls}`}>{r}</span>
                            {i < rolls.length - 1 && <span className="cb-dice-sep"> + </span>}
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
