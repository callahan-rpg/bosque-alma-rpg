import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  subscribeTrainerProfile,
  applyGroomingItem,
  recordContestVictory,
} from '../../firebase/pokemonTrainerService'
import { ensureContestStats } from '../../utils/pokemonEngine'
import { POKEMON_MOVES } from '../../data/pokemonMoves'
import { getSpeciesById } from '../../data/pokemonSpecies'
import {
  CONTEST_CATEGORIES,
  CONTEST_RANKS,
  CONTEST_JUDGES,
  GROOMING_ITEMS,
  SHOWSTOPPER_POSES,
} from '../../data/pokemonContestData'
import {
  generateContestRivals,
  calculateVisualRound,
  sortStageTurnOrder,
  pickContestAIMove,
  executeContestMove,
  evaluateShowstopperSync,
  TOTAL_ROUNDS,
  MAX_CROWD_HYPE,
} from '../../utils/contestEngine'
import ContestTutorialModal from '../../components/pokemon/ContestTutorialModal'
import '../../styles/pokemon-contest.css'

export default function PokemonContest() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [trainerProfile, setTrainerProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modos de Visualização: 'dressing_room' | 'stage_act1' | 'stage_act2' | 'stage_act3_qte' | 'podium'
  const [phase, setPhase] = useState('dressing_room')

  // Configuração do Concurso
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('grace')
  const [selectedRankKey, setSelectedRankKey] = useState('copper')
  const [activePokemonIndex, setActivePokemonIndex] = useState(0)
  const [selectedPoseIndex, setSelectedPoseIndex] = useState(0)

  // Estado do Palco & Competidores
  const [contestants, setContestants] = useState([])
  const [currentRound, setCurrentRound] = useState(1)
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0)
  const [crowdHype, setCrowdHype] = useState(0)
  const [lastMoveOnStage, setLastMoveOnStage] = useState(null)
  const [narrativeLogs, setNarrativeLogs] = useState([])
  const [judgeComments, setJudgeComments] = useState([])
  const [isProcessingTurn, setIsProcessingTurn] = useState(false)

  // Estado do Showstopper QTE (Ato III)
  const [qteRingScale, setQteRingScale] = useState(2.5)
  const [qteStartTime, setQteStartTime] = useState(null)
  const [showstopperResult, setShowstopperResult] = useState(null)
  const qteAnimationRef = useRef(null)

  // Tutorial Guiado Interativo
  const [showTutorial, setShowTutorial] = useState(false)

  // Verifica se o usuário já viu o tutorial alguma vez
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('pokemon_contest_tutorial_seen')
    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
  }, [])

  const handleCloseTutorial = () => {
    setShowTutorial(false)
    localStorage.setItem('pokemon_contest_tutorial_seen', 'true')
  }

  /**
   * Reidrata a party com a espécie fresca do catálogo local (garante que image, icon etc. estejam corretos,
   * independente do que foi persistido no Firestore)
   */
  const rehydrateParty = (party = []) =>
    party.map((p) => {
      const freshSpecies = getSpeciesById(p.speciesId || p.species?.id)
      return freshSpecies ? { ...p, species: { ...p.species, ...freshSpecies } } : p
    })

  // Inscrição em tempo real no perfil do treinador
  useEffect(() => {
    const unsub = subscribeTrainerProfile(user?.uid, (data) => {
      if (data?.party) {
        data = { ...data, party: rehydrateParty(data.party) }
      }
      setTrainerProfile(data)
      setLoading(false)
    })
    return () => unsub()
  }, [user?.uid])

  const party = trainerProfile?.party || []
  const activePokemon = party[activePokemonIndex]
    ? ensureContestStats(party[activePokemonIndex])
    : null
  const glamourCoins = trainerProfile?.inventory?.glamourCoins ?? 250

  // 1. Aplicação de Cuidados / Grooming
  const handleApplyGrooming = async (item) => {
    if (!activePokemon || glamourCoins < item.cost) return
    try {
      await applyGroomingItem(user?.uid, activePokemon.instanceId, item)
    } catch (e) {
      alert('Erro ao aplicar cuidado cosmético: ' + e.message)
    }
  }

  // 2. Iniciar o Concurso (Entrada no Palco)
  const handleStartContest = () => {
    if (!activePokemon) {
      alert('Selecione um Pokémon na sua equipe antes de subir ao palco!')
      return
    }

    // Reidratação segura dos golpes do jogador com dados de concurso
    const rawMoves =
      activePokemon.moves && activePokemon.moves.length > 0
        ? activePokemon.moves
        : activePokemon.species.defaultMoves || []

    const hydratedMoves = rawMoves
      .map((m) => {
        const id = typeof m === 'string' ? m : m.id
        return POKEMON_MOVES[id] || (typeof m === 'object' ? m : null)
      })
      .filter(Boolean)

    const finalPlayerMoves =
      hydratedMoves.length > 0
        ? hydratedMoves
        : [POKEMON_MOVES.investida_flamejante, POKEMON_MOVES.brasa_ardente]

    // Cria o jogador formatado para o palco
    const playerContestant = {
      id: 'player',
      isPlayer: true,
      trainerName: trainerProfile?.trainerName || user?.displayName || 'Você',
      title: 'Coordenador Estelar',
      nickname: activePokemon.nickname || activePokemon.species.name,
      species: activePokemon.species,
      contestStats: activePokemon.contestStats,
      sheen: activePokemon.sheen || 0,
      moves: finalPlayerMoves,
      hearts: 0,
      visualScore: 0,
      totalScore: 0,
      statusStage: null,
      lastMoveUsed: null,
    }

    // Gera 3 rivais autônomos
    const rivals = generateContestRivals(selectedCategoryKey, selectedRankKey)
    const initialContestants = [playerContestant, ...rivals]

    // Avaliação Visual Inicial dos Jurados (Apelo de Entrada calculado instantaneamente)
    const visualEvaluated = calculateVisualRound(initialContestants, selectedCategoryKey)
    const sortedOrder = sortStageTurnOrder(visualEvaluated)

    setContestants(sortedOrder)
    setCurrentRound(1)
    setCurrentTurnIndex(0)
    setCrowdHype(0)
    setLastMoveOnStage(null)
    setNarrativeLogs([
      `🏛️ Os portões do ${CONTEST_RANKS[selectedRankKey].stageName} se abrem!`,
      `✨ Apelo de Entrada: Os jurados avaliaram o brilho de abertura e postura dos concorrentes!`,
      `🎭 Rodada 1 de ${TOTAL_ROUNDS} iniciada no palco principal!`,
    ])
    setJudgeComments(
      CONTEST_JUDGES.map((j) => ({
        judgeName: j.name,
        avatar: j.avatar,
        comment: 'Abertura brilhante! Que comecem as apresentações de golpes!',
      }))
    )

    // Entra direto no palco de espetáculos e inicia o primeiro turno
    setPhase('stage')
    startTurnForIndex(0, sortedOrder, 1, 0, null)
  }

  // Gerenciador central de turnos
  const startTurnForIndex = (index, list, round, hype, lastMove) => {
    setCurrentTurnIndex(index)
    setCurrentRound(round)

    const actor = list[index]
    if (!actor) return

    if (actor.isPlayer) {
      // É a vez do jogador!
      setIsProcessingTurn(false)
      setNarrativeLogs((prev) => [
        ...prev,
        `🌟 SUA VEZ! O auditório silencia aguardando a apresentação de ${actor.nickname}!`,
      ])
    } else {
      // É a vez de uma IA rival
      setIsProcessingTurn(true)
      setNarrativeLogs((prev) => [
        ...prev,
        `⏳ ${actor.nickname} (${actor.trainerName}) avança para o centro do palco...`,
      ])

      setTimeout(() => {
        const aiMove = pickContestAIMove(actor, {
          categoryKey: selectedCategoryKey,
          lastMoveOnStage: lastMove,
          crowdHype: hype,
        })
        resolveTurnAction(actor, aiMove, index, list, round, hype, lastMove)
      }, 1300)
    }
  }

  // Executa o turno do jogador
  const handlePlayerMove = (move) => {
    if (isProcessingTurn) return
    const activeActor = contestants[currentTurnIndex]
    if (!activeActor || !activeActor.isPlayer) return

    setIsProcessingTurn(true)
    resolveTurnAction(
      activeActor,
      move,
      currentTurnIndex,
      contestants,
      currentRound,
      crowdHype,
      lastMoveOnStage
    )
  }

  // Executa a apresentação de um participante (jogador ou rival)
  const resolveTurnAction = (actor, move, actorIndex, currentList, round, hype, lastMove) => {
    const others = currentList.filter((c) => c.id !== actor.id)
    const result = executeContestMove({
      actor,
      move,
      categoryKey: selectedCategoryKey,
      crowdHype: hype,
      lastMoveOnStage: lastMove,
      otherContestants: others,
    })

    const newHype = result.newHype
    setCrowdHype(newHype)
    setLastMoveOnStage(move)
    setJudgeComments(result.judgeComments)
    setNarrativeLogs((prev) => [
      ...prev,
      `⭐ ${actor.nickname} executou "${move.name}"! (+${result.earnedHearts} ❤️)`,
      ...result.logs,
    ])

    const updatedList = currentList.map((c) => {
      if (c.id === actor.id) {
        return {
          ...c,
          hearts: c.hearts + result.earnedHearts,
          totalScore: c.totalScore + result.earnedHearts,
          lastMoveUsed: move.id,
          statusStage: 'sparkling',
        }
      }
      const matchingOther = result.updatedOthers.find((o) => o.id === c.id)
      return matchingOther || c
    })

    setContestants(updatedList)

    // Próximo ator ou próxima rodada após pequeno intervalo dramático
    setTimeout(() => {
      const nextIndex = actorIndex + 1

      if (nextIndex < updatedList.length) {
        startTurnForIndex(nextIndex, updatedList, round, newHype, move)
      } else {
        // Fim da rodada
        if (round < TOTAL_ROUNDS) {
          const nextRound = round + 1
          const reordered = sortStageTurnOrder(updatedList)
          setContestants(reordered)
          setNarrativeLogs((prev) => [
            ...prev,
            `🔔 Fim da Rodada ${round}! O pódio temporário foi reorganizado para a Rodada ${nextRound} de ${TOTAL_ROUNDS}.`,
          ])
          startTurnForIndex(0, reordered, nextRound, newHype, move)
        } else {
          // Fim do Ato II! Transição para o Showstopper Interativo
          setNarrativeLogs((prev) => [
            ...prev,
            `🎆 O PALCO ATINGE A SINCRONIA ESTELAR! Prepare-se para o Grand Finale Showstopper!`,
          ])
          setIsProcessingTurn(false)
          startShowstopperQTE()
        }
      }
    }, 1200)
  }

  // ATO III — Inicia o Minigame de QTE do Showstopper
  const startShowstopperQTE = () => {
    setPhase('stage_act3_qte')
    setQteRingScale(2.5)
    setQteStartTime(Date.now())
    setShowstopperResult(null)

    const startTime = Date.now()
    const duration = 2200 // 2.2 segundos para o anel fechar perfeitamente no centro

    const animateRing = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1.0, elapsed / duration)
      // Escala vai de 2.5 até 1.0 (momento perfeito)
      const scale = 2.5 - progress * 1.5
      setQteRingScale(scale)

      if (progress < 1.0) {
        qteAnimationRef.current = requestAnimationFrame(animateRing)
      } else {
        // Se o tempo esgotou sem clique, avalia como deslize suave
        handleTriggerSync(1.0)
      }
    }

    qteAnimationRef.current = requestAnimationFrame(animateRing)
  }

  // Quando o jogador clica no botão dourado ou aperta a tecla de sincronia
  const handleTriggerSync = (overrideScale = null) => {
    if (qteAnimationRef.current) {
      cancelAnimationFrame(qteAnimationRef.current)
    }

    const currentScale = overrideScale !== null ? overrideScale : qteRingScale
    // Momento ideal é quando scale == 1.0
    const diff = Math.round((currentScale - 1.0) * 400) // ms aproximados de diferença

    const selectedPose = SHOWSTOPPER_POSES[selectedPoseIndex] || SHOWSTOPPER_POSES[0]
    const evalResult = evaluateShowstopperSync({
      timingDifferenceMs: diff,
      selectedPose,
      actor: contestants.find((c) => c.isPlayer),
    })

    setShowstopperResult(evalResult)

    // Adiciona os pontos do Showstopper ao Jogador
    const finalContestants = contestants.map((c) => {
      if (c.isPlayer) {
        return {
          ...c,
          hearts: c.hearts + evalResult.heartsGained,
          totalScore: c.totalScore + evalResult.heartsGained,
        }
      }
      return c
    })

    setContestants(finalContestants)
  }

  // Conclui o Showstopper e exibe a Cerimônia do Pódio
  const handleFinishToPodium = async () => {
    const sortedPodium = [...contestants].sort((a, b) => b.totalScore - a.totalScore)
    setContestants(sortedPodium)
    setPhase('podium')

    const winner = sortedPodium[0]
    if (winner && winner.isPlayer) {
      const rankInfo = CONTEST_RANKS[selectedRankKey]
      try {
        await recordContestVictory(user?.uid, activePokemon.instanceId, {
          ribbonId: `ribbon_${selectedCategoryKey}_${selectedRankKey}`,
          ribbonName: `${rankInfo.ribbonName} (${CONTEST_CATEGORIES[selectedCategoryKey].name})`,
          ribbonIcon: rankInfo.ribbonIcon,
          glamourPoints: rankInfo.rewardGlamour,
        })
      } catch (e) {
        console.warn('Erro ao salvar vitória do festival:', e)
      }
    }
  }

  if (loading) {
    return (
      <div className="contest-viewport" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fbbf24', fontSize: '1.2rem' }}>Carregando Teatro dos Festivais Pokémon...</p>
      </div>
    )
  }

  const category = CONTEST_CATEGORIES[selectedCategoryKey]
  const currentRank = CONTEST_RANKS[selectedRankKey]

  return (
    <div className="contest-viewport">
      {/* Header Nobre do Grand Gala */}
      <header className="contest-header">
        <div className="contest-brand">
          <span className="contest-brand-icon">🎀</span>
          <div>
            <h1 className="contest-brand-title">Grand Gala & Festivais Pokémon</h1>
            <p className="contest-brand-subtitle">O Palco Supremo de Esplendor, Estética e Expressão</p>
          </div>
        </div>

        <div className="contest-header-actions">
          <button
            className="btn-open-tutorial"
            onClick={() => setShowTutorial(true)}
            title="Abrir Tutorial Guiado Passo a Passo"
          >
            <span>🎓</span> Como Jogar (Tutorial)
          </button>

          <div className="glamour-wallet">
            <span>✨</span>
            <span>{glamourCoins} Glamour Coins</span>
          </div>

          <Link to="/pokemon" className="contest-btn-back">
            <span>←</span> Hub Pokémon
          </Link>
        </div>
      </header>

      {/* FASE 1: CAMARIM & SALÃO DE CUIDADOS (GROOMING / SPA) */}
      {phase === 'dressing_room' && (
        <div className="contest-dressing-room">
          {/* Banner de Ajuda e Guia do Festival */}
          <div className="dressing-help-banner" style={{ gridColumn: '1 / -1' }}>
            <strong>✨ Como Funciona o Festival Pokémon:</strong>
            <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '1.2rem' }}>
              <span>1️⃣ <strong>Pelagem & Lustre:</strong> Cuide do Pokémon no SPA abaixo para aumentar seus corações de Apelo na entrada do palco.</span>
              <span>2️⃣ <strong>Afinidade Temática:</strong> Golpes da categoria do festival ganham +1 ❤️ e alimentam o fervor da plateia.</span>
              <span>3️⃣ <strong>Combos Cênicos:</strong> Encadeie golpes que combinam com o movimento anterior para ganhar +80% de corações!</span>
            </div>
            <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Deseja uma explicação visual completa passo a passo?</span>
              <button
                className="btn-open-tutorial"
                onClick={() => setShowTutorial(true)}
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
              >
                <span>🎓</span> Rever Tutorial Guiado
              </button>
            </div>
          </div>

          {/* Coluna Esquerda: Pokémon Ativo & Esplendor */}
          <div className="dressing-card">
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', color: '#fde047' }}>
              Camarim & Preparação
            </h2>

            {/* Seletor de Pokémon da Equipe */}
            {party.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', overflowX: 'auto' }}>
                {party.map((p, idx) => (
                  <button
                    key={p.instanceId}
                    onClick={() => setActivePokemonIndex(idx)}
                    style={{
                      background: activePokemonIndex === idx ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255,255,255,0.05)',
                      border: activePokemonIndex === idx ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.nickname || p.species.name}
                  </button>
                ))}
              </div>
            )}

              {activePokemon ? (
              <>
                <div className="pokemon-stage-preview">
                  <div className="pokemon-spotlight-disc">
                    {activePokemon.species.image ? (
                      <img
                        src={activePokemon.species.image}
                        alt={activePokemon.species.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextSibling?.style && (e.currentTarget.nextSibling.style.display = 'flex')
                        }}
                      />
                    ) : null}
                    <span
                      style={{
                        display: activePokemon.species.image ? 'none' : 'flex',
                        fontSize: '5rem',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {activePokemon.species.icon || '✨'}
                    </span>
                  </div>
                  <h3 style={{ margin: '0.8rem 0 0.2rem', fontSize: '1.2rem' }}>
                    {activePokemon.nickname || activePokemon.species.name}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    {activePokemon.species.classification} • Nv. {activePokemon.level}
                  </span>

                  <div className="pokemon-sheen-indicator">
                    <span>✨ Lustre da Pelagem:</span>
                    <strong>{activePokemon.sheen || 0}%</strong>
                  </div>
                </div>

                {/* Barras de Esplendor */}
                <div className="contest-stat-list">
                  {Object.values(CONTEST_CATEGORIES).map((cat) => {
                    const val = activePokemon.contestStats?.[cat.id] || 10
                    return (
                      <div key={cat.id} className="contest-stat-row">
                        <div className="contest-stat-header">
                          <span style={{ color: cat.color }}>
                            {cat.icon} {cat.name}
                          </span>
                          <span>{val} / 100</span>
                        </div>
                        <div className="contest-stat-bar-track">
                          <div
                            className="contest-stat-bar-fill"
                            style={{
                              width: `${Math.min(100, val)}%`,
                              background: `linear-gradient(90deg, ${cat.badgeColor}, ${cat.color})`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Fitas Conquistadas */}
                <h4 style={{ fontSize: '0.9rem', margin: '1rem 0 0.4rem', color: '#fde047' }}>
                  Fitas & Conquistas Oficiais
                </h4>
                <div className="ribbon-rack">
                  {(activePokemon.ribbons || []).length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Nenhuma fita conquistada ainda. Vença seu primeiro festival!
                    </span>
                  ) : (
                    activePokemon.ribbons.map((rib, rIdx) => (
                      <span key={rIdx} className="ribbon-badge">
                        <span>{rib.icon || '🎀'}</span>
                        <span>{rib.name || rib}</span>
                      </span>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p style={{ color: '#94a3b8' }}>Nenhum Pokémon na sua equipe no momento.</p>
            )}
          </div>

          {/* Coluna Direita: Cuidados Cosméticos & Inscrição no Festival */}
          <div className="dressing-card">
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: '#fde047' }}>
              Tratamentos & Grooming Pokémon
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.2rem 0' }}>
              Use itens aromáticos e escovas especiais para polir a pelagem e elevar os atributos de apresentação antes do show.
            </p>

            <div className="grooming-shelf">
              {GROOMING_ITEMS.map((item) => (
                <div key={item.id} className="grooming-item-card">
                  <div>
                    <div className="grooming-item-header">
                      <span className="grooming-item-icon">{item.icon}</span>
                      <h4 className="grooming-item-name">{item.name}</h4>
                    </div>
                    <p className="grooming-item-desc">{item.description}</p>
                  </div>
                  <div className="grooming-item-footer">
                    <span className="grooming-cost">✨ {item.cost}</span>
                    <button
                      className="btn-apply-grooming"
                      onClick={() => handleApplyGrooming(item)}
                      disabled={glamourCoins < item.cost}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.8rem 0' }} />

            {/* Inscrição no Festival */}
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: '#fde047' }}>
              Selecione o Festival & Categoria
            </h2>

            <div className="category-selector-grid">
              {Object.values(CONTEST_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  className={`category-choice-btn ${selectedCategoryKey === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryKey(cat.id)}
                >
                  <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                  <strong>{cat.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{cat.title}</span>
                </button>
              ))}
            </div>

            {/* Ranking do Festival */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem', marginTop: '1rem' }}>
              {Object.values(CONTEST_RANKS).map((rank) => (
                <button
                  key={rank.id}
                  className={`category-choice-btn ${selectedRankKey === rank.id ? 'active' : ''}`}
                  onClick={() => setSelectedRankKey(rank.id)}
                >
                  <span style={{ fontSize: '1.2rem' }}>{rank.ribbonIcon}</span>
                  <strong>{rank.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rank.stageName}</span>
                </button>
              ))}
            </div>

            {/* Botão de Subir ao Palco */}
            <button className="btn-enter-stage" onClick={handleStartContest}>
              <span>🎭</span> Entrar no Palco dos Espetáculos
            </button>
          </div>
        </div>
      )}

      {/* FASE 2: O PALCO DOS ESPETÁCULOS AO VIVO */}
      {phase === 'stage' && (
        <div className="contest-live-stage">
          <div className="stage-theater">
            <div className="stage-spotlights" />

            {/* Medidor de Fervor da Multidão (Crowd Hype Meter) */}
            <div className="crowd-hype-banner">
              <div className="crowd-hype-title">
                <span>🔥</span>
                <span>Fervor da Plateia ({category.name}):</span>
              </div>
              <div className="crowd-stars-gauge">
                {[...Array(MAX_CROWD_HYPE)].map((_, i) => (
                  <span key={i} className={`crowd-star ${i < crowdHype ? 'lit' : ''}`}>
                    ⭐
                  </span>
                ))}
              </div>
            </div>

            {/* Os 4 Concorrentes no Palco */}
            <div className="stage-contestants-row">
              {contestants.map((c, idx) => {
                const isCurrentActor = currentTurnIndex === idx
                return (
                  <div
                    key={c.id}
                    className={`contestant-podium-card ${c.isPlayer ? 'is-player' : ''} ${
                      isCurrentActor ? 'is-active-turn' : ''
                    }`}
                  >
                    <div className="contestant-hearts-counter">
                      <span>❤️</span>
                      <span>{c.hearts}</span>
                    </div>

                    <div className="contestant-avatar-box">
                      {c.species?.image ? (
                        <img
                          src={c.species.image}
                          alt={c.nickname}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.display = 'flex')
                          }}
                        />
                      ) : null}
                      <span
                        style={{
                          display: c.species?.image ? 'none' : 'flex',
                          fontSize: '3rem',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '75px',
                          height: '75px',
                        }}
                      >
                        {c.species?.icon || '✨'}
                      </span>
                    </div>

                    <h4 className="contestant-name-tag">{c.nickname}</h4>
                    <span className="contestant-trainer-tag">
                      {c.isPlayer ? '⭐ Você' : c.trainerName}
                    </span>

                    {c.statusStage === 'sparkling' && (
                      <span style={{ fontSize: '0.75rem', color: '#fde047' }}>✨ Inspirado!</span>
                    )}
                    {c.statusStage === 'nervous' && (
                      <span style={{ fontSize: '0.75rem', color: '#f87171' }}>💔 Tenso</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Mesa dos 3 Jurados */}
            <div className="judges-table">
              {judgeComments.map((jc, jIdx) => (
                <div key={jIdx} className="judge-seat">
                  <span className="judge-avatar">{jc.avatar}</span>
                  <div className="judge-info">
                    <span className="judge-name">{jc.judgeName}</span>
                    <p className="judge-bubble">"{jc.comment}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Painel Inferior: Escolha de Golpe */}
          <div className="stage-action-panel">
            <div>
              {/* Banner do Último Movimento no Palco & Dica de Combo */}
              {lastMoveOnStage && (
                <div className="last-move-banner">
                  <span>
                    🎭 Movimento anterior no palco: <strong>{lastMoveOnStage.name}</strong>
                  </span>
                  {contestants
                    .find((c) => c.isPlayer)
                    ?.moves?.some((m) => m.contestData?.comboTriggers?.includes(lastMoveOnStage.id)) ? (
                    <span className="combo-tip-alert">⚡ Você tem um golpe que fecha COMBO agora!</span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Tema do Festival: <strong>{category.name}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Indicador de Status do Turno */}
              {contestants[currentTurnIndex]?.isPlayer && !isProcessingTurn ? (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(217, 119, 6, 0.35))',
                    border: '1px solid #fbbf24',
                    borderRadius: '14px',
                    padding: '0.8rem 1.2rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#fef08a', fontSize: '0.95rem' }}>
                    🌟 É A SUA VEZ! Escolha a apresentação de {activePokemon?.nickname || 'seu Pokémon'} (Rodada {currentRound} de {TOTAL_ROUNDS}):
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#fde047', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '8px' }}>
                    Clique para executar
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '0.8rem 1.2rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>⏳</span>
                  <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                    Apresentação de <strong>{contestants[currentTurnIndex]?.nickname || 'Rival'}</strong> em andamento (Posição {currentTurnIndex + 1}/4)... Aguarde seu turno.
                  </span>
                </div>
              )}

              {/* Grid de Golpes com Badges de Estratégia Claros */}
              <div className="moves-selection-grid">
                {(
                  contestants.find((c) => c.isPlayer)?.moves ||
                  (activePokemon?.moves || []).map((m) => (typeof m === 'string' ? POKEMON_MOVES[m] : POKEMON_MOVES[m?.id] || m))
                ).filter(Boolean).map((move) => {
                  const cData = move.contestData || {}
                  const isTurnOfPlayer = contestants[currentTurnIndex]?.isPlayer === true
                  const canClick = isTurnOfPlayer && !isProcessingTurn

                  const isCombo = lastMoveOnStage && cData.comboTriggers?.includes(lastMoveOnStage.id)
                  const isSameCategory = cData.category === selectedCategoryKey
                  const playerContestant = contestants.find((c) => c.isPlayer)
                  const isRepeat = playerContestant?.lastMoveUsed === move.id
                  const moveCat = CONTEST_CATEGORIES[cData.category] || CONTEST_CATEGORIES.spirit

                  return (
                    <button
                      key={move.id}
                      className={`contest-move-card ${canClick ? 'player-turn-ready' : ''} ${isCombo ? 'has-combo' : ''}`}
                      onClick={() => handlePlayerMove(move)}
                      disabled={!canClick}
                      style={{
                        borderColor: canClick ? (isCombo ? '#38bdf8' : '#fbbf24') : 'rgba(255,255,255,0.1)',
                        cursor: canClick ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {/* Linha de Badges Estratégicos */}
                      <div className="contest-move-tags-row">
                        <span
                          className="contest-badge-cat"
                          style={{
                            background: `${moveCat.color}22`,
                            color: moveCat.color,
                            border: `1px solid ${moveCat.color}55`,
                          }}
                        >
                          {moveCat.icon} {moveCat.name}
                        </span>

                        {isSameCategory && (
                          <span className="contest-badge-theme">
                            ⭐ Tema (+1 ❤️)
                          </span>
                        )}

                        {isCombo && (
                          <span className="contest-badge-combo">
                            ⚡ COMBO ATIVO (+80%)
                          </span>
                        )}

                        {isRepeat && (
                          <span className="contest-badge-repeat">
                            ⚠️ Repetido (-2 ❤️)
                          </span>
                        )}

                        {cData.jam > 0 && (
                          <span className="contest-badge-jam">
                            💥 Tensão -{cData.jam} ❤️
                          </span>
                        )}
                      </div>

                      <div className="contest-move-header">
                        <h4 className="contest-move-name" style={{ color: canClick ? '#fef08a' : '#fff' }}>
                          {move.name}
                        </h4>
                        <span className="contest-move-appeal-badge">
                          ❤️ +{cData.appeal || 3} Apelo
                        </span>
                      </div>

                      <p className="contest-move-desc">{move.description}</p>
                      <p className="contest-move-flavor">"{cData.stageFlavor || 'Expressão cênica deslumbrante.'}"</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Log Cênico Teatral */}
            <div className="stage-narrative-log">
              <h4 className="log-title">Crônicas do Palco</h4>
              <div className="log-scroll-area">
                {narrativeLogs.map((log, lIdx) => (
                  <div key={lIdx} className="log-entry">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FASE 3: ATO III — SHOWSTOPPER INTERATIVO (QTE MODAL) */}
      {phase === 'stage_act3_qte' && (
        <div className="showstopper-overlay">
          <div className="showstopper-box">
            <span style={{ fontSize: '3rem' }}>🌟</span>
            <h2 style={{ fontSize: '1.8rem', margin: '0.5rem 0', color: '#fde047' }}>
              O Gran Finale Showstopper!
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
              Sincronize sua energia com o Pokémon! Clique no instante em que o Anel de Sincronia fechar perfeitamente na zona dourada!
            </p>

            {/* Seletor de Pose de Assinatura */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', margin: '1rem 0' }}>
              {SHOWSTOPPER_POSES.map((pose, pIdx) => (
                <button
                  key={pose.id}
                  onClick={() => setSelectedPoseIndex(pIdx)}
                  style={{
                    background: selectedPoseIndex === pIdx ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.06)',
                    border: selectedPoseIndex === pIdx ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {pose.icon} {pose.name}
                </button>
              ))}
            </div>

            {/* Minigame do Anel de Sincronia */}
            <div className="qte-ring-container">
              <div className="qte-target-center">
                <span>{activePokemon?.species.icon || '🔥'}</span>
              </div>
              <div
                className="qte-shrinking-ring"
                style={{
                  width: `${90 * qteRingScale}px`,
                  height: `${90 * qteRingScale}px`,
                }}
              />
            </div>

            {!showstopperResult ? (
              <button className="btn-trigger-sync" onClick={() => handleTriggerSync()}>
                ✨ DISPARAR POSE FINAL! ✨
              </button>
            ) : (
              <div style={{ marginTop: '1.2rem' }}>
                <h3 style={{ color: '#fde047', fontSize: '1.4rem', margin: '0 0 0.5rem' }}>
                  {showstopperResult.title}
                </h3>
                <p style={{ color: '#e2e8f0', fontSize: '0.95rem', margin: '0 0 1rem' }}>
                  {showstopperResult.feedback} (+{showstopperResult.heartsGained} Corações de Ovação!)
                </p>
                <button className="btn-enter-stage" onClick={handleFinishToPodium} style={{ margin: '0 auto', maxWidth: '280px' }}>
                  🏆 Ir para a Premiação
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FASE 4: CERIMÔNIA DO PÓDIO & ENTREGA DA FITA */}
      {phase === 'podium' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '4rem' }}>🏆</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0', color: '#fde047' }}>
            Cerimônia de Premiação do Grand Gala
          </h2>
          <p style={{ color: '#cbd5e1' }}>{currentRank.stageName} • {category.title}</p>

          <div className="ceremony-podium-grid">
            {contestants.slice(0, 3).map((c, rankIdx) => (
              <div key={c.id} className={`podium-pillar rank-${rankIdx + 1}`}>
                <span style={{ fontSize: '2.5rem' }}>{rankIdx === 0 ? '👑' : rankIdx === 1 ? '🥈' : '🥉'}</span>
                <img
                  src={c.species.image}
                  alt={c.nickname}
                  style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0.5rem 0' }}
                />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>{c.nickname}</h4>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{c.isPlayer ? 'Você' : c.trainerName}</span>
                <strong style={{ color: '#fde047', marginTop: '0.4rem' }}>{c.totalScore} ❤️</strong>
              </div>
            ))}
          </div>

          {contestants[0]?.isPlayer ? (
            <div style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid #fbbf24', borderRadius: '20px', padding: '1.5rem', margin: '2rem 0' }}>
              <h3 style={{ color: '#fde047', margin: '0 0 0.5rem' }}>🎉 VOCÊ É O GRANDE CAMPEÃO! 🎉</h3>
              <p style={{ color: '#e2e8f0', margin: '0 0 0.8rem' }}>
                Seu Pokémon recebeu a prestigiada <strong>{currentRank.ribbonName}</strong> e você faturou <strong>+{currentRank.rewardGlamour} Moedas de Glamour</strong>!
              </p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', padding: '1.5rem', margin: '2rem 0' }}>
              <h3 style={{ color: '#cbd5e1', margin: '0 0 0.5rem' }}>Bela Apresentação!</h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>
                Continue aprimorando o brilho e os combos do seu Pokémon no camarim para conquistar o topo no próximo festival!
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              className="contest-btn-back"
              onClick={() => {
                setPhase('dressing_room')
              }}
            >
              🔄 Voltar ao Camarim
            </button>
            <Link to="/pokemon" className="btn-enter-stage" style={{ maxWidth: '240px', padding: '0.8rem 1.4rem' }}>
              Retornar ao Hub
            </Link>
          </div>
        </div>
      )}

      {/* Modal de Tutorial Guiado Interativo */}
      <ContestTutorialModal isOpen={showTutorial} onClose={handleCloseTutorial} />
    </div>
  )
}
