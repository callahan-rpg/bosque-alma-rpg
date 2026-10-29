import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  subscribeTrainerProfile,
  updatePokedexEntry,
  capturePokemon,
  consumePokeball,
  healParty,
  recordBattleResult,
} from '../../firebase/pokemonTrainerService'
import { getAllSpecies, getSpeciesById } from '../../data/pokemonSpecies'
import { POKEMON_MOVES } from '../../data/pokemonMoves'
import { TYPE_COLORS } from '../../data/pokemonTypes'
import { ROUTE_TRAINERS } from '../../data/pokemonTrainers'
import {
  createPokemonInstance,
  calculateDamage,
  resolveTurnOrder,
} from '../../utils/pokemonEngine'
import { sendZoneMessage } from '../../utils/chatService'
import LocationChat from '../../components/chat/LocationChat.jsx'
import PokemonBattleArena from '../../components/pokemon/PokemonBattleArena.jsx'
import '../../styles/pokemon-location.css'

const ROTA_1_BG =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&auto=format&fit=crop&q=85'

export default function PokemonLocation() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trainerProfile, setTrainerProfile] = useState(null)

  // Estados de Encontro Selvagem (Grama Alta)
  const [isSearching, setIsSearching] = useState(false)
  const [wildPokemon, setWildPokemon] = useState(null)
  const [playerPokemon, setPlayerPokemon] = useState(null)
  const [showMoveSelect, setShowMoveSelect] = useState(false)
  const [encounterLog, setEncounterLog] = useState([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureStatus, setCaptureStatus] = useState(null) // 'success' | 'failed'

  // Estados de Batalhas & Duelos entre Treinadores (Fase 4)
  const [showChallengersModal, setShowChallengersModal] = useState(false)
  const [activeBattleOpponent, setActiveBattleOpponent] = useState(null)
  const [healNotification, setHealNotification] = useState(null)

  const allSpecies = getAllSpecies()

  /**
   * Reidrata o objeto `species` de cada Pokémon da party com os dados mais
   * recentes do catálogo local (incluindo o campo `image` adicionado depois
   * que o perfil foi salvo no Firestore pela primeira vez).
   */
  const rehydrateParty = (party = []) =>
    party.map((p) => {
      const freshSpecies = getSpeciesById(p.speciesId || p.species?.id)
      return freshSpecies ? { ...p, species: { ...p.species, ...freshSpecies } } : p
    })

  // Escuta dados em tempo real do treinador no Firestore
  useEffect(() => {
    const unsub = subscribeTrainerProfile(user?.uid, (data) => {
      if (data?.party) {
        data = { ...data, party: rehydrateParty(data.party) }
      }
      setTrainerProfile(data)
      // Se já tiver party, define o primeiro com HP > 0 como ativo
      if (data?.party && data.party.length > 0) {
        const active = data.party.find((p) => p.currentHp > 0) || data.party[0]
        setPlayerPokemon(active)
      }
    })
    return () => unsub()
  }, [user?.uid])

  // Iniciar Busca na Grama Alta
  const handleExploreGrass = () => {
    if (!trainerProfile || !trainerProfile.party || trainerProfile.party.length === 0) {
      alert('Você precisa escolher seu Pokémon inicial no Hub antes de explorar a Rota 1!')
      navigate('/pokemon')
      return
    }

    setIsSearching(true)
    setEncounterLog(['Procurando criatura na grama alta...'])

    setTimeout(() => {
      // Sorteia espécie selvagem (Cospe-Lava ou Hidrolontra)
      const randomSpecies = allSpecies[Math.floor(Math.random() * allSpecies.length)]
      const wildLevel = Math.floor(Math.random() * 4) + 3 // Nv. 3 a 6

      const wild = createPokemonInstance(randomSpecies.id, {
        level: wildLevel,
        trainerName: 'Selvagem',
      })

      setWildPokemon(wild)
      setIsSearching(false)
      setShowMoveSelect(false)
      setCaptureStatus(null)

      // Registra como Visto na Pokédex
      updatePokedexEntry(user?.uid, wild.speciesId, { seen: true, caught: false })

      setEncounterLog([
        `🌿 Um ${wild.species.name} selvagem (Nv. ${wild.level}) saltou da grama alta!`,
      ])
    }, 1200)
  }

  // Executar Golpe do Jogador no Selvagem
  const handlePlayerAttack = (move) => {
    if (!playerPokemon || !wildPokemon) return

    const logs = []
    const first = resolveTurnOrder(playerPokemon, wildPokemon)

    if (first === 'A') {
      // Jogador ataca primeiro
      const dmgPlayer = calculateDamage(playerPokemon, wildPokemon, move)
      if (dmgPlayer.isMiss) {
        logs.push(`⚔️ Seu ${playerPokemon.nickname} usou ${move.name}, mas errou!`)
      } else {
        const newWildHp = Math.max(0, wildPokemon.currentHp - dmgPlayer.damage)
        setWildPokemon((prev) => ({ ...prev, currentHp: newWildHp }))
        logs.push(
          `⚔️ ${playerPokemon.nickname} usou ${move.name}! Causou ${dmgPlayer.damage} de dano! ${
            dmgPlayer.isCrit ? '💥 CRÍTICO!' : ''
          } ${dmgPlayer.effectivenessMessage ? `(${dmgPlayer.effectivenessMessage})` : ''}`
        )

        if (newWildHp <= 0) {
          logs.push(`💀 O ${wildPokemon.species.name} selvagem desmaiou! Você venceu a batalha!`)
          setEncounterLog(logs)
          setShowMoveSelect(false)
          setTimeout(() => {
            setWildPokemon(null)
          }, 2400)
          return
        }
      }

      // Contra-ataque do selvagem
      const wildMove = wildPokemon.moves[Math.floor(Math.random() * wildPokemon.moves.length)]
      const dmgWild = calculateDamage(wildPokemon, playerPokemon, wildMove)
      if (dmgWild.isMiss) {
        logs.push(`🛡️ O ${wildPokemon.species.name} selvagem usou ${wildMove.name}, mas errou!`)
      } else {
        const newPlayerHp = Math.max(0, playerPokemon.currentHp - dmgWild.damage)
        setPlayerPokemon((prev) => ({ ...prev, currentHp: newPlayerHp }))
        logs.push(
          `💥 O ${wildPokemon.species.name} selvagem usou ${wildMove.name}! Causou ${dmgWild.damage} de dano em você!`
        )
      }
    } else {
      // Selvagem ataca primeiro
      const wildMove = wildPokemon.moves[Math.floor(Math.random() * wildPokemon.moves.length)]
      const dmgWild = calculateDamage(wildPokemon, playerPokemon, wildMove)
      if (dmgWild.isMiss) {
        logs.push(`🛡️ O ${wildPokemon.species.name} selvagem usou ${wildMove.name}, mas errou!`)
      } else {
        const newPlayerHp = Math.max(0, playerPokemon.currentHp - dmgWild.damage)
        setPlayerPokemon((prev) => ({ ...prev, currentHp: newPlayerHp }))
        logs.push(
          `💥 O ${wildPokemon.species.name} selvagem foi mais rápido e usou ${wildMove.name}! Causou ${dmgWild.damage} de dano!`
        )
      }

      // Jogador contra-ataca
      const dmgPlayer = calculateDamage(playerPokemon, wildPokemon, move)
      if (dmgPlayer.isMiss) {
        logs.push(`⚔️ Seu ${playerPokemon.nickname} usou ${move.name}, mas errou!`)
      } else {
        const newWildHp = Math.max(0, wildPokemon.currentHp - dmgPlayer.damage)
        setWildPokemon((prev) => ({ ...prev, currentHp: newWildHp }))
        logs.push(
          `⚔️ ${playerPokemon.nickname} usou ${move.name}! Causou ${dmgPlayer.damage} de dano! ${
            dmgPlayer.isCrit ? '💥 CRÍTICO!' : ''
          } ${dmgPlayer.effectivenessMessage ? `(${dmgPlayer.effectivenessMessage})` : ''}`
        )

        if (newWildHp <= 0) {
          logs.push(`💀 O ${wildPokemon.species.name} selvagem desmaiou! Você venceu a batalha!`)
          setEncounterLog(logs)
          setShowMoveSelect(false)
          setTimeout(() => {
            setWildPokemon(null)
          }, 2400)
          return
        }
      }
    }

    setEncounterLog(logs)
    setShowMoveSelect(false)
  }

  // Arremessar Pokébola
  const handleThrowPokeball = async () => {
    if (!wildPokemon || isCapturing) return

    const ballsLeft = trainerProfile?.inventory?.pokeballs || 0
    if (ballsLeft <= 0) {
      alert('Você não tem mais Pokébolas! Vença duelos ou adquira mais no laboratório.')
      return
    }

    setIsCapturing(true)
    setCaptureStatus(null)
    setEncounterLog(['🔴 Você arremessou uma Pokébola!...'])

    // Consome Pokébola
    await consumePokeball(user?.uid)

    setTimeout(async () => {
      // Fórmula de captura: quanto menor o HP percentual, maior a chance
      const hpPercent = wildPokemon.currentHp / wildPokemon.stats.maxHp
      const catchThreshold = Math.max(30, Math.floor((1 - hpPercent * 0.75) * 100))
      const roll = Math.random() * 100

      if (roll <= catchThreshold) {
        // Sucesso de Captura!
        setCaptureStatus('success')
        setEncounterLog([
          `🎉 Gotcha! ${wildPokemon.species.name} foi capturado com sucesso!`,
          `✨ Registrado como ⭐ CAPTURADO na sua Pokédex!`,
        ])

        try {
          const { destination } = await capturePokemon(user?.uid, wildPokemon)
          if (destination === 'party') {
            setEncounterLog((prev) => [...prev, `👥 ${wildPokemon.species.name} foi adicionado à sua Equipe!`])
          } else {
            setEncounterLog((prev) => [...prev, `📦 Sua equipe está cheia (6)! Enviado para o PC Box.`])
          }

          // Notifica o Chat da Rota
          const trainerName = trainerProfile?.trainerName || 'Treinador'
          sendZoneMessage(
            'rota-1',
            {
              uid: user?.uid || 'trainer',
              characterName: trainerName,
              avatarUrl: null,
              role: 'trainer',
            },
            `🎯 **${trainerName}** capturou com sucesso um **${wildPokemon.species.name}** selvagem (Nv. ${wildPokemon.level}) na Rota 1!`,
            'achievement'
          )
        } catch (e) {
          console.error(e)
        }

        setTimeout(() => {
          setWildPokemon(null)
          setIsCapturing(false)
        }, 2800)
      } else {
        // Escapou
        setCaptureStatus('failed')
        setEncounterLog([
          `💨 Oh não! O ${wildPokemon.species.name} escapou da Pokébola!`,
        ])
        setIsCapturing(false)
      }
    }, 1800)
  }

  // Fugir do Encontro Selvagem
  const handleFlee = () => {
    setEncounterLog(['🏃 Você escapou com segurança!'])
    setTimeout(() => {
      setWildPokemon(null)
      setShowMoveSelect(false)
    }, 700)
  }

  // Curar toda a equipe do treinador
  const handleHealParty = async () => {
    await healParty(user?.uid)
    setHealNotification('✨ Toda a sua equipe foi curada para o HP máximo!')
    setTimeout(() => setHealNotification(null), 3000)
  }

  // Iniciar duelo com oponente escolhido
  const handleStartDuel = (challenger) => {
    if (!trainerProfile?.party || trainerProfile.party.length === 0) {
      alert('Você precisa ter pelo menos um Pokémon na equipe para duelar!')
      return
    }

    const hasAlivePokemon = trainerProfile.party.some((p) => (p.currentHp ?? p.stats.maxHp) > 0)
    if (!hasAlivePokemon) {
      alert('Todos os seus Pokémon estão desmaiados! Use o botão "Descanso & Cura" antes de duelar.')
      return
    }

    setShowChallengersModal(false)
    setActiveBattleOpponent(challenger)
  }

  // Trata a finalização do combate na Arena
  const handleBattleEnd = async ({ won, opponentName, rewards }) => {
    const activePokeId = playerPokemon?.instanceId || null
    await recordBattleResult(user?.uid, {
      won,
      opponentName,
      rewards,
      activePokemonInstanceId: activePokeId,
    })
  }

  const pokeballsCount = trainerProfile?.inventory?.pokeballs || 0
  const partyCount = trainerProfile?.party?.length || 0
  const winsCount = trainerProfile?.stats?.winsCount || 0
  const lossesCount = trainerProfile?.stats?.lossesCount || 0

  return (
    <div className="poke-loc-container">
      {/* Imagem de Fundo com Overlay */}
      <div className="poke-loc-bg" style={{ backgroundImage: `url(${ROTA_1_BG})` }} />
      <div className="poke-loc-overlay" />

      {/* HUD SUPERIOR DE TREINADOR */}
      <header className="poke-loc-hud">
        <div className="poke-hud-left">
          <div className="poke-ball-logo" style={{ width: '36px', height: '36px' }} />
          <div className="poke-loc-badge">
            <span className="poke-loc-name">Rota 1 (Vale dos Primórdios)</span>
            <span className="poke-loc-sub">Campos & Grama Alta • Região Elemental</span>
          </div>
        </div>

        {/* Ações Centrais de Aventura */}
        <div className="poke-hud-center">
          <button
            type="button"
            className="poke-action-btn-explore"
            onClick={handleExploreGrass}
            disabled={isSearching || wildPokemon !== null || activeBattleOpponent !== null}
            title="Procurar criaturas selvagens na relva"
          >
            <span>🌿</span>
            <span>{isSearching ? 'Buscando...' : 'Grama Alta'}</span>
          </button>

          <button
            type="button"
            className="poke-action-btn-battle"
            onClick={() => setShowChallengersModal(true)}
            disabled={wildPokemon !== null || activeBattleOpponent !== null}
            title="Desafiar Treinadores e Rivais da Rota"
          >
            <span>⚔️</span>
            <span>Duelo de Treinadores</span>
          </button>

          <button
            type="button"
            className="poke-action-btn-heal"
            onClick={handleHealParty}
            title="Curar o HP de todos os seus Pokémon"
          >
            <span>🏥</span>
            <span>Curar Equipe</span>
          </button>
        </div>

        {/* Atalhos Rápidos & Status */}
        <div className="poke-hud-right">
          <div className="poke-hud-btn" title="Registro de Vitórias e Derrotas em Duelos">
            <span>🏆</span>
            <span>{winsCount}V / {lossesCount}D</span>
          </div>
          <Link to="/pokemon" className="poke-hud-btn" title="Ver Equipe & Treinar">
            <span>👥</span>
            <span>Equipe ({partyCount}/6)</span>
          </Link>
          <div className="poke-hud-btn" title="Pokébolas no Inventário">
            <span>🔴</span>
            <span>{pokeballsCount} Pokébolas</span>
          </div>
          <Link to="/pokemon/admin" className="poke-hud-btn" title="Laboratório & Simulador">
            <span>🔬</span>
          </Link>
          <Link to="/mundos" className="poke-hud-btn" title="Seletor de Mundos">
            <span>🌐</span>
          </Link>
        </div>
      </header>

      {/* Notificação Temporária de Cura */}
      {healNotification && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'rgba(16, 185, 129, 0.92)',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {healNotification}
        </div>
      )}

      {/* CORPO CENTRAL COM CHAT DA LOCALIDADE */}
      <main className="poke-loc-body">
        <LocationChat
          slug="rota-1"
          locationName="Rota 1 (Vale dos Primórdios)"
        />
      </main>

      {/* MODAL DE SELEÇÃO DE DESAFIOS (TREINADORES RIVAIS) */}
      {showChallengersModal && (
        <div className="poke-challengers-overlay" onClick={() => setShowChallengersModal(false)}>
          <div className="poke-challengers-card" onClick={(e) => e.stopPropagation()}>
            <div className="poke-challengers-header">
              <h3>
                <span>⚔️</span>
                <span>Arena de Duelos da Rota 1</span>
              </h3>
              <button
                className="arena-close-btn"
                onClick={() => setShowChallengersModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
              Escolha um treinador rival para um duelo com rodadas automatizadas, cálculo de dano oficial e recompensas:
            </p>

            <div className="poke-challenger-list">
              {ROUTE_TRAINERS.map((challenger) => {
                const diffKey = challenger.difficulty.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                return (
                  <div key={challenger.id} className="poke-challenger-row">
                    <div className="challenger-profile-info">
                      <div className="challenger-avatar">{challenger.avatar}</div>
                      <div className="challenger-text-block">
                        <div className="challenger-name">
                          <span>{challenger.name}</span>
                          <span className={`challenger-difficulty-pill ${diffKey}`}>
                            {challenger.difficulty}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                          {challenger.title}
                        </span>
                        <span className="challenger-desc">{challenger.bio}</span>
                      </div>
                    </div>

                    <button
                      className="challenger-duel-btn"
                      onClick={() => handleStartDuel(challenger)}
                    >
                      <span>⚔️</span>
                      <span>Desafiar</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ARENA DE BATALHA POKÉMON AUTOMATIZADA (FASE 4) */}
      {activeBattleOpponent && (
        <PokemonBattleArena
          playerTrainer={trainerProfile}
          opponent={activeBattleOpponent}
          zoneSlug="rota-1"
          onClose={() => setActiveBattleOpponent(null)}
          onBattleEnd={handleBattleEnd}
        />
      )}

      {/* MODAL DE ENCONTRO SELVAGEM (BATALHA & CAPTURA) */}
      {wildPokemon && (
        <div className="poke-encounter-modal">
          <div className="poke-encounter-card">
            {/* ARENA DE COMBATE SELVAGEM */}
            <div className="poke-battle-arena">
              {/* Oponente Selvagem */}
              <div className="poke-foe-row">
                <div className="poke-combatant-info">
                  <div className="poke-combatant-name">
                    <span>{wildPokemon.species.name} (Selvagem)</span>
                    <span style={{ color: '#f59e0b' }}>Nv. {wildPokemon.level}</span>
                  </div>
                  <div className="poke-battle-hp-bar">
                    <div
                      className="poke-battle-hp-fill"
                      style={{
                        width: `${Math.max(0, (wildPokemon.currentHp / wildPokemon.stats.maxHp) * 100)}%`,
                        background:
                          wildPokemon.currentHp / wildPokemon.stats.maxHp > 0.5
                            ? '#10b981'
                            : wildPokemon.currentHp / wildPokemon.stats.maxHp > 0.2
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                    HP: {wildPokemon.currentHp} / {wildPokemon.stats.maxHp}
                  </div>
                </div>

                <div className="poke-battle-sprite">
                  {wildPokemon.species.image ? (
                    <img
                      src={wildPokemon.species.image}
                      alt={wildPokemon.species.name}
                      style={{ width: '85px', height: '85px', objectFit: 'contain' }}
                    />
                  ) : (
                    wildPokemon.species.icon
                  )}
                </div>
              </div>

              {/* Meu Pokémon Ativo */}
              {playerPokemon && (
                <div className="poke-player-row">
                  <div className="poke-battle-sprite" style={{ transform: 'scaleX(-1)' }}>
                    {playerPokemon.species.image ? (
                      <img
                        src={playerPokemon.species.image}
                        alt={playerPokemon.nickname}
                        style={{ width: '85px', height: '85px', objectFit: 'contain' }}
                      />
                    ) : (
                      playerPokemon.species.icon
                    )}
                  </div>

                  <div className="poke-combatant-info">
                    <div className="poke-combatant-name">
                      <span>{playerPokemon.nickname}</span>
                      <span style={{ color: '#38bdf8' }}>Nv. {playerPokemon.level}</span>
                    </div>
                    <div className="poke-battle-hp-bar">
                      <div
                        className="poke-battle-hp-fill"
                        style={{
                          width: `${Math.max(0, (playerPokemon.currentHp / playerPokemon.stats.maxHp) * 100)}%`,
                          background:
                            playerPokemon.currentHp / playerPokemon.stats.maxHp > 0.5
                              ? '#10b981'
                              : playerPokemon.currentHp / playerPokemon.stats.maxHp > 0.2
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                      HP: {playerPokemon.currentHp} / {playerPokemon.stats.maxHp}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LOG DE COMBATE / CAPTURA */}
            <div className="poke-encounter-log">
              {encounterLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            {/* SELETOR DE GOLPES (SE CLICOU EM LUTAR) */}
            {showMoveSelect && playerPokemon && (
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Escolha um golpe para desferir:
                </div>
                <div className="poke-moves-selector">
                  {playerPokemon.moves.map((mv) => (
                    <button
                      key={mv.id}
                      type="button"
                      className="poke-move-select-btn"
                      onClick={() => handlePlayerAttack(mv)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{mv.name}</strong>
                        <span style={{ color: TYPE_COLORS[mv.type] || '#fff' }}>{mv.type}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {mv.category} • Pwr {mv.power || '—'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* BARRA DE AÇÕES */}
            <div className="poke-battle-actions">
              <button
                type="button"
                className="poke-action-btn poke-btn-attack"
                onClick={() => setShowMoveSelect((prev) => !prev)}
                disabled={isCapturing || captureStatus === 'success' || wildPokemon.currentHp <= 0}
              >
                <span>⚔️</span>
                <span>{showMoveSelect ? 'Voltar' : 'Lutar'}</span>
              </button>

              <button
                type="button"
                className="poke-action-btn poke-btn-catch"
                onClick={handleThrowPokeball}
                disabled={isCapturing || captureStatus === 'success' || pokeballsCount <= 0}
              >
                <span>🔴</span>
                <span>{isCapturing ? 'Arremessando...' : `Capturar (${pokeballsCount})`}</span>
              </button>

              <button
                type="button"
                className="poke-action-btn poke-btn-flee"
                onClick={handleFlee}
                disabled={isCapturing || captureStatus === 'success'}
              >
                <span>🏃</span>
                <span>Fugir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
