import { useState, useEffect, useRef } from 'react'
import { TYPE_COLORS } from '../../data/pokemonTypes'
import {
  simulateBattleTurn,
  pickBestAIMove,
} from '../../utils/pokemonEngine'
import { sendZoneMessage } from '../../utils/chatService'
import '../../styles/pokemon-battle-arena.css'

export default function PokemonBattleArena({
  playerTrainer,
  opponent,
  onClose,
  onBattleEnd,
  zoneSlug = 'rota-1',
}) {
  // Estado das equipes na arena
  const [playerTeam, setPlayerTeam] = useState(() => {
    return (playerTrainer?.party || []).map((p) => ({
      ...p,
      currentHp: p.currentHp !== undefined ? p.currentHp : p.stats.maxHp,
    }))
  })
  const [playerIndex, setPlayerIndex] = useState(() => {
    const idx = (playerTrainer?.party || []).findIndex((p) => (p.currentHp ?? p.stats.maxHp) > 0)
    return idx !== -1 ? idx : 0
  })

  const [opponentTeam, setOpponentTeam] = useState(() => {
    const rawTeam = opponent.team || (opponent.teamGenerator ? opponent.teamGenerator() : [])
    return rawTeam.map((p) => ({
      ...p,
      currentHp: p.currentHp !== undefined ? p.currentHp : p.stats.maxHp,
    }))
  })
  const [opponentIndex, setOpponentIndex] = useState(0)

  // Modos de Batalha & Velocidade
  const [isAutoBattling, setIsAutoBattling] = useState(false)
  const [battleSpeed, setBattleSpeed] = useState('1x') // '1x' | '2x' | 'instant'
  const [isProcessingTurn, setIsProcessingTurn] = useState(false)

  // Efeitos Visuais & Animações
  const [attackingSide, setAttackingSide] = useState(null) // 'player' | 'opponent' | null
  const [hitSide, setHitSide] = useState(null) // 'player' | 'opponent' | null

  // Logs e Textos
  const [tickerText, setTickerText] = useState(
    opponent.dialogue?.before ||
      `⚔️ O duelo contra ${opponent.name} começou! Faça sua jogada ou ative o Auto-Batalhar!`
  )
  const [battleLogs, setBattleLogs] = useState([])
  const [battleResult, setBattleResult] = useState(null) // 'won' | 'lost' | null
  const [showSwitchModal, setShowSwitchModal] = useState(false)

  const activePlayerPoke = playerTeam[playerIndex]
  const activeOpponentPoke = opponentTeam[opponentIndex]

  // Ref para loop de auto-batalha
  const autoBattleRef = useRef(false)
  autoBattleRef.current = isAutoBattling

  const speedDelays = {
    '1x': { hitDelay: 700, turnDelay: 1200 },
    '2x': { hitDelay: 350, turnDelay: 600 },
    instant: { hitDelay: 50, turnDelay: 150 },
  }

  // Executa uma rodada completa de combate
  const handleExecuteTurn = async (playerMove = null) => {
    if (isProcessingTurn || battleResult) return
    if (!activePlayerPoke || !activeOpponentPoke) return

    setIsProcessingTurn(true)
    const { hitDelay, turnDelay } = speedDelays[battleSpeed]

    const chosenPlayerMove = playerMove || pickBestAIMove(activePlayerPoke, activeOpponentPoke)
    const chosenOpponentMove = pickBestAIMove(activeOpponentPoke, activePlayerPoke)

    // Calcula turno no motor matemático
    const result = simulateBattleTurn(
      activePlayerPoke,
      activeOpponentPoke,
      chosenPlayerMove,
      chosenOpponentMove
    )

    // Executa animações e atualizações sequenciais baseadas na ordem dos turnos
    for (const ev of result.events) {
      if (ev.attackerSide === 'A') {
        // Jogador atacando
        setAttackingSide('player')
        setTickerText(`⚔️ Seu ${activePlayerPoke.nickname} usou ${ev.move.name}!`)
        await sleep(hitDelay)

        setAttackingSide(null)
        setHitSide('opponent')

        // Atualiza HP do oponente
        setOpponentTeam((prev) => {
          const updated = [...prev]
          updated[opponentIndex] = { ...updated[opponentIndex], currentHp: ev.defenderRemainingHp }
          return updated
        })

        let msg = `💥 Causou ${ev.damage} de dano!`
        if (ev.isCrit) msg += ' ⚡ CRÍTICO!'
        if (ev.effectiveness > 1) msg += ' 🌟 Super Efetivo!'
        setTickerText(msg)
        await sleep(hitDelay)
        setHitSide(null)

        if (ev.fainted) {
          setTickerText(`💀 ${activeOpponentPoke.nickname} do oponente foi derrotado!`)
          await sleep(turnDelay)
          break
        }
      } else {
        // Oponente atacando
        setAttackingSide('opponent')
        setTickerText(`⚔️ ${activeOpponentPoke.nickname} inimigo usou ${ev.move.name}!`)
        await sleep(hitDelay)

        setAttackingSide(null)
        setHitSide('player')

        // Atualiza HP do jogador
        setPlayerTeam((prev) => {
          const updated = [...prev]
          updated[playerIndex] = { ...updated[playerIndex], currentHp: ev.defenderRemainingHp }
          return updated
        })

        let msg = `💥 Causou ${ev.damage} de dano no seu Pokémon!`
        if (ev.isCrit) msg += ' ⚡ CRÍTICO!'
        if (ev.effectiveness > 1) msg += ' 🌟 Super Efetivo!'
        setTickerText(msg)
        await sleep(hitDelay)
        setHitSide(null)

        if (ev.fainted) {
          setTickerText(`💀 Seu ${activePlayerPoke.nickname} desmaiou!`)
          await sleep(turnDelay)
          break
        }
      }
    }

    setBattleLogs((prev) => [...prev, ...result.logs])

    // Checagem de Fim de Combate ou Troca
    const remainingOpponentAlive = opponentTeam.filter((p, i) =>
      i === opponentIndex ? result.newHpB > 0 : p.currentHp > 0
    )
    const remainingPlayerAlive = playerTeam.filter((p, i) =>
      i === playerIndex ? result.newHpA > 0 : p.currentHp > 0
    )

    if (result.newHpB <= 0) {
      // Oponente atual desmaiou
      const nextOppIdx = opponentTeam.findIndex((p, i) => i !== opponentIndex && p.currentHp > 0)
      if (nextOppIdx !== -1) {
        setTickerText(`🔄 ${opponent.name} enviou ${opponentTeam[nextOppIdx].nickname}!`)
        setOpponentIndex(nextOppIdx)
        await sleep(turnDelay)
      } else {
        // Vitória completa!
        handleBattleFinished('won')
        setIsProcessingTurn(false)
        return
      }
    }

    if (result.newHpA <= 0) {
      // Jogador atual desmaiou
      const nextPlayIdx = playerTeam.findIndex((p, i) => i !== playerIndex && p.currentHp > 0)
      if (nextPlayIdx !== -1) {
        setTickerText(`🔄 Seu Pokémon desmaiou! Enviando ${playerTeam[nextPlayIdx].nickname}!`)
        setPlayerIndex(nextPlayIdx)
        await sleep(turnDelay)
      } else {
        // Derrota completa!
        handleBattleFinished('lost')
        setIsProcessingTurn(false)
        return
      }
    }

    setIsProcessingTurn(false)
  }

  // Finalização da batalha
  const handleBattleFinished = (resultStatus) => {
    setIsAutoBattling(false)
    setBattleResult(resultStatus)

    if (resultStatus === 'won') {
      setTickerText(`🏆 Parabéns! Você derrotou ${opponent.name} e venceu o duelo!`)
    } else {
      setTickerText(`🏳️ Toda sua equipe foi derrotada... Treine mais e volte a desafiar!`)
    }

    if (onBattleEnd) {
      onBattleEnd({
        won: resultStatus === 'won',
        opponentName: opponent.name,
        rewards: opponent.rewards || { coins: 50, pokeballs: 2, exp: 80 },
        finalParty: playerTeam,
      })
    }
  }

  // Loop de Auto-Batalha contínua
  useEffect(() => {
    if (!isAutoBattling || battleResult || isProcessingTurn) return

    const { turnDelay } = speedDelays[battleSpeed]
    const timer = setTimeout(() => {
      if (autoBattleRef.current && !battleResult && !isProcessingTurn) {
        handleExecuteTurn()
      }
    }, turnDelay)

    return () => clearTimeout(timer)
  }, [isAutoBattling, isProcessingTurn, battleResult, battleSpeed, playerIndex, opponentIndex])

  // Compartilhar vitória no chat da rota
  const handleShareResultInChat = async () => {
    if (!zoneSlug || !playerTrainer) return

    const text =
      battleResult === 'won'
        ? `🏆 Venci o Duelo Pokémon contra ${opponent.name} (${opponent.title}) na Rota 1! Meu ${activePlayerPoke?.nickname} brilhou na arena!`
        : `⚔️ Travei um duelo acirrado contra ${opponent.name} na Rota 1! A batalha foi épica!`

    await sendZoneMessage(
      zoneSlug,
      {
        uid: playerTrainer.trainerId,
        characterName: playerTrainer.trainerName || 'Treinador',
        avatarUrl: null,
        role: 'trainer',
      },
      text,
      'achievement'
    )
    alert('Resultado compartilhado com sucesso no Chat da Rota 1!')
  }

  const helperHpClass = (current, max) => {
    const ratio = current / Math.max(1, max)
    if (ratio > 0.5) return 'high'
    if (ratio > 0.2) return 'medium'
    return 'low'
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  return (
    <div className="battle-arena-overlay">
      <div className="battle-arena-modal">
        {/* Header Superior da Arena */}
        <div className="battle-arena-header">
          <div className="battle-arena-title">
            <span>⚔️</span>
            <h3>Duelo Pokémon: {opponent.name}</h3>
            <span className="battle-badge-tag">{opponent.difficulty || 'Batalha'}</span>
          </div>

          <div className="battle-header-controls">
            {/* Seletor de Velocidade */}
            <button
              className={`speed-toggle-btn ${battleSpeed === '1x' ? 'active' : ''}`}
              onClick={() => setBattleSpeed('1x')}
            >
              1x
            </button>
            <button
              className={`speed-toggle-btn ${battleSpeed === '2x' ? 'active' : ''}`}
              onClick={() => setBattleSpeed('2x')}
            >
              2x
            </button>
            <button
              className={`speed-toggle-btn ${battleSpeed === 'instant' ? 'active' : ''}`}
              onClick={() => setBattleSpeed('instant')}
            >
              ⚡ Max
            </button>

            {/* Fechar / Render-se */}
            <button className="arena-close-btn" onClick={onClose} title="Sair da Batalha">
              ✕
            </button>
          </div>
        </div>

        {/* Estádio / Campo Visual de Batalha */}
        <div className="battle-field-stage">
          {/* Lado do Oponente (Superior Direito) */}
          <div className="opponent-stage-row">
            {activeOpponentPoke && (
              <>
                <div className="poke-status-card opponent">
                  <div className="poke-status-header">
                    <span className="poke-status-name">
                      {activeOpponentPoke.species.icon} {activeOpponentPoke.nickname}
                    </span>
                    <span className="poke-level-badge">Nv. {activeOpponentPoke.level}</span>
                  </div>

                  {/* Barra de HP do Oponente */}
                  <div className="hp-bar-container">
                    <span className="hp-label">HP</span>
                    <div className="hp-track">
                      <div
                        className={`hp-fill ${helperHpClass(
                          activeOpponentPoke.currentHp,
                          activeOpponentPoke.stats.maxHp
                        )}`}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              (activeOpponentPoke.currentHp / activeOpponentPoke.stats.maxHp) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Indicador de Pokebolas da Equipe Inimiga */}
                  <div className="team-pokeballs-tracker">
                    {opponentTeam.map((p, idx) => (
                      <span
                        key={idx}
                        className={`team-pokeball-dot ${p.currentHp > 0 ? 'alive' : 'fainted'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Avatar / Sprite do Oponente */}
                <div className="pokemon-sprite-wrapper">
                  <div
                    className={`pokemon-figure ${
                      attackingSide === 'opponent' ? 'attacking-dash-left' : ''
                    } ${hitSide === 'opponent' ? 'taking-damage-shake' : ''}`}
                  >
                    {activeOpponentPoke.species.image ? (
                      <img
                        src={activeOpponentPoke.species.image}
                        alt={activeOpponentPoke.nickname}
                        className="pokemon-battle-sprite-img"
                      />
                    ) : (
                      <span className="pokemon-figure emoji-fallback">
                        {activeOpponentPoke.species.icon || '🐾'}
                      </span>
                    )}
                  </div>
                  <div className="pokemon-shadow" />
                </div>
              </>
            )}
          </div>

          {/* Lado do Jogador (Inferior Esquerdo) */}
          <div className="player-stage-row">
            {activePlayerPoke && (
              <>
                {/* Avatar / Sprite do Jogador */}
                <div className="pokemon-sprite-wrapper">
                  <div
                    className={`pokemon-figure ${
                      attackingSide === 'player' ? 'attacking-dash-right' : ''
                    } ${hitSide === 'player' ? 'taking-damage-shake' : ''}`}
                  >
                    {activePlayerPoke.species.image ? (
                      <img
                        src={activePlayerPoke.species.image}
                        alt={activePlayerPoke.nickname}
                        className="pokemon-battle-sprite-img"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                    ) : (
                      <span className="pokemon-figure emoji-fallback">
                        {activePlayerPoke.species.icon || '🐾'}
                      </span>
                    )}
                  </div>
                  <div className="pokemon-shadow" />
                </div>

                {/* Placa de Vida do Jogador */}
                <div className="poke-status-card player">
                  <div className="poke-status-header">
                    <span className="poke-status-name">
                      {activePlayerPoke.species.icon} {activePlayerPoke.nickname}
                    </span>
                    <span className="poke-level-badge">Nv. {activePlayerPoke.level}</span>
                  </div>

                  {/* Barra de HP do Jogador */}
                  <div className="hp-bar-container">
                    <span className="hp-label">HP</span>
                    <div className="hp-track">
                      <div
                        className={`hp-fill ${helperHpClass(
                          activePlayerPoke.currentHp,
                          activePlayerPoke.stats.maxHp
                        )}`}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              (activePlayerPoke.currentHp / activePlayerPoke.stats.maxHp) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="hp-numeric-text">
                    {activePlayerPoke.currentHp} / {activePlayerPoke.stats.maxHp} HP
                  </div>

                  {/* Indicador de Pokebolas da Equipe do Jogador */}
                  <div className="team-pokeballs-tracker">
                    {playerTeam.map((p, idx) => (
                      <span
                        key={idx}
                        className={`team-pokeball-dot ${p.currentHp > 0 ? 'alive' : 'fainted'}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ticker de Log de Batalha em Tempo Real */}
        <div className="battle-ticker-box">
          <p className="battle-ticker-text">{tickerText}</p>
        </div>

        {/* Deck de Comandos e Golpes */}
        <div className="battle-command-deck">
          {/* Grade de 4 Golpes */}
          <div className="moves-grid">
            {activePlayerPoke?.moves?.map((move) => {
              const typeColor = TYPE_COLORS[move.type] || '#64748b'
              return (
                <button
                  key={move.id}
                  className="move-action-btn"
                  onClick={() => handleExecuteTurn(move)}
                  disabled={isProcessingTurn || isAutoBattling || battleResult || activePlayerPoke.currentHp <= 0}
                >
                  <div className="move-btn-info">
                    <span className="move-btn-name">{move.name}</span>
                    <span className="move-btn-power">
                      {move.category} • Poder {move.power || '—'}
                    </span>
                  </div>
                  <span className="move-type-pill" style={{ background: typeColor }}>
                    {move.type}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Controles de Auto-Batalha e Troca de Pokémon */}
          <div className="deck-controls-panel">
            <button
              className={`auto-battle-toggle-btn ${isAutoBattling ? 'running' : ''}`}
              onClick={() => setIsAutoBattling(!isAutoBattling)}
              disabled={battleResult || isProcessingTurn}
            >
              {isAutoBattling ? '⏸️ Pausar Auto' : '⚡ Auto-Batalhar'}
            </button>

            <button
              className="switch-pokemon-btn"
              onClick={() => setShowSwitchModal(true)}
              disabled={isAutoBattling || isProcessingTurn || battleResult}
            >
              🔄 Trocar Pokémon ({playerTeam.filter((p) => p.currentHp > 0).length} Vivos)
            </button>
          </div>
        </div>

        {/* Modal de Troca de Pokémon da Equipe */}
        {showSwitchModal && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 15, 30, 0.9)',
              backdropFilter: 'blur(8px)',
              zIndex: 20,
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <h4 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem' }}>
              Selecione o Pokémon para entrar em campo:
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                width: '100%',
                maxWidth: '500px',
              }}
            >
              {playerTeam.map((poke, idx) => (
                <button
                  key={poke.instanceId || idx}
                  disabled={poke.currentHp <= 0 || idx === playerIndex}
                  onClick={() => {
                    setPlayerIndex(idx)
                    setShowSwitchModal(false)
                    setTickerText(`Vai, ${poke.nickname}!`)
                  }}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: idx === playerIndex ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: poke.currentHp <= 0 ? 'not-allowed' : 'pointer',
                    opacity: poke.currentHp <= 0 ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {poke.species.icon} {poke.nickname} (Nv. {poke.level})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    HP: {poke.currentHp} / {poke.stats.maxHp}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSwitchModal(false)}
              style={{
                marginTop: '1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Tela de Vitória ou Derrota */}
        {battleResult && (
          <div className="battle-result-overlay">
            <div className="result-icon-banner">
              {battleResult === 'won' ? '🏆' : '💀'}
            </div>
            <h2 className={`result-title ${battleResult}`}>
              {battleResult === 'won' ? 'Vitória Épica!' : 'Derrota em Combate'}
            </h2>
            <p className="result-subtitle">
              {battleResult === 'won'
                ? opponent.dialogue?.victory || `Você superou ${opponent.name} com maestria!`
                : opponent.dialogue?.defeat || `A equipe de ${opponent.name} foi superior desta vez.`}
            </p>

            {/* Recompensas de Vitória */}
            {battleResult === 'won' && opponent.rewards && (
              <div className="rewards-display-box">
                <div className="reward-item">
                  <span className="reward-item-label">PokéMoedas</span>
                  <span className="reward-item-value">+{opponent.rewards.coins || 50} 🪙</span>
                </div>
                <div className="reward-item">
                  <span className="reward-item-label">Pokébolas</span>
                  <span className="reward-item-value">+{opponent.rewards.pokeballs || 2} 🔴</span>
                </div>
                <div className="reward-item">
                  <span className="reward-item-label">EXP Recebido</span>
                  <span className="reward-item-value">+{opponent.rewards.exp || 80} ⭐</span>
                </div>
              </div>
            )}

            <div className="result-actions">
              <button className="finish-battle-btn" onClick={onClose}>
                Concluir e Retornar
              </button>
              {battleResult === 'won' && (
                <button className="share-chat-btn" onClick={handleShareResultInChat}>
                  📢 Anunciar no Chat
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
