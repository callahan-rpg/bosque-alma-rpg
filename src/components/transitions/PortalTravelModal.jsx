import React, { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useLocationTransition, TRANSITION_EFFECTS } from '../../contexts/LocationTransitionContext.jsx'

export default function PortalTravelModal({ currentSlug = '', onClose }) {
  const { startTransition } = useLocationTransition()

  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [selectedEffect, setSelectedEffect] = useState('water_whirlpool')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'locations'), (snap) => {
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Caso não existam no banco, incluir local padrão
      if (list.length === 0) {
        list = [
          { id: 'jardim-do-crepusculo', name: 'Jardim do Crepúsculo', description: 'O coração do bosque mágico de Alma Koskovic.' },
        ]
      }

      setLocations(list)
      // Seleciona o primeiro local diferente do atual
      const firstTarget = list.find(l => l.id !== currentSlug) || list[0]
      if (firstTarget) {
        setSelectedSlug(firstTarget.id)
      }
      setLoading(false)
    }, (err) => {
      console.warn('Erro ao carregar locais no Portal:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [currentSlug])

  const handleTravel = (e) => {
    e?.preventDefault()
    if (!selectedSlug) return

    const targetLoc = locations.find(l => l.id === selectedSlug)
    startTransition(selectedSlug, selectedEffect, {
      locationName: targetLoc?.name || selectedSlug,
    })
    onClose?.()
  }

  const handleTestInPlace = (e) => {
    e?.preventDefault()
    // Testa a transição sem necessariamente mudar de lugar ou voltando pro mesmo
    const targetLoc = locations.find(l => l.id === (selectedSlug || currentSlug))
    startTransition(selectedSlug || currentSlug, selectedEffect, {
      locationName: `Portal Teste: ${targetLoc?.name || 'Vórtice'}`,
    })
    onClose?.()
  }

  return (
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="portal-modal-header">
          <div className="portal-modal-title">
            <span className="portal-title-rune">🌀</span>
            <div>
              <h3>Portal de Transição entre Domínios</h3>
              <p>Escolha o local de destino e o efeito de transição da tela</p>
            </div>
          </div>
          <button type="button" className="portal-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="portal-modal-body">
          {/* Seletor do Efeito de Transição */}
          <div className="portal-form-group">
            <label className="portal-group-label">
              <span>✨ Efeito de Transição da Tela:</span>
              <small>Como a tela será engolida e reaparecerá no destino</small>
            </label>

            <div className="portal-effects-grid">
              {TRANSITION_EFFECTS.map((eff) => {
                const isSelected = selectedEffect === eff.id
                return (
                  <button
                    type="button"
                    key={eff.id}
                    className={`portal-effect-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedEffect(eff.id)}
                  >
                    <div className="effect-icon-box">{eff.icon}</div>
                    <div className="effect-info">
                      <strong className="effect-title">{eff.label}</strong>
                      <span className="effect-desc">{eff.description}</span>
                    </div>
                    {isSelected && <span className="effect-selected-check">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Seletor do Local de Destino */}
          <div className="portal-form-group">
            <label className="portal-group-label">
              <span>🧭 Localidade-Alvo de Destino:</span>
              <small>Para onde o portal transportará seu personagem</small>
            </label>

            {loading ? (
              <div className="portal-loading-locs">Carregando domínios...</div>
            ) : (
              <div className="portal-locations-list">
                {locations.map((loc) => {
                  const isCurrent = loc.id === currentSlug
                  const isSelected = selectedSlug === loc.id

                  return (
                    <div
                      key={loc.id}
                      className={`portal-loc-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => setSelectedSlug(loc.id)}
                    >
                      <div className="loc-card-header">
                        <span className="loc-rune">📍</span>
                        <div className="loc-card-title-group">
                          <strong>{loc.name || loc.id}</strong>
                          <span className="loc-slug-tag">slug: {loc.id}</span>
                        </div>
                        {isCurrent && <span className="current-loc-badge">Local Atual</span>}
                      </div>

                      {loc.description && (
                        <p className="loc-card-desc">{loc.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="portal-modal-footer">
          <button
            type="button"
            className="portal-btn-test"
            onClick={handleTestInPlace}
            title="Executa a animação de transição imediatamente para testar o efeito visual"
          >
            <span>👁️</span> Testar Efeito Visual
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="portal-btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="portal-btn-confirm"
              onClick={handleTravel}
              disabled={!selectedSlug}
            >
              <span>🌀</span> Ativar Portal & Viajar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
