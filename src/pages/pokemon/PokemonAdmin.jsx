import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllSpecies } from '../../data/pokemonSpecies'
import { POKEMON_MOVES } from '../../data/pokemonMoves'
import { TYPE_COLORS, TYPE_CHART, getTypeEffectiveness } from '../../data/pokemonTypes'
import {
  generateIVs,
  createEmptyEVs,
  validateEVs,
  calculateAllStats,
  resolveTurnOrder,
  calculateDamage,
  createPokemonInstance,
  EV_TOTAL_LIMIT,
} from '../../utils/pokemonEngine'
import '../../styles/pokemon-admin.css'

export default function PokemonAdmin() {
  const [activeTab, setActiveTab] = useState('species') // 'species' | 'simulator' | 'types'
  const speciesList = getAllSpecies()

  // Estado do Simulador de Combate
  const [pokeA, setPokeA] = useState(() =>
    createPokemonInstance('cospe_lava', { level: 10, nickname: 'Cospe-Lava Alpha' })
  )
  const [pokeB, setPokeB] = useState(() =>
    createPokemonInstance('hidrolontra', { level: 10, nickname: 'Hidrolontra Beta' })
  )
  const [selectedMoveA, setSelectedMoveA] = useState('lanca_lava')
  const [selectedMoveB, setSelectedMoveB] = useState('aqua_cauda')
  const [battleLogs, setBattleLogs] = useState([
    'Simulador pronto. Configure os IVs (1-10) e EVs (máx 30) e teste a ordem e o cálculo de dano.',
  ])

  // Reroll de IVs
  const handleRerollIVs = (target) => {
    if (target === 'A') {
      const newIvs = generateIVs()
      const newStats = calculateAllStats(pokeA.species, newIvs, pokeA.evs, pokeA.level)
      setPokeA((prev) => ({ ...prev, ivs: newIvs, stats: newStats, currentHp: newStats.maxHp }))
    } else {
      const newIvs = generateIVs()
      const newStats = calculateAllStats(pokeB.species, newIvs, pokeB.evs, pokeB.level)
      setPokeB((prev) => ({ ...prev, ivs: newIvs, stats: newStats, currentHp: newStats.maxHp }))
    }
  }

  // Ajuste de EV respeitando o teto de 30 pontos
  const handleEVChange = (target, statKey, value) => {
    const num = Math.max(0, Math.min(10, parseInt(value, 10) || 0))
    const current = target === 'A' ? pokeA : pokeB
    const nextEvs = { ...current.evs, [statKey]: num }
    const validation = validateEVs(nextEvs)

    if (!validation.valid) {
      alert(validation.error)
      return
    }

    const nextStats = calculateAllStats(current.species, current.ivs, nextEvs, current.level)
    if (target === 'A') {
      setPokeA((prev) => ({ ...prev, evs: nextEvs, stats: nextStats, currentHp: nextStats.maxHp }))
    } else {
      setPokeB((prev) => ({ ...prev, evs: nextEvs, stats: nextStats, currentHp: nextStats.maxHp }))
    }
  }

  // Executa rodada de teste no simulador
  const handleRunSimRound = () => {
    const first = resolveTurnOrder(pokeA, pokeB)
    const logs = []

    const firstPoke = first === 'A' ? pokeA : pokeB
    const secondPoke = first === 'A' ? pokeB : pokeA
    const firstMoveId = first === 'A' ? selectedMoveA : selectedMoveB
    const secondMoveId = first === 'A' ? selectedMoveB : selectedMoveA

    logs.push(`⚡ ORDEM DE VELOCIDADE:`)
    logs.push(
      `   ${pokeA.nickname}: Vel Final ${pokeA.stats.speed} (Base ${pokeA.species.baseStats.speed})`
    )
    logs.push(
      `   ${pokeB.nickname}: Vel Final ${pokeB.stats.speed} (Base ${pokeB.species.baseStats.speed})`
    )
    logs.push(`   ➔ ${firstPoke.nickname} foi mais rápido e ataca primeiro!`)

    // Ataque 1
    const move1 = POKEMON_MOVES[firstMoveId]
    const dmg1 = calculateDamage(firstPoke, secondPoke, move1)
    if (dmg1.isMiss) {
      logs.push(`⚔️ ${firstPoke.nickname} usou ${move1.name}, mas ERROU o golpe!`)
    } else {
      logs.push(
        `⚔️ ${firstPoke.nickname} usou ${move1.name}! Causou ${dmg1.damage} de dano! ${
          dmg1.isCrit ? '💥 ACERTO CRÍTICO!' : ''
        } ${dmg1.effectivenessMessage ? `(${dmg1.effectivenessMessage})` : ''}`
      )
    }

    // Ataque 2
    const move2 = POKEMON_MOVES[secondMoveId]
    const dmg2 = calculateDamage(secondPoke, firstPoke, move2)
    if (dmg2.isMiss) {
      logs.push(`⚔️ ${secondPoke.nickname} usou ${move2.name}, mas ERROU o golpe!`)
    } else {
      logs.push(
        `⚔️ ${secondPoke.nickname} usou ${move2.name}! Causou ${dmg2.damage} de dano! ${
          dmg2.isCrit ? '💥 ACERTO CRÍTICO!' : ''
        } ${dmg2.effectivenessMessage ? `(${dmg2.effectivenessMessage})` : ''}`
      )
    }

    setBattleLogs(logs)
  }

  const evTotalA = Object.values(pokeA.evs).reduce((a, b) => a + b, 0)
  const evTotalB = Object.values(pokeB.evs).reduce((a, b) => a + b, 0)

  return (
    <div className="poke-admin-container">
      {/* CABEÇALHO */}
      <header className="poke-admin-header">
        <div className="poke-admin-title-group">
          <div className="poke-ball-logo" />
          <div>
            <h1 className="poke-admin-h1">Laboratório de Pesquisa Pokémon</h1>
            <div className="poke-admin-subtitle">
              Painel de Administração de Criaturas, Atributos e Batalha
            </div>
          </div>
        </div>

        <div className="poke-nav-links">
          <Link to="/mundos" className="poke-btn-pill">
            <span>🌐</span>
            <span>Seletor de Mundos</span>
          </Link>
          <Link to="/location/jardim-do-crepusculo" className="poke-btn-pill">
            <span>🌿</span>
            <span>Jardim (RPG)</span>
          </Link>
        </div>
      </header>

      {/* ABAS */}
      <nav className="poke-admin-tabs">
        <button
          type="button"
          className={`poke-tab-btn ${activeTab === 'species' ? 'active' : ''}`}
          onClick={() => setActiveTab('species')}
        >
          📖 Catálogo de Espécies ({speciesList.length})
        </button>
        <button
          type="button"
          className={`poke-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          ⚡ Simulador de Atributos & Batalha
        </button>
        <button
          type="button"
          className={`poke-tab-btn ${activeTab === 'types' ? 'active' : ''}`}
          onClick={() => setActiveTab('types')}
        >
          🛡️ Tabela de Fraquezas (Gen 1)
        </button>
      </nav>

      {/* CONTEÚDO */}
      <main className="poke-admin-content">
        {/* ABA 1: CATÁLOGO DE ESPÉCIES */}
        {activeTab === 'species' && (
          <div>
            <div style={{ marginBottom: '18px', color: '#94a3b8', fontSize: '14px' }}>
              Criaturas registradas para este universo. As imagens possuem slots vazios reservados
              para quando você fizer o upload da arte oficial.
            </div>

            <div className="poke-species-grid">
              {speciesList.map((sp) => {
                const typeStyle = TYPE_COLORS[sp.types[0]] || TYPE_COLORS.Normal
                return (
                  <div key={sp.id} className="poke-species-card">
                    <div className="poke-card-top">
                      <span className="poke-dex-pill">
                        #{String(sp.dexNumber).padStart(3, '0')} • {sp.classification}
                      </span>
                      <span
                        className="poke-type-badge"
                        style={{ background: typeStyle.bg, color: typeStyle.text }}
                      >
                        {sp.types.join(' / ')}
                      </span>
                    </div>

                    {/* Slot de Imagem / Placeholder */}
                    <div className="poke-card-art-slot">
                      {sp.image ? (
                        <img
                          src={sp.image}
                          alt={sp.name}
                          style={{ maxHeight: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div className="poke-art-placeholder">
                          <span className="poke-placeholder-icon">{sp.icon}</span>
                          <span>Slot de Imagem Pronto</span>
                          <span style={{ fontSize: '11px', opacity: 0.6 }}>
                            ({sp.name} - Arte a ser adicionada)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="poke-card-body">
                      <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#fff' }}>
                        {sp.name}
                      </h2>
                      <p className="poke-desc">{sp.description}</p>

                      {/* Base Stats */}
                      <div style={{ marginBottom: '14px' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            color: '#64748b',
                            marginBottom: '8px',
                          }}
                        >
                          Atributos Base (Valores Naturais)
                        </div>

                        {[
                          { key: 'hp', name: 'HP', max: 100, color: '#10b981' },
                          { key: 'attack', name: 'Ataque', max: 100, color: '#f59e0b' },
                          { key: 'defense', name: 'Defesa', max: 100, color: '#3b82f6' },
                          { key: 'spAttack', name: 'Atq. Esp.', max: 100, color: '#ec4899' },
                          { key: 'spDefense', name: 'Def. Esp.', max: 100, color: '#8b5cf6' },
                          { key: 'speed', name: 'Velocidade', max: 100, color: '#eab308' },
                        ].map((stat) => {
                          const val = sp.baseStats[stat.key]
                          return (
                            <div key={stat.key} className="poke-stat-row">
                              <span className="poke-stat-name">{stat.name}</span>
                              <span className="poke-stat-num">{val}</span>
                              <div className="poke-stat-track">
                                <div
                                  className="poke-stat-bar"
                                  style={{
                                    width: `${Math.min(100, (val / stat.max) * 100)}%`,
                                    background: stat.color,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* 4 Golpes Iniciais */}
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            color: '#64748b',
                            marginBottom: '8px',
                          }}
                        >
                          4 Ataques Iniciais
                        </div>
                        <div className="poke-moves-list">
                          {sp.defaultMoves.map((mId) => {
                            const mv = POKEMON_MOVES[mId]
                            if (!mv) return null
                            return (
                              <div key={mId} className="poke-move-item">
                                <span className="poke-move-name">{mv.name}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: TYPE_COLORS[mv.type]?.bg || '#fff',
                                    }}
                                  >
                                    {mv.type}
                                  </span>
                                  <span className="poke-move-cat">{mv.category}</span>
                                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                    {mv.power ? `Pwr ${mv.power}` : 'Status'}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ABA 2: SIMULADOR DE ATRIBUTOS & COMBATE */}
        {activeTab === 'simulator' && (
          <div className="poke-sim-panel">
            {/* Treinador A */}
            <div className="poke-sim-box">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h3 style={{ margin: 0 }}>🔥 {pokeA.nickname} (Nível {pokeA.level})</h3>
                <button
                  type="button"
                  onClick={() => handleRerollIVs('A')}
                  className="poke-btn-pill"
                  title="Gera novos IVs de 1 a 10"
                >
                  🎲 Rolar IVs
                </button>
              </div>

              {/* Medidor de EVs */}
              <div className="poke-ev-meter">
                <div className="poke-ev-meter-header">
                  <span>Pontos de Treino (EVs)</span>
                  <span style={{ color: evTotalA === EV_TOTAL_LIMIT ? '#ef4444' : '#10b981' }}>
                    {evTotalA} / {EV_TOTAL_LIMIT} pts
                  </span>
                </div>
                <div className="poke-ev-track">
                  <div
                    className="poke-ev-fill"
                    style={{ width: `${(evTotalA / EV_TOTAL_LIMIT) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tabela de Atributos: Base + IV (1-10) + EV (0-10) = Final */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  className="poke-input-row"
                  style={{ fontWeight: 700, color: '#64748b', fontSize: '11px' }}
                >
                  <span>Atributo</span>
                  <span>IV (1 a 10)</span>
                  <span>EV (Treino 0-10)</span>
                </div>

                {[
                  { key: 'hp', name: 'HP', stat: pokeA.stats.hp, max: pokeA.stats.maxHp },
                  { key: 'attack', name: 'Ataque', stat: pokeA.stats.attack },
                  { key: 'defense', name: 'Defesa', stat: pokeA.stats.defense },
                  { key: 'spAttack', name: 'Atq. Esp.', stat: pokeA.stats.spAttack },
                  { key: 'spDefense', name: 'Def. Esp.', stat: pokeA.stats.spDefense },
                  { key: 'speed', name: 'Velocidade', stat: pokeA.stats.speed },
                ].map((row) => (
                  <div key={row.key} className="poke-input-row">
                    <div>
                      <span style={{ fontWeight: 600 }}>{row.name}: </span>
                      <strong style={{ color: '#38bdf8' }}>{row.stat}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        IV {pokeA.ivs[row.key]}
                      </span>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={pokeA.evs[row.key]}
                        onChange={(e) => handleEVChange('A', row.key, e.target.value)}
                        style={{
                          width: '50px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.4)',
                          color: '#fff',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Escolha do Golpe */}
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Golpe a desferir:
                </label>
                <select
                  value={selectedMoveA}
                  onChange={(e) => setSelectedMoveA(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {pokeA.moves.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type} • {m.category} • Pwr {m.power || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Treinador B */}
            <div className="poke-sim-box">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h3 style={{ margin: 0 }}>💧 {pokeB.nickname} (Nível {pokeB.level})</h3>
                <button
                  type="button"
                  onClick={() => handleRerollIVs('B')}
                  className="poke-btn-pill"
                  title="Gera novos IVs de 1 a 10"
                >
                  🎲 Rolar IVs
                </button>
              </div>

              {/* Medidor de EVs */}
              <div className="poke-ev-meter">
                <div className="poke-ev-meter-header">
                  <span>Pontos de Treino (EVs)</span>
                  <span style={{ color: evTotalB === EV_TOTAL_LIMIT ? '#ef4444' : '#10b981' }}>
                    {evTotalB} / {EV_TOTAL_LIMIT} pts
                  </span>
                </div>
                <div className="poke-ev-track">
                  <div
                    className="poke-ev-fill"
                    style={{ width: `${(evTotalB / EV_TOTAL_LIMIT) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tabela de Atributos */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  className="poke-input-row"
                  style={{ fontWeight: 700, color: '#64748b', fontSize: '11px' }}
                >
                  <span>Atributo</span>
                  <span>IV (1 a 10)</span>
                  <span>EV (Treino 0-10)</span>
                </div>

                {[
                  { key: 'hp', name: 'HP', stat: pokeB.stats.hp, max: pokeB.stats.maxHp },
                  { key: 'attack', name: 'Ataque', stat: pokeB.stats.attack },
                  { key: 'defense', name: 'Defesa', stat: pokeB.stats.defense },
                  { key: 'spAttack', name: 'Atq. Esp.', stat: pokeB.stats.spAttack },
                  { key: 'spDefense', name: 'Def. Esp.', stat: pokeB.stats.spDefense },
                  { key: 'speed', name: 'Velocidade', stat: pokeB.stats.speed },
                ].map((row) => (
                  <div key={row.key} className="poke-input-row">
                    <div>
                      <span style={{ fontWeight: 600 }}>{row.name}: </span>
                      <strong style={{ color: '#38bdf8' }}>{row.stat}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        IV {pokeB.ivs[row.key]}
                      </span>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={pokeB.evs[row.key]}
                        onChange={(e) => handleEVChange('B', row.key, e.target.value)}
                        style={{
                          width: '50px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.4)',
                          color: '#fff',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Escolha do Golpe */}
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Golpe a desferir:
                </label>
                <select
                  value={selectedMoveB}
                  onChange={(e) => setSelectedMoveB(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {pokeB.moves.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type} • {m.category} • Pwr {m.power || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Disparador da Batalha (Ocupa as 2 colunas) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="button" className="poke-sim-btn" onClick={handleRunSimRound}>
                ⚔️ Executar Rodada no Simulador (Testar Velocidade e Dano)
              </button>

              <div className="poke-log-box">
                {battleLogs.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: TABELA DE TIPOS */}
        {activeTab === 'types' && (
          <div className="poke-sim-box">
            <h3 style={{ margin: '0 0 14px 0' }}>Matriz de Eficácia Elemental (1ª Geração)</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
              Mostra os multiplicadores de dano quando um tipo ataca outro:
              <br />
              <strong style={{ color: '#10b981' }}>x2.0</strong> = Super Efetivo |{' '}
              <strong style={{ color: '#f59e0b' }}>x0.5</strong> = Pouco Efetivo |{' '}
              <strong style={{ color: '#ef4444' }}>x0</strong> = Imune
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.keys(TYPE_CHART).map((atkType) => {
                const matchups = TYPE_CHART[atkType]
                return (
                  <div
                    key={atkType}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: TYPE_COLORS[atkType]?.bg || '#fff',
                        color: TYPE_COLORS[atkType]?.text || '#000',
                        fontWeight: 700,
                        fontSize: '12px',
                        minWidth: '70px',
                        textAlign: 'center',
                      }}
                    >
                      {atkType}
                    </span>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                      {Object.entries(matchups).map(([defType, mult]) => (
                        <span
                          key={defType}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background:
                              mult === 2
                                ? 'rgba(16, 185, 129, 0.2)'
                                : mult === 0.5
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            color: mult === 2 ? '#34d399' : mult === 0.5 ? '#fbbf24' : '#f87171',
                            fontWeight: 600,
                          }}
                        >
                          vs {defType}: x{mult}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
