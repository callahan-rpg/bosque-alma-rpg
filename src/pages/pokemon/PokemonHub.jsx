import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  subscribeTrainerProfile,
  chooseStarterPokemon,
  updatePokemonEVs,
  updateTrainerName,
} from '../../firebase/pokemonTrainerService'
import { getAllSpecies, getSpeciesById } from '../../data/pokemonSpecies'
import { POKEMON_MOVES } from '../../data/pokemonMoves'
import { TYPE_COLORS } from '../../data/pokemonTypes'
import { EV_TOTAL_LIMIT, calculateAllStats } from '../../utils/pokemonEngine'
import '../../styles/pokemon-hub.css'

export default function PokemonHub() {
  const { user } = useAuth()
  const [trainerProfile, setTrainerProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('party') // 'party' | 'pokedex'
  const [selectedPokemon, setSelectedPokemon] = useState(null) // para o modal de detalhes
  const [tempEVs, setTempEVs] = useState(null)
  const [isSavingEVs, setIsSavingEVs] = useState(false)
  const [customTrainerName, setCustomTrainerName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [newNameInput, setNewNameInput] = useState('')

  const allSpecies = getAllSpecies()

  /**
   * Garante que o campo `image` da espécie sempre reflita o catálogo local,
   * independente do que foi persistido no Firestore.
   */
  const rehydrateParty = (party = []) =>
    party.map((p) => {
      const freshSpecies = getSpeciesById(p.speciesId || p.species?.id)
      return freshSpecies ? { ...p, species: { ...p.species, ...freshSpecies } } : p
    })

  // Inscrição em tempo real no perfil do treinador
  useEffect(() => {
    const unsubscribe = subscribeTrainerProfile(user?.uid, (data) => {
      if (data?.party) {
        data = { ...data, party: rehydrateParty(data.party) }
      }
      setTrainerProfile(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user?.uid])

  // Escolha do Pokémon Inicial
  const handleChooseStarter = async (speciesId) => {
    try {
      setLoading(true)
      const trainerName =
        (customTrainerName || '').trim() ||
        user?.displayName ||
        user?.email?.split('@')[0] ||
        'Treinador'
      await chooseStarterPokemon(user?.uid, speciesId, trainerName)
    } catch (err) {
      console.error('Erro ao escolher inicial:', err)
      alert('Erro ao escolher inicial: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Atualizar nome do treinador
  const handleSaveNewName = async () => {
    if (!newNameInput.trim()) return
    try {
      await updateTrainerName(user?.uid, newNameInput)
      setIsEditingName(false)
    } catch (e) {
      alert('Erro ao atualizar nome: ' + e.message)
    }
  }

  // Abre modal de detalhes do Pokémon
  const handleOpenDetails = (poke) => {
    setSelectedPokemon(poke)
    setTempEVs({ ...poke.evs })
  }

  // Ajusta EV temporário no modal
  const handleStepEV = (statKey, delta) => {
    if (!tempEVs) return
    const currentVal = tempEVs[statKey] || 0
    const currentTotal = Object.values(tempEVs).reduce((a, b) => a + b, 0)

    if (delta > 0) {
      if (currentVal >= 10) return
      if (currentTotal >= EV_TOTAL_LIMIT) {
        alert(`Você atingiu o teto máximo de ${EV_TOTAL_LIMIT} pontos de esforço (EVs)!`)
        return
      }
    } else {
      if (currentVal <= 0) return
    }

    setTempEVs((prev) => ({
      ...prev,
      [statKey]: Math.max(0, Math.min(10, currentVal + delta)),
    }))
  }

  // Salva novos EVs no Firestore
  const handleSaveEVs = async () => {
    if (!selectedPokemon || !tempEVs) return
    try {
      setIsSavingEVs(true)
      await updatePokemonEVs(user?.uid, selectedPokemon.instanceId, tempEVs)
      // Atualiza estado local do modal
      const newStats = calculateAllStats(
        selectedPokemon.species,
        selectedPokemon.ivs,
        tempEVs,
        selectedPokemon.level
      )
      setSelectedPokemon((prev) => ({
        ...prev,
        evs: tempEVs,
        stats: newStats,
      }))
      alert('Treinamento de EVs salvo com sucesso!')
    } catch (err) {
      alert('Erro ao salvar treino: ' + err.message)
    } finally {
      setIsSavingEVs(false)
    }
  }

  if (loading) {
    return (
      <div className="poke-hub-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="poke-ball-logo" style={{ margin: '0 auto 16px auto', animation: 'spin 2s linear infinite' }} />
          <div>Carregando jornada Pokémon...</div>
        </div>
      </div>
    )
  }

  // ── SE NÃO TEM PERFIL OU PARTY ESTÁ VAZIA: TELA DE ESCOLHA DO INICIAL ──
  if (!trainerProfile || !trainerProfile.party || trainerProfile.party.length === 0) {
    const starterFogo = allSpecies.find((s) => s.id === 'cospe_lava')
    const starterAgua = allSpecies.find((s) => s.id === 'hidrolontra')

    return (
      <div className="poke-hub-container">
        <header className="poke-hub-header">
          <div className="poke-trainer-profile">
            <div className="poke-trainer-avatar">🧢</div>
            <div>
              <h2 className="poke-trainer-name">Novo Treinador</h2>
              <div className="poke-trainer-tag">Boas-vindas ao Mundo dos Fakemons</div>
            </div>
          </div>
          <Link to="/mundos" className="poke-hub-tab-btn">
            <span>🌐</span>
            <span>Seletor de Mundos</span>
          </Link>
        </header>

        <section className="poke-starter-stage">
          <h1 className="poke-starter-title">Escolha seu Primeiro Companheiro</h1>
          <p className="poke-starter-subtitle">
            Sua jornada começa agora no laboratório. Defina seu nome de Treinador neste universo e
            selecione qual criatura elemental você deseja adotar:
          </p>

          {/* Campo para Definir o Nome do Treinador */}
          <div
            style={{
              maxWidth: '420px',
              margin: '0 auto 28px auto',
              textAlign: 'left',
              background: 'rgba(255,255,255,0.04)',
              padding: '16px 20px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#f1f5f9',
                marginBottom: '8px',
              }}
            >
              👤 Nome do seu Treinador neste Universo:
            </label>
            <input
              type="text"
              value={customTrainerName}
              onChange={(e) => setCustomTrainerName(e.target.value)}
              placeholder="Ex: Red, Satoshi, Hiro, Lucas..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '6px' }}>
              💡 Este nome é exclusivo do Mundo Pokémon e não altera o nome do seu personagem no Jardim.
            </span>
          </div>

          <div className="poke-starter-grid">
            {/* INICIAL DE FOGO */}
            {starterFogo && (
              <div className="poke-starter-card fogo">
                <div>
                  <div className="poke-starter-icon">
                    {starterFogo.image ? (
                      <img
                        src={starterFogo.image}
                        alt={starterFogo.name}
                        style={{ width: '110px', height: '110px', objectFit: 'contain' }}
                      />
                    ) : (
                      starterFogo.icon
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '22px', color: '#fff' }}>
                    {starterFogo.name}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      marginBottom: '12px',
                    }}
                  >
                    Tipo Fogo
                  </span>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                    {starterFogo.description}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                    ⚡ Vel Base: <strong>{starterFogo.baseStats.speed}</strong> • 🔥 Atq Esp:{' '}
                    <strong>{starterFogo.baseStats.spAttack}</strong>
                  </div>
                  <button
                    type="button"
                    className="poke-choose-btn fogo"
                    onClick={() => handleChooseStarter('cospe_lava')}
                  >
                    🔥 Escolher Cospe-Lava
                  </button>
                </div>
              </div>
            )}

            {/* INICIAL DE ÁGUA */}
            {starterAgua && (
              <div className="poke-starter-card agua">
                <div>
                  <div className="poke-starter-icon">
                    {starterAgua.image ? (
                      <img
                        src={starterAgua.image}
                        alt={starterAgua.name}
                        style={{ width: '110px', height: '110px', objectFit: 'contain' }}
                      />
                    ) : (
                      starterAgua.icon
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '22px', color: '#fff' }}>
                    {starterAgua.name}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: '#3b82f6',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      marginBottom: '12px',
                    }}
                  >
                    Tipo Água
                  </span>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                    {starterAgua.description}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                    ⚡ Vel Base: <strong>{starterAgua.baseStats.speed}</strong> • ⚔️ Ataque:{' '}
                    <strong>{starterAgua.baseStats.attack}</strong>
                  </div>
                  <button
                    type="button"
                    className="poke-choose-btn agua"
                    onClick={() => handleChooseStarter('hidrolontra')}
                  >
                    💧 Escolher Hidrolontra
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  // ── SE JÁ TEM PERFIL: HUB COMPLETO COM PARTY E POKÉDEX ──
  const party = trainerProfile.party || []
  const pokedex = trainerProfile.pokedex || {}
  const caughtCount = Object.values(pokedex).filter((p) => p.caught).length
  const seenCount = Object.keys(pokedex).length

  // Cálculo de EVs no modal
  const tempEVTotal = tempEVs ? Object.values(tempEVs).reduce((a, b) => a + b, 0) : 0
  const previewStats =
    selectedPokemon && tempEVs
      ? calculateAllStats(
          selectedPokemon.species,
          selectedPokemon.ivs,
          tempEVs,
          selectedPokemon.level
        )
      : null

  return (
    <div className="poke-hub-container">
      {/* HEADER PRINCIPAL */}
      <header className="poke-hub-header">
        <div className="poke-trainer-profile">
          <div className="poke-trainer-avatar">🧢</div>
          <div>
            {isEditingName ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <input
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: '#0b0f19',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveNewName}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#10b981',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <h2 className="poke-trainer-name">
                  {trainerProfile.trainerName || 'Treinador Pokémon'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setNewNameInput(trainerProfile.trainerName || '')
                    setIsEditingName(true)
                  }}
                  title="Alterar Nome do Treinador neste Universo"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '2px 4px',
                  }}
                >
                  ✏️
                </button>
              </div>
            )}
            <div className="poke-trainer-tag">
              <span>Pokédex: {caughtCount} Capturados • {seenCount} Vistos</span>
              <span>•</span>
              <span>🎒 {trainerProfile.inventory?.pokeballs || 0} Pokébolas</span>
              <span>•</span>
              <span>🪙 {trainerProfile.inventory?.coins || 100} Moedas</span>
              <span>•</span>
              <span>⚔️ {trainerProfile.stats?.winsCount || 0}V - {trainerProfile.stats?.lossesCount || 0}D</span>
            </div>
          </div>
        </div>

        <nav className="poke-hub-nav">
          <button
            type="button"
            className={`poke-hub-tab-btn ${activeTab === 'party' ? 'active' : ''}`}
            onClick={() => setActiveTab('party')}
          >
            👥 Minha Equipe ({party.length}/6)
          </button>
          <button
            type="button"
            className={`poke-hub-tab-btn ${activeTab === 'pokedex' ? 'active' : ''}`}
            onClick={() => setActiveTab('pokedex')}
          >
            📱 Pokédex Regional
          </button>
          <Link
            to="/pokemon/rota-1"
            className="poke-hub-tab-btn"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: '#10b981',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            }}
          >
            <span>🌿</span>
            <span>Rota 1 (Explorar)</span>
          </Link>
          <Link
            to="/pokemon/contest"
            className="poke-hub-tab-btn"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderColor: '#f59e0b',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)',
            }}
          >
            <span>🎀</span>
            <span>Grand Gala & Festivais</span>
          </Link>
          <Link to="/pokemon/admin" className="poke-hub-tab-btn">
            🔬 Laboratório & Admin
          </Link>
          <Link to="/mundos" className="poke-hub-tab-btn">
            🌐 Mundos
          </Link>
        </nav>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* ABA: MINHA EQUIPE (6 SLOTS) */}
        {activeTab === 'party' && (
          <div>
            {/* Banner de Viagem para a Rota 1 */}
            <div
              style={{
                marginBottom: '20px',
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <strong style={{ fontSize: '15px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌿</span>
                  <span>Rota 1 (Vale dos Primórdios) está aberta para exploração!</span>
                </strong>
                <span style={{ fontSize: '12.5px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                  Converse no chat da rota, explore a grama alta e capture novas criaturas selvagens com suas Pokébolas.
                </span>
              </div>
              <Link
                to="/pokemon/rota-1"
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                }}
              >
                <span>Viajar para Rota 1</span>
                <span>➔</span>
              </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#fff' }}>Equipe Ativa</h2>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Até 6 criaturas prontas para combate e jornada. Clique para ver detalhes e treinar EVs.
                </span>
              </div>
            </div>

            <div className="poke-party-grid">
              {Array.from({ length: 6 }).map((_, index) => {
                const poke = party[index]

                if (!poke) {
                  return (
                    <div key={index} className="poke-slot-empty">
                      <span style={{ fontSize: '32px', opacity: 0.4 }}>⬚</span>
                      <span>Slot {index + 1} Vazio</span>
                      <span style={{ fontSize: '11px', opacity: 0.6 }}>Capture novos Pokémon na jornada</span>
                    </div>
                  )
                }

                const primaryType = poke.species.types[0] || 'Normal'
                const typeStyle = TYPE_COLORS[primaryType] || TYPE_COLORS.Normal
                const hpPercent = Math.max(0, Math.min(100, (poke.currentHp / poke.stats.maxHp) * 100))
                const evTotal = Object.values(poke.evs || {}).reduce((a, b) => a + b, 0)
                const ivTotal = Object.values(poke.ivs || {}).reduce((a, b) => a + b, 0)

                return (
                  <div
                    key={poke.instanceId}
                    className="poke-slot-card"
                    onClick={() => handleOpenDetails(poke)}
                  >
                    <div className="poke-slot-header">
                      <div>
                        <h3 className="poke-slot-name">{poke.nickname}</h3>
                        <div className="poke-slot-sub">{poke.species.name} • #{String(poke.species.dexNumber).padStart(3, '0')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: typeStyle.bg,
                            color: typeStyle.text,
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {poke.species.types.join('/')}
                        </span>
                        <span className="poke-level-badge">Nv. {poke.level}</span>
                      </div>
                    </div>

                    {/* Arte Visual do Pokémon */}
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 10px' }}>
                      {poke.species.image ? (
                        <img
                          src={poke.species.image}
                          alt={poke.nickname}
                          style={{
                            width: '85px',
                            height: '85px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '38px' }}>{poke.species.icon}</div>
                      )}
                    </div>

                    {/* Barra de HP */}
                    <div className="poke-hp-section">
                      <div className="poke-hp-label">
                        <span>HP</span>
                        <span>{poke.currentHp} / {poke.stats.maxHp}</span>
                      </div>
                      <div className="poke-hp-track">
                        <div
                          className="poke-hp-fill"
                          style={{
                            width: `${hpPercent}%`,
                            background: hpPercent > 50 ? '#10b981' : hpPercent > 20 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>

                    {/* Pílulas de Genética (IVs) e Treino (EVs) */}
                    <div className="poke-stats-quick-pills">
                      <div className="poke-mini-pill">
                        <span style={{ color: '#94a3b8' }}>Genética (IVs)</span>
                        <strong>{ivTotal} / 60</strong>
                      </div>
                      <div className="poke-mini-pill">
                        <span style={{ color: '#94a3b8' }}>Treino (EVs)</span>
                        <strong style={{ color: evTotal === EV_TOTAL_LIMIT ? '#ef4444' : '#10b981' }}>
                          {evTotal} / {EV_TOTAL_LIMIT} pts
                        </strong>
                      </div>
                      <div className="poke-mini-pill">
                        <span style={{ color: '#94a3b8' }}>Velocidade</span>
                        <strong>{poke.stats.speed}</strong>
                      </div>
                    </div>

                    {/* 4 Golpes Equipados */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {poke.moves.map((mv) => (
                        <div
                          key={mv.id}
                          style={{
                            padding: '6px 8px',
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: '8px',
                            fontSize: '11px',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{mv.name}</span>
                          <span style={{ color: TYPE_COLORS[mv.type]?.bg || '#fff' }}>{mv.power || '—'}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                      ⚡ Clique para abrir a Ficha & Treinar EVs ➔
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ABA: POKÉDEX REGIONAL */}
        {activeTab === 'pokedex' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#fff' }}>Pokédex Regional</h2>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Catálogo de todas as criaturas descobertas neste universo.
              </span>
            </div>

            <div className="poke-dex-grid">
              {allSpecies.map((sp) => {
                const entry = pokedex[sp.id]
                const isCaught = entry?.caught
                const isSeen = entry?.seen || isCaught
                const typeStyle = TYPE_COLORS[sp.types[0]] || TYPE_COLORS.Normal

                return (
                  <div key={sp.id} className="poke-dex-entry-card">
                    <span
                      className="poke-dex-seen-status"
                      style={{
                        background: isCaught
                          ? 'rgba(16, 185, 129, 0.2)'
                          : isSeen
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: isCaught ? '#34d399' : isSeen ? '#60a5fa' : '#64748b',
                      }}
                    >
                      {isCaught ? '⭐ Capturado' : isSeen ? '👀 Visto' : '❓ Não Descoberto'}
                    </span>

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                      <div
                        style={{
                          width: '58px',
                          height: '58px',
                          borderRadius: '16px',
                          background: 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          overflow: 'hidden',
                        }}
                      >
                        {isSeen ? (
                          sp.image ? (
                            <img
                              src={sp.image}
                              alt={sp.name}
                              style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                            />
                          ) : (
                            sp.icon
                          )
                        ) : (
                          '❓'
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
                          #{String(sp.dexNumber).padStart(3, '0')}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
                          {isSeen ? sp.name : '???'}
                        </h3>
                        {isSeen && (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: typeStyle.bg,
                              color: typeStyle.text,
                              fontSize: '10px',
                              fontWeight: 700,
                              marginTop: '4px',
                            }}
                          >
                            {sp.types.join('/')}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSeen ? (
                      <div>
                        <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                          {sp.description}
                        </p>
                        <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', gap: '12px' }}>
                          <span>📏 {sp.height}</span>
                          <span>⚖️ {sp.weight}</span>
                          <span>🏆 Taxa: {sp.catchRate}%</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                        Encontre esta criatura em rotas ou batalhas para desbloquear seus dados na Pokédex.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE FICHA COMPLETA DO POKÉMON & TREINAMENTO DE EVS */}
      {selectedPokemon && tempEVs && previewStats && (
        <div className="poke-modal-overlay" onClick={() => setSelectedPokemon(null)}>
          <div className="poke-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="poke-modal-header">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {selectedPokemon.species.image ? (
                  <img
                    src={selectedPokemon.species.image}
                    alt={selectedPokemon.nickname}
                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: '32px' }}>{selectedPokemon.species.icon}</span>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedPokemon.nickname}</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {selectedPokemon.species.name} • Nível {selectedPokemon.level} • {selectedPokemon.species.types.join('/')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="poke-close-btn"
                onClick={() => setSelectedPokemon(null)}
              >
                ✕
              </button>
            </div>

            {/* SEÇÃO 1: GENÉTICA DE NASCENÇA (IVs 1 a 10) */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#f59e0b' }}>
                  🧬 Valores Individuais (IVs: 1 a 10)
                </h4>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Definidos no momento da captura</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {[
                  { key: 'hp', name: 'HP' },
                  { key: 'attack', name: 'Atk' },
                  { key: 'defense', name: 'Def' },
                  { key: 'spAttack', name: 'SpA' },
                  { key: 'spDefense', name: 'SpD' },
                  { key: 'speed', name: 'Vel' },
                ].map((s) => (
                  <div
                    key={s.key}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                      padding: '8px 4px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.name}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                      {selectedPokemon.ivs[s.key]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 2: MÓDULO DE TREINAMENTO DE EVS (0 a 10, Máx 30 Total) */}
            <div style={{ marginBottom: '22px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#38bdf8' }}>
                  🏋️ Treinamento de Esforço (EVs)
                </h4>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: tempEVTotal >= EV_TOTAL_LIMIT ? '#ef4444' : '#10b981',
                  }}
                >
                  {tempEVTotal} / {EV_TOTAL_LIMIT} Pontos Distribuídos
                </span>
              </div>

              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', marginBottom: '16px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(tempEVTotal / EV_TOTAL_LIMIT) * 100}%`,
                    background: tempEVTotal >= EV_TOTAL_LIMIT ? '#ef4444' : '#38bdf8',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>

              {/* Controles de cada atributo */}
              {[
                { key: 'hp', name: 'HP', val: previewStats.maxHp },
                { key: 'attack', name: 'Ataque', val: previewStats.attack },
                { key: 'defense', name: 'Defesa', val: previewStats.defense },
                { key: 'spAttack', name: 'Atq. Esp.', val: previewStats.spAttack },
                { key: 'spDefense', name: 'Def. Esp.', val: previewStats.spDefense },
                { key: 'speed', name: 'Velocidade', val: previewStats.speed },
              ].map((row) => (
                <div key={row.key} className="poke-ev-control-row">
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{row.name}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>{row.val}</span>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${((tempEVs[row.key] || 0) / 10) * 100}%`,
                        background: '#38bdf8',
                      }}
                    />
                  </div>
                  <div className="poke-ev-btn-group">
                    <button
                      type="button"
                      className="poke-step-btn"
                      disabled={tempEVs[row.key] <= 0}
                      onClick={() => handleStepEV(row.key, -1)}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 700 }}>
                      {tempEVs[row.key] || 0}
                    </span>
                    <button
                      type="button"
                      className="poke-step-btn"
                      disabled={tempEVs[row.key] >= 10 || tempEVTotal >= EV_TOTAL_LIMIT}
                      onClick={() => handleStepEV(row.key, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleSaveEVs}
                disabled={isSavingEVs}
                style={{
                  width: '100%',
                  marginTop: '14px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isSavingEVs ? 'not-allowed' : 'pointer',
                }}
              >
                {isSavingEVs ? 'Salvando Treino...' : '💾 Salvar Treinamento de Atributos'}
              </button>
            </div>

            {/* SEÇÃO 3: GOLPES */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ffffff' }}>
                ⚔️ 4 Ataques Equipados
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {selectedPokemon.moves.map((mv) => (
                  <div
                    key={mv.id}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                      padding: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px' }}>{mv.name}</strong>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: TYPE_COLORS[mv.type]?.bg || '#fff',
                          color: TYPE_COLORS[mv.type]?.text || '#000',
                          fontWeight: 700,
                        }}
                      >
                        {mv.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {mv.category} • Poder: {mv.power || '—'} • Prec: {mv.accuracy}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 4: ESPLENDOR & FITAS DE CONCURSO */}
            <div style={{ marginTop: '22px', background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#fbbf24' }}>
                  🎀 Esplendor & Fitas do Grand Gala
                </h4>
                <Link
                  to="/pokemon/contest"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Entrar no Palco ➔
                </Link>
              </div>

              {/* Atributos Cênicos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {[
                  { key: 'grace', name: 'Graça', icon: '🌸', color: '#38bdf8' },
                  { key: 'radiance', name: 'Brilho', icon: '☀️', color: '#f59e0b' },
                  { key: 'charm', name: 'Encanto', icon: '💖', color: '#ec4899' },
                  { key: 'enigma', name: 'Mistério', icon: '🔮', color: '#a855f7' },
                  { key: 'spirit', name: 'Vigor', icon: '⚡', color: '#10b981' },
                ].map((cat) => {
                  const val = selectedPokemon.contestStats?.[cat.key] || 10
                  return (
                    <div
                      key={cat.key}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        padding: '6px 4px',
                        textAlign: 'center',
                        border: `1px solid ${cat.color}33`,
                      }}
                    >
                      <div style={{ fontSize: '12px' }}>{cat.icon}</div>
                      <div style={{ fontSize: '10px', color: cat.color, fontWeight: 600 }}>{cat.name}</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{val}</div>
                    </div>
                  )
                })}
              </div>

              {/* Fitas Conquistadas */}
              <div>
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Fitas Oficiais:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {(selectedPokemon.ribbons || []).length === 0 ? (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Nenhuma fita ainda. Participe dos Festivais Pokémon para conquistar!
                    </span>
                  ) : (
                    selectedPokemon.ribbons.map((rib, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.4)',
                          color: '#fef08a',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{rib.icon || '🎀'}</span>
                        <span>{rib.name || rib}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
