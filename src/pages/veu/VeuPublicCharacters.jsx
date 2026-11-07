import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { subscribeAllVeuCharacters, VEU_LINEAGES } from '../../firebase/veuService'
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
    const coven = (c.coven || '').toLowerCase()
    const origin = (c.origin || '').toLowerCase()
    const query = searchTerm.toLowerCase().trim()

    const matchesQuery = !query || name.includes(query) || lineage.includes(query) || coven.includes(query) || origin.includes(query)
    const matchesLineage = selectedLineage === 'ALL' || c.lineage === selectedLineage

    return matchesQuery && matchesLineage
  })

  return (
    <div className="veu-sheet-container">
      {/* Header com estilo gótico */}
      <header style={{ maxWidth: '1280px', margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(126, 34, 206, 0.25)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            className="veu-btn veu-btn-ghost"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            onClick={() => navigate('/veu')}
          >
            ← Voltar ao Véu Sombrio
          </button>

          <div>
            <span style={{ fontFamily: 'var(--veu-font-title)', fontSize: '0.72rem', letterSpacing: '0.14em', color: '#f87171', fontWeight: '700' }}>
              CÓDICE DE ALMAS & CRIATURAS DA NOITE
            </span>
            <h1 style={{ margin: '4px 0 0', fontFamily: 'var(--veu-font-title)', fontSize: '1.5rem', color: '#fecaca', letterSpacing: '0.06em' }}>
              HABITANTES DE <span style={{ color: '#ef4444', textShadow: '0 0 16px var(--veu-blood-glow)' }}>O VÉU SOMBRIO</span>
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="veu-btn veu-btn-blood"
            onClick={() => navigate('/veu/personagem')}
          >
            👤 Minha Ficha do Véu
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Barra de Filtros e Busca */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar criatura por nome, linhagem, coven ou origem..."
              className="veu-input"
              style={{ flex: 1, minWidth: '280px', fontSize: '0.88rem', padding: '10px 14px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtros de Linhagens */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`veu-tab-btn ${selectedLineage === 'ALL' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              onClick={() => setSelectedLineage('ALL')}
            >
              Todos ({characters.length})
            </button>
            {VEU_LINEAGES.map((lin) => {
              const count = characters.filter(c => c.lineage === lin.name).length
              return (
                <button
                  key={lin.id}
                  type="button"
                  className={`veu-tab-btn ${selectedLineage === lin.name ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  onClick={() => setSelectedLineage(lin.name)}
                >
                  {lin.icon} {lin.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Listagem */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#cbd5e1' }}>
            <div style={{ fontSize: '2.5rem', animation: 'spin 2s linear infinite' }}>🕯️</div>
            <p style={{ marginTop: '12px' }}>Consultando o Códice Proibido...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="veu-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', opacity: 0.6 }}>⚰️</div>
            <h3 style={{ margin: '14px 0 6px', color: '#fca5a5' }}>Nenhuma criatura encontrada</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Nenhum habitante do Véu corresponde aos critérios de busca selecionados.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {filtered.map((char) => {
              const linObj = VEU_LINEAGES.find(l => l.name === char.lineage) || { icon: '🩸' }
              return (
                <div
                  key={char.uid}
                  className="veu-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--veu-blood)', overflow: 'hidden', flexShrink: 0, background: '#1c1328', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {char.avatarUrl ? (
                        <img src={char.avatarUrl} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.8rem' }}>{linObj.icon}</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', fontSize: '1.05rem', color: '#fecaca', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {char.name || 'Sem Nome'}
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                        {char.origin || 'Origem Desconhecida'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span className="veu-badge lineage" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
                          {linObj.icon} {char.lineage || 'Criatura'}
                        </span>
                        <span className="veu-badge coven" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
                          🏛️ {char.coven || 'Independente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo de Atributos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', background: 'rgba(20, 10, 30, 0.5)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(126, 34, 206, 0.15)', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>FOR</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fca5a5' }}>{char.attributes?.forca ?? 10}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>DES</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fca5a5' }}>{char.attributes?.destreza ?? 10}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>SAB</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fca5a5' }}>{char.attributes?.sabedoria ?? 10}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>POD</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fca5a5' }}>{char.attributes?.poder ?? 10}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>VIT</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fca5a5' }}>{char.attributes?.vitalidade ?? 10}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>CAR</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fca5a5' }}>{char.attributes?.carisma ?? 10}</div>
                    </div>
                  </div>

                  {/* Botão Ver Ficha */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <Link
                      to={`/veu/personagem/${char.uid}`}
                      className="veu-btn veu-btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', textDecoration: 'none' }}
                    >
                      📜 Inspecionar Ficha →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
