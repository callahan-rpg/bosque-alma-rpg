import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { subscribeAllCyberpunkCharacters } from '../../firebase/cyberpunkService'
import '../../styles/cyberpunk.css'

export default function CyberpunkPublicCharacters() {
  const navigate = useNavigate()
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const unsub = subscribeAllCyberpunkCharacters((list) => {
      setCharacters(list)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = characters.filter((c) => {
    const name = (c.name || c.handle || '').toLowerCase()
    const faction = (c.faction || '').toLowerCase()
    const race = (c.race || '').toLowerCase()
    const homeworld = (c.homeworld || '').toLowerCase()
    const query = searchTerm.toLowerCase().trim()
    return !query || name.includes(query) || faction.includes(query) || race.includes(query) || homeworld.includes(query)
  })

  return (
    <div className="cb-cyber-root">
      <header className="cb-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="cb-btn cb-btn-ghost"
            style={{ padding: '8px 14px', fontSize: '12px' }}
            onClick={() => navigate('/cyberpunk')}
            title="Voltar à Sentinela 1"
          >
            ← Voltar à Sentinela 1
          </button>

          <div>
            <span className="cb-header-tag">REDE DE FIXERS • DIRETÓRIO DE MERCENÁRIOS & VIAJANTES</span>
            <h1 className="cb-header-title">
              HABITANTES DA <span className="cb-neon-text">SENTINELA 1</span>
            </h1>
          </div>
        </div>

        <div className="cb-header-actions">
          <button
            type="button"
            className="cb-btn cb-btn-yellow"
            onClick={() => navigate('/cyberpunk/personagem')}
          >
            👤 Minha Ficha Cyberpunk
          </button>
          <button
            type="button"
            className="cb-btn"
            onClick={() => navigate('/cyberpunk')}
          >
            🪐 Explorar Sentinela 1
          </button>
        </div>
      </header>

      <main className="cb-container">
        {/* FILTROS E BUSCA */}
        <div className="cb-card" style={{ marginBottom: '24px', padding: '16px' }}>
          <input
            type="text"
            className="cb-input"
            placeholder="Buscar por nome, raça, planeta natal ou afiliação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* LISTAGEM DE PERSONAGENS */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cb-cyan)' }}>
            Consultando banco de dados biométrico...
          </div>
        ) : filtered.length === 0 ? (
          <div className="cb-card" style={{ textAlign: 'center', padding: '40px' }}>
            <h3>Nenhum mercenário encontrado com esses filtros.</h3>
          </div>
        ) : (
          <div className="cb-grid-3">
            {filtered.map((char) => {
              const charName = char.name || char.handle || 'Sem Nome'
              return (
                <div key={char.uid} className="cb-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                    {char.avatarUrl ? (
                      <img
                        src={char.avatarUrl}
                        alt=""
                        style={{ width: '64px', height: '64px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--cb-cyan)' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          background: 'rgba(0, 240, 255, 0.1)',
                          border: '1px solid var(--cb-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px'
                        }}
                      >
                        👤
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {char.race && (
                          <span className="cb-threat-badge" style={{ fontSize: '10px', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--cb-cyan)', borderColor: 'var(--cb-cyan)' }}>
                            🧬 {char.race}
                          </span>
                        )}
                        {char.homeworld && (
                          <span className="cb-threat-badge" style={{ fontSize: '10px', background: 'rgba(254, 231, 92, 0.1)', color: 'var(--cb-yellow)', borderColor: 'var(--cb-yellow)' }}>
                            🪐 {char.homeworld}
                          </span>
                        )}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {charName}
                      </h3>
                      <div style={{ fontSize: '11px', color: 'var(--cb-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {char.faction || 'Mercenário Autônomo'}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--cb-text-dim)', lineHeight: 1.4, minHeight: '34px', margin: '0 0 14px' }}>
                    {char.bio ? (char.bio.slice(0, 90) + '...') : 'Sem biografia disponível.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--cb-border-dim)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--cb-yellow)', fontFamily: 'var(--cb-font-mono)' }}>
                      Cred: Nível {char.streetCred || 1}
                    </span>

                    <Link
                      to={`/cyberpunk/personagem/${char.uid}`}
                      className="cb-btn cb-btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                    >
                      Ver Ficha ➔
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
