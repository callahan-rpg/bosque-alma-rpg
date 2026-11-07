import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'

const DICE_TYPES = [
  { type: 'D4', faces: 4, icon: '▲' },
  { type: 'D6', faces: 6, icon: '⬡' },
  { type: 'D8', faces: 8, icon: '◆' },
  { type: 'D10', faces: 10, icon: '◈' },
  { type: 'D12', faces: 12, icon: '⬟' },
  { type: 'D20', faces: 20, icon: '🔮' },
  { type: 'D100', faces: 100, icon: '●' }
]

const COLLECTION = 'veu_dice_rolls'

export default function VeuDiceRoller({ onClose }) {
  const { user, profile } = useAuth()
  const chatDisplayName = profile?.characterName || profile?.name || user?.displayName || 'Viajante da Noite'

  const [selected, setSelected] = useState(DICE_TYPES[5]) // D20 padrão
  const [count, setCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const [pos, setPos] = useState({ x: Math.max(20, window.innerWidth - 350), y: 80 })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const panelRef = useRef(null)

  // Escuta histórico de rolagens de O Véu Sombrio
  useEffect(() => {
    let unsub = () => {}
    try {
      const q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'), limit(15))
      unsub = onSnapshot(q, (snap) => {
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }, (err) => {
        console.warn('[VeuDiceRoller] Fallback onSnapshot:', err)
      })
    } catch (err) {
      console.error('[VeuDiceRoller] Erro ao escutar rolagens:', err)
    }
    return () => unsub()
  }, [])

  // Drag da janela
  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  useEffect(() => {
    function onMouseMove(e) {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx
        const dy = e.clientY - dragStart.current.my
        const panel = panelRef.current
        const maxX = panel ? window.innerWidth - panel.offsetWidth : 9999
        const maxY = panel ? window.innerHeight - panel.offsetHeight : 9999
        setPos({
          x: Math.max(0, Math.min(dragStart.current.px + dx, maxX)),
          y: Math.max(0, Math.min(dragStart.current.py + dy, maxY))
        })
      }
    }
    function onMouseUp() {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Executa rolagem
  const handleRoll = async () => {
    if (rolling) return
    setRolling(true)

    const rolls = []
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * selected.faces) + 1)
    }
    const sum = rolls.reduce((acc, v) => acc + v, 0)
    const mod = Number(modifier) || 0
    const total = sum + mod

    const isCritSuccess = selected.faces === 20 && count === 1 && rolls[0] === 20
    const isCritFail = selected.faces === 20 && count === 1 && rolls[0] === 1

    const rollData = {
      dice: `${count}${selected.type}`,
      rolls,
      modifier: mod,
      total,
      isCritSuccess,
      isCritFail,
      userName: chatDisplayName,
      uid: user?.uid || 'guest',
      timestamp: serverTimestamp()
    }

    setResult(rollData)

    try {
      await addDoc(collection(db, COLLECTION), rollData)
    } catch (err) {
      console.warn('[VeuDiceRoller] Erro ao gravar rolagem:', err)
    } finally {
      setTimeout(() => setRolling(false), 400)
    }
  }

  return (
    <div
      ref={panelRef}
      className="veu-dice-modal"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <div className="veu-dice-header" onMouseDown={onHeaderMouseDown}>
        <div className="veu-dice-title">
          <span>🔮</span>
          <span>DADOS DO VÉU SOMBRIO</span>
        </div>
        <button type="button" className="veu-dice-close" onClick={onClose} title="Fechar">
          ✕
        </button>
      </div>

      <div className="veu-dice-body">
        {/* Seletor de Tipo de Dado */}
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px', letterSpacing: '0.06em' }}>
            ESCOLHA O DADO OCULTO:
          </label>
          <div className="veu-dice-types-grid">
            {DICE_TYPES.map(d => (
              <button
                key={d.type}
                type="button"
                className={`veu-dice-type-btn ${selected.type === d.type ? 'active' : ''}`}
                onClick={() => setSelected(d)}
              >
                {d.icon} {d.type}
              </button>
            ))}
          </div>
        </div>

        {/* Quantidade e Modificador */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Qtd de Dados:
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              style={{
                width: '100%',
                padding: '6px',
                background: 'rgba(20, 15, 30, 0.8)',
                border: '1px solid rgba(126, 34, 206, 0.4)',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '12px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Modificador (+/-):
            </label>
            <input
              type="number"
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '6px',
                background: 'rgba(20, 15, 30, 0.8)',
                border: '1px solid rgba(126, 34, 206, 0.4)',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '12px'
              }}
            />
          </div>
        </div>

        {/* Botão de Rolar */}
        <button
          type="button"
          className="veu-dice-roll-action-btn"
          onClick={handleRoll}
          disabled={rolling}
        >
          {rolling ? 'INVOCANDO DESTINO...' : `ROLAR ${count}${selected.type}${modifier ? (modifier > 0 ? ` +${modifier}` : ` ${modifier}`) : ''}`}
        </button>

        {/* Banner de Resultado */}
        {result && (
          <div className="veu-dice-result-banner">
            <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '4px' }}>
              RESULTADO DE {result.dice} {result.modifier ? `(${result.modifier > 0 ? `+${result.modifier}` : result.modifier})` : ''}
            </div>
            <div className="veu-dice-result-number">
              {result.total}
            </div>
            {result.rolls.length > 1 && (
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Rolagens individuais: [{result.rolls.join(', ')}]
              </div>
            )}
            {result.isCritSuccess && (
              <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: 800, marginTop: '4px' }}>
                ✨ SUCESSO CRÍTICO / GRAÇA NOTURNA!
              </div>
            )}
            {result.isCritFail && (
              <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 800, marginTop: '4px' }}>
                💀 FALHA CRÍTICA / MALDIÇÃO DO VÉU!
              </div>
            )}
          </div>
        )}

        {/* Histórico Recente de Rolagens */}
        {history.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.06em' }}>
              HISTÓRICO RECENTE:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '130px', overflowY: 'auto' }}>
              {history.slice(0, 6).map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}
                >
                  <span style={{ color: '#cbd5e1' }}>
                    <strong style={{ color: '#f87171' }}>{h.userName || 'Ocultista'}</strong> ({h.dice})
                  </span>
                  <span style={{ fontWeight: 800, color: h.isCritSuccess ? '#22c55e' : h.isCritFail ? '#ef4444' : '#fca5a5' }}>
                    = {h.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
