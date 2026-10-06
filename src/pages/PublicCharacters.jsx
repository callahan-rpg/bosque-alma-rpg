import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDefaultLocation } from '../hooks/useDefaultLocation'
import { calculateMaxHp, calculateMaxVigor } from '../utils/characterStats'
import CharacterPopupModal from '../components/character/CharacterPopupModal'
import { useAuth } from '../contexts/AuthContext'

export default function PublicCharacters() {
  const navigate = useNavigate()
  const { defaultSlug } = useDefaultLocation()
  const { user, profile } = useAuth()

  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRace, setSelectedRace] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [selectedPopupUser, setSelectedPopupUser] = useState(null)

  // Escuta em tempo real todos os personagens cadastrados
  useEffect(() => {
    setLoading(true)
    const playersCol = collection(db, 'players')

    const unsub = onSnapshot(
      playersCol,
      (snapshot) => {
        const list = []
        snapshot.forEach((docSnap) => {
          list.push({ uid: docSnap.id, ...docSnap.data() })
        })
        setPlayers(list)
        setLoading(false)
      },
      (err) => {
        console.error('[PublicCharacters] Erro ao carregar personagens:', err)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [])

  // Lista de raças únicas existentes
  const availableRaces = Array.from(
    new Set(players.map((p) => p.race || 'Humano').filter(Boolean))
  )

  // Filtragem e ordenação
  const filteredPlayers = players
    .filter((p) => {
      const name = (p.characterName || p.nick || '').toLowerCase()
      const race = (p.race || '').toLowerCase()
      const indiv = (p.individuality?.name || '').toLowerCase()
      const query = searchTerm.toLowerCase().trim()

      const matchesSearch = !query || name.includes(query) || race.includes(query) || indiv.includes(query)
      const matchesRace = selectedRace === 'all' || (p.race || 'Humano').toLowerCase() === selectedRace.toLowerCase()

      return matchesSearch && matchesRace
    })
    .sort((a, b) => {
      const vitA = a.attributes?.vitalidade ?? 10
      const vitB = b.attributes?.vitalidade ?? 10
      const hpA = calculateMaxHp(vitA)
      const hpB = calculateMaxHp(vitB)
      const nameA = (a.characterName || a.nick || 'Viajante').toLowerCase()
      const nameB = (b.characterName || b.nick || 'Viajante').toLowerCase()
      const lvlA = a.level ?? 1
      const lvlB = b.level ?? 1

      if (sortBy === 'name') return nameA.localeCompare(nameB)
      if (sortBy === 'level_desc') return lvlB - lvlA
      if (sortBy === 'hp_desc') return hpB - hpA
      return 0
    })

  return (
    <div className="public-chars-page-wrapper">
      {/* Barra de Topo */}
      <header className="public-chars-topbar">
        <div className="public-chars-topbar-left">
          <button
            type="button"
            className="public-chars-back-btn"
            onClick={() => navigate(`/location/${defaultSlug}`)}
            title="Voltar para o Bosque"
          >
            ← Retornar ao Bosque
          </button>
          <div className="public-chars-title-wrap">
            <h1 className="public-chars-title">HABITANTES DO BOSQUE</h1>
            <span className="public-chars-subtitle">
              Galeria pública de aventureiros e habitantes registrados
            </span>
          </div>
        </div>

        <div className="public-chars-topbar-right">
          <span className="public-chars-count-badge">
            👥 <strong>{players.length}</strong> {players.length === 1 ? 'Viajante Registrado' : 'Viajantes Registrados'}
          </span>
        </div>
      </header>

      {/* Área de Filtros e Busca */}
      <section className="public-chars-controls-bar">
        <div className="public-chars-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="public-chars-search-input"
            placeholder="Buscar por nome, raça ou individualidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="public-chars-clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="public-chars-filters-wrap">
          <div className="filter-item">
            <label htmlFor="race-filter">Raça:</label>
            <select
              id="race-filter"
              value={selectedRace}
              onChange={(e) => setSelectedRace(e.target.value)}
              className="public-chars-select"
            >
              <option value="all">Todas as Raças</option>
              {availableRaces.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="sort-filter">Ordenar:</label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="public-chars-select"
            >
              <option value="name">Nome (A - Z)</option>
              <option value="level_desc">Maior Nível</option>
              <option value="hp_desc">Maior Vida (HP)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Grid Principal de Cards de Personagens */}
      <main className="public-chars-main-content">
        {loading ? (
          <div className="public-chars-loading">
            <span className="public-chars-rune-spin">⬡</span>
            <span>Consultando os pergaminhos dos viajantes...</span>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="public-chars-empty-state">
            <span className="empty-icon">🕯️</span>
            <h3>Nenhum habitante encontrado</h3>
            <p>
              {searchTerm || selectedRace !== 'all'
                ? 'Nenhum viajante corresponde aos filtros selecionados.'
                : 'Ainda não há personagens registrados no bosque.'}
            </p>
          </div>
        ) : (
          <div className="public-chars-grid">
            {filteredPlayers.map((p) => {
              const name = p.characterName || p.nick || 'Viajante Sem Nome'
              const race = p.race || 'Humano'
              const level = p.level || 1
              const avatarUrl = p.avatarUrl || ''
              const isSelf = user?.uid && p.uid === user.uid

              const attributes = {
                forca: p.attributes?.forca ?? 10,
                destreza: p.attributes?.destreza ?? 10,
                poder: p.attributes?.poder ?? 10,
                sabedoria: p.attributes?.sabedoria ?? 10,
                vitalidade: p.attributes?.vitalidade ?? 10,
              }

              const hpMax = calculateMaxHp(attributes.vitalidade)
              const vigorMax = calculateMaxVigor(attributes.vitalidade)
              const hpCurrent = Math.min(hpMax, p.hpCurrent ?? hpMax)
              const vigorCurrent = Math.min(
                vigorMax,
                p.vigorCurrent ?? p.almaCurrent ?? vigorMax
              )

              const hpPercent = Math.min(
                100,
                Math.max(0, Math.round((hpCurrent / Math.max(1, hpMax)) * 100))
              )
              const vigorPercent = Math.min(
                100,
                Math.max(0, Math.round((vigorCurrent / Math.max(1, vigorMax)) * 100))
              )

              const individualityName = p.individuality?.name || ''

              return (
                <div key={p.uid} className={`public-char-card ${isSelf ? 'is-self-card' : ''}`}>
                  {/* Banner / Cabeçalho do Card */}
                  <div className="public-char-card-header">
                    <div className="public-char-avatar-box">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          className="public-char-avatar-img"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex'
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="public-char-avatar-fallback"
                        style={{ display: avatarUrl ? 'none' : 'flex' }}
                      >
                        👤
                      </div>
                      <span className="public-char-card-level">Nv. {level}</span>
                    </div>

                    <div className="public-char-header-info">
                      <div className="public-char-title-row">
                        <h3 className="public-char-name">{name}</h3>
                        {isSelf && <span className="public-char-self-tag">Você</span>}
                      </div>
                      <div className="public-char-badge-row">
                        <span className="public-char-race-tag">{race}</span>
                        {(p.role === 'admin' || p.role === 'master') && (
                          <span className="public-char-master-tag">🔮 Mestre</span>
                        )}
                      </div>
                      {individualityName && (
                        <span className="public-char-indiv-pill" title="Individualidade">
                          ✨ {individualityName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barras de Vida e Vigor */}
                  <div className="public-char-bars-container">
                    <div className="public-char-bar-row">
                      <div className="bar-labels">
                        <span><span className="icon">❤️</span> HP</span>
                        <span>{hpCurrent} / {hpMax}</span>
                      </div>
                      <div className="bar-track hp">
                        <div className="bar-fill hp" style={{ width: `${hpPercent}%` }} />
                      </div>
                    </div>

                    <div className="public-char-bar-row">
                      <div className="bar-labels">
                        <span><span className="icon">⚡</span> Vigor</span>
                        <span>{vigorCurrent} / {vigorMax}</span>
                      </div>
                      <div className="bar-track vigor">
                        <div className="bar-fill vigor" style={{ width: `${vigorPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Atributos Resumidos */}
                  <div className="public-char-attrs-row">
                    <div className="attr-pill" title="Força">
                      <span className="attr-name">FOR</span>
                      <span className="attr-val">{attributes.forca}</span>
                    </div>
                    <div className="attr-pill" title="Destreza">
                      <span className="attr-name">DES</span>
                      <span className="attr-val">{attributes.destreza}</span>
                    </div>
                    <div className="attr-pill" title="Poder">
                      <span className="attr-name">POD</span>
                      <span className="attr-val">{attributes.poder}</span>
                    </div>
                    <div className="attr-pill" title="Sabedoria">
                      <span className="attr-name">SAB</span>
                      <span className="attr-val">{attributes.sabedoria}</span>
                    </div>
                    <div className="attr-pill" title="Vitalidade">
                      <span className="attr-name">VIT</span>
                      <span className="attr-val">{attributes.vitalidade}</span>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="public-char-card-actions">
                    <button
                      type="button"
                      className="public-char-btn popup"
                      onClick={() => setSelectedPopupUser(p)}
                      title="Abrir popup flutuante de status"
                    >
                      🔍 Status
                    </button>

                    <button
                      type="button"
                      className="public-char-btn sheet"
                      onClick={() => {
                        const targetUrl = isSelf ? '/personagem' : `/personagem/${p.uid}`
                        window.open(targetUrl, '_blank', 'noopener,noreferrer')
                      }}
                      title="Abrir ficha completa em nova guia"
                    >
                      📜 Ficha ↗
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Popup Flutuante do Personagem quando selecionado */}
      {selectedPopupUser && (
        <CharacterPopupModal
          targetUser={selectedPopupUser}
          currentUser={user}
          currentChar={profile}
          onClose={() => setSelectedPopupUser(null)}
        />
      )}
    </div>
  )
}
