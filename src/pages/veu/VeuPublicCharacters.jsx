import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  subscribeAllVeuCharacters,
  VEU_LINEAGES,
  calculateModifier
} from '../../firebase/veuService'
import '../../styles/veu.css'

export default function VeuPublicCharacters() {
  const navigate = useNavigate()
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLineage, setSelectedLineage] = useState('ALL')

  useEffect(() => {
    const unsub = subscribeAllVeuCharacters((list) => {
      setCharacters(list)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = characters.filter((c) => {
    const name = (c.name || '').toLowerCase()
    const lineage = (c.lineage || '').toLowerCase()
    const occupation = (c.occupation || '').toLowerCase()
    const coven = (c.coven || '').toLowerCase()
    const origin = (c.origin || '').toLowerCase()
    const query = searchTerm.toLowerCase().trim()

    const matchesQuery = !query ||
      name.includes(query) ||
      lineage.includes(query) ||
      occupation.includes(query) ||
      coven.includes(query) ||
      origin.includes(query)

    const matchesLineage = selectedLineage === 'ALL' || c.lineage === selectedLineage

    return matchesQuery && matchesLineage
  })

  return (
    <div className="vsheet-page">
      {/* ── IMAGEM DE FUNDO SUTIL GÓTICA ── */}
      <div className="vsheet-bg-layer" />
      <div className="vsheet-bg-overlay" />

      {/* ── CONTAINER PRINCIPAL CENTRALIZADO (1220px) ── */}
      <div className="vsheet-container">

        {/* ── BARRA DE TOPO INTEGRADA ── */}
        <div className="vsheet-topbar-strip">
          <div className="vsheet-topbar-left">
            <button
              type="button"
              className="vsheet-nav-action-btn"
              onClick={() => navigate('/veu')}
              title="Voltar a Riverview"
            >
              <span className="vsheet-btn-icon">←</span>
              <span>Voltar a Riverview</span>
            </button>
          </div>

          <div className="vsheet-topbar-center">
            <div className="vsheet-universe-badge">
              <span className="vsheet-universe-gem">✦</span>
              <span>Códice de Habitantes • Riverview</span>
              <span className="vsheet-universe-gem">✦</span>
            </div>
          </div>

          <div className="vsheet-topbar-right">
            <button
              type="button"
              className="vsheet-edit-trigger-btn"
              onClick={() => navigate('/veu/personagem')}
              title="Acessar minha ficha de personagem"
            >
              <span className="btn-sparkle">✦</span>
              <span className="btn-icon">👤</span>
              <span className="btn-text">Minha Ficha</span>
            </button>
          </div>
        </div>

        {/* ── HERO BANNER COM BUSCA E FILTROS ── */}
        <div className="vsheet-codex-hero">
          <div className="vsheet-codex-title-row">
            <div>
              <h1 className="vsheet-codex-hero-title">
                <span>Códice de Habitantes & Entidades • Riverview</span>
                <span style={{ color: 'var(--veu-gold)', fontSize: '0.8em' }}>✦</span>
              </h1>
              <p className="vsheet-codex-hero-sub">
                Registros de vampiros, lobisomens, bruxos, humanos e demais raças que habitam as ruas e segredos de Riverview.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c5a059', fontFamily: 'var(--veu-font-title)', fontSize: '0.82rem' }}>
              <span>Total registrado:</span>
              <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{characters.length}</strong>
            </div>
          </div>

          {/* Campo de Busca Gótico */}
          <div className="vsheet-codex-search-wrap">
            <span className="vsheet-codex-search-icon">🔍</span>
            <input
              type="text"
              className="vsheet-codex-search-input"
              placeholder="Buscar por nome, ocupação, linhagem ou residência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Chips de Filtragem de Linhagens */}
          <div className="vsheet-codex-chips">
            <button
              type="button"
              className={`vsheet-codex-chip ${selectedLineage === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedLineage('ALL')}
            >
              <span>Todas</span>
              <span className="vsheet-codex-chip-count">({characters.length})</span>
            </button>

            {VEU_LINEAGES.map((lin) => {
              const count = characters.filter(c => c.lineage === lin.name).length
              return (
                <button
                  key={lin.id}
                  type="button"
                  className={`vsheet-codex-chip ${selectedLineage === lin.name ? 'active' : ''}`}
                  onClick={() => setSelectedLineage(lin.name)}
                >
                  <span>{lin.icon}</span>
                  <span>{lin.name}</span>
                  <span className="vsheet-codex-chip-count">({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── LISTAGEM DE CARDS ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--veu-gold)' }}>
            <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>🕯️</div>
            <p style={{ marginTop: '14px', fontFamily: 'var(--veu-font-title)', letterSpacing: '0.1em' }}>
              Folheando os Pergaminhos do Códice Sombrio...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="vsheet-box" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', opacity: 0.6, marginBottom: '10px' }}>⚰️</div>
            <h3 style={{ margin: '0 0 6px', color: '#fca5a5', fontFamily: 'var(--veu-font-title)' }}>
              Nenhuma Criatura Encontrada
            </h3>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>
              Nenhum habitante do Véu Sombrio corresponde aos critérios de busca selecionados.
            </p>
          </div>
        ) : (
          <div className="vsheet-codex-grid">
            {filtered.map((char) => {
              const linObj = VEU_LINEAGES.find(l => l.name === char.lineage) || { icon: '🩸' }
              const attrs = char.attributes || {}
              const forca = attrs.forca ?? 10
              const destreza = attrs.destreza ?? 10
              const poder = attrs.poder ?? 10
              const sabedoria = attrs.sabedoria ?? 10
              const constituicao = attrs.constituicao ?? attrs.vitalidade ?? 10
              const carisma = attrs.carisma ?? 10

              const hpCurrent = Number(char.hpCurrent ?? char.hpMax ?? 70)
              const hpMax = Number(char.hpMax ?? 70)
              const hpPct = Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)).toFixed(0)

              const manaCurrent = Number(char.manaCurrent ?? char.manaMax ?? 40)
              const manaMax = Number(char.manaMax ?? 40)
              const manaPct = Math.max(0, Math.min(100, (manaCurrent / manaMax) * 100)).toFixed(0)

              return (
                <div key={char.uid} className="vsheet-codex-card">
                  
                  {/* Cabeçalho do Card */}
                  <div className="vsheet-codex-card-head">
                    <div className="vsheet-codex-card-avatar">
                      {char.avatarUrl ? (
                        <img
                          src={char.avatarUrl}
                          alt={char.name}
                          onError={(e) => { e.currentTarget.src = '/assets/veu/ester-exposito.jpg' }}
                        />
                      ) : (
                        <span style={{ fontSize: '2.4rem' }}>{linObj.icon}</span>
                      )}
                    </div>

                    <div className="vsheet-codex-card-info">
                      <h3 className="vsheet-codex-card-name" title={char.name}>
                        {char.name || 'Sem Nome'}
                        <span>✦</span>
                      </h3>
                      <div className="vsheet-codex-card-sub">
                        {[char.occupation, char.lineage, char.age].filter(Boolean).join(' • ') || 'Habitante do Véu'}
                      </div>
                      <div className="vsheet-codex-card-badges">
                        <span className="vsheet-codex-badge">
                          {linObj.icon} {char.lineage || 'Criatura'}
                        </span>
                        {char.residence && (
                          <span className="vsheet-codex-badge">
                            🏠 {char.residence}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Citação se houver */}
                  {char.quote && (
                    <p className="vsheet-codex-quote">
                      "{char.quote}"
                    </p>
                  )}

                  {/* Mini-Grid dos 6 Atributos Oficiais com Modificadores */}
                  <div className="vsheet-codex-attrs-row">
                    <div className="vsheet-codex-attr-cell">
                      <span className="vsheet-codex-attr-lbl">FOR</span>
                      <span className="vsheet-codex-attr-num">{forca}</span>
                      <span className="vsheet-codex-attr-mod">{calculateModifier(forca)}</span>
                    </div>
                    <div className="vsheet-codex-attr-cell">
                      <span className="vsheet-codex-attr-lbl">DES</span>
                      <span className="vsheet-codex-attr-num">{destreza}</span>
                      <span className="vsheet-codex-attr-mod">{calculateModifier(destreza)}</span>
                    </div>
                    <div className="vsheet-codex-attr-cell">
                      <span className="vsheet-codex-attr-lbl">POD</span>
                      <span className="vsheet-codex-attr-num">{poder}</span>
                      <span className="vsheet-codex-attr-mod">{calculateModifier(poder)}</span>
                    </div>
                    <div className="vsheet-codex-attr-cell">
                      <span className="vsheet-codex-attr-lbl">SAB</span>
                      <span className="vsheet-codex-attr-num">{sabedoria}</span>
                      <span className="vsheet-codex-attr-mod">{calculateModifier(sabedoria)}</span>
                    </div>
                    <div className="vsheet-codex-attr-cell">
                      <span className="vsheet-codex-attr-lbl">CON</span>
                      <span className="vsheet-codex-attr-num">{constituicao}</span>
                      <span className="vsheet-codex-attr-mod">{calculateModifier(constituicao)}</span>
                    </div>
                    <div className="vsheet-codex-attr-cell">
                      <span className="vsheet-codex-attr-lbl">CAR</span>
                      <span className="vsheet-codex-attr-num">{carisma}</span>
                      <span className="vsheet-codex-attr-mod">{calculateModifier(carisma)}</span>
                    </div>
                  </div>

                  {/* Barras de Status Vitais */}
                  <div className="vsheet-codex-bars-row">
                    <div className="vsheet-codex-bar-wrap">
                      <span className="vsheet-codex-bar-lbl">🩸 Vida</span>
                      <div className="vsheet-bar-track" style={{ height: '8px' }}>
                        <div className="vsheet-bar-fill-life" style={{ width: `${hpPct}%` }} />
                      </div>
                      <span className="vsheet-codex-bar-val">{hpCurrent}/{hpMax}</span>
                    </div>

                    <div className="vsheet-codex-bar-wrap">
                      <span className="vsheet-codex-bar-lbl">🔮 Mana</span>
                      <div className="vsheet-bar-track" style={{ height: '8px' }}>
                        <div className="vsheet-bar-fill-mana" style={{ width: `${manaPct}%` }} />
                      </div>
                      <span className="vsheet-codex-bar-val">{manaCurrent}/{manaMax}</span>
                    </div>
                  </div>

                  {/* Botão Inspecionar Ficha */}
                  <Link
                    to={`/veu/personagem/${char.uid}`}
                    className="vsheet-codex-inspect-btn"
                  >
                    <span>📜</span>
                    <span>Inspecionar Ficha Completa →</span>
                  </Link>

                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
