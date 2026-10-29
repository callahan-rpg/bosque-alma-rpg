import { useState, useEffect, useRef, useMemo } from 'react'
import { tamagotchiAudio } from '../utils/tamagotchiAudio'
import '../styles/tamagotchi-modal.css'

// Espécies disponíveis no Compêndio / Berçário
const SPECIES_COLLECTION = [
  {
    id: 'slime_azul',
    name: 'Slime Azul',
    family: 'Gelatinoso Arcano',
    element: 'Água',
    icon: '💧',
    desc: 'Um slime translúcido e fofinho nascido das nascentes puras do Bosque de Alma.',
    sprite: '/assets/tamagotchi/slime-azul.gif',
    bonus: '+12 Vida, +3 Força, +2 Defesa'
  },
  {
    id: 'dragaozinho_fafnir',
    name: 'Fafnir',
    family: 'Filhote de Dragão',
    element: 'Fogo',
    icon: '🐲',
    desc: 'Pequeno dragão carmesim que solta pequenas fumaças perfumadas ao bocejar.',
    sprite: 'https://api.iconify.design/game-icons:baby-dragon.svg?color=%23f97316',
    bonus: '+15 Vida, +5 Força, +1 Defesa'
  },
  {
    id: 'lobo_espiritual',
    name: 'Lobo Espiritual',
    family: 'Fera Astral',
    element: 'Luz',
    icon: '🐺',
    desc: 'Filhote espectral leal que brilha sob a luz prateada do luar do Bosque.',
    sprite: 'https://api.iconify.design/game-icons:wolf-head.svg?color=%2338bdf8',
    bonus: '+10 Vida, +4 Força, +3 Esquiva'
  },
  {
    id: 'feneco_feerico',
    name: 'Feneco Feérico',
    family: 'Besta Mística',
    element: 'Natureza',
    icon: '🦊',
    desc: 'Uma raposinha com orelhas pontudas encantadas capaz de farejar ervas raras.',
    sprite: 'https://api.iconify.design/game-icons:fox-head.svg?color=%23fbbf24',
    bonus: '+8 Vida, +5 Agilidade, +5% Coleta'
  }
]

// Benefícios do Vínculo
const BOND_BENEFITS = [
  { level: 1, title: 'Vínculo Inicial', desc: '+5 Pontos de Vida Máxima ao personagem.', icon: '🌱' },
  { level: 2, title: 'Faro Aguçado', desc: '+5% de chance de encontrar ingredientes raros de Culinária e Alquimia.', icon: '🐾' },
  { level: 3, title: 'Companheirismo Sincero', desc: '+10 Pontos de Vida e +2 de Força.', icon: '🤝' },
  { level: 4, title: 'Escudo Protetor', desc: '+2 de Defesa passiva durante os confrontos no Bosque.', icon: '🛡️' },
  { level: 5, title: 'Evolução Juvenil', desc: 'Desbloqueia a forma Jovem do companheiro com nova aparência e bônus dobrados.', icon: '✨' },
  { level: 7, title: 'Harmonia Elemental', desc: '+5 em todos os atributos e bônus de cura diária.', icon: '🌟' },
  { level: 10, title: 'Vínculo Lendário', desc: 'Forma Adulta Ancestral! Concede habilidade especial e bônus massivo.', icon: '👑' }
]

export default function TamagotchiModal({ onClose }) {
  // Aba ativa: 'meu_pet' ou 'colecao'
  const [activeTab, setActiveTab] = useState('meu_pet')
  const [searchQuery, setSearchQuery] = useState('')

  // Estado dos companheiros
  const [pets, setPets] = useState(() => {
    try {
      const saved = localStorage.getItem('jardim_tamagotchi_pets')
      if (saved) return JSON.parse(saved)
    } catch (e) {}

    return [
      {
        id: 'pet_1',
        speciesId: 'slime_azul',
        name: 'Slime Azul',
        subtitle: 'Filhote de Slime',
        gender: 'male',
        level: 3,
        xp: 320,
        maxXp: 600,
        spriteUrl: '/assets/tamagotchi/slime-azul.gif',
        stageIndex: 1, // 0: Ovo, 1: Filhote, 2: Jovem, 3: Adulto
        needs: {
          fome: 82,
          sede: 76,
          felicidade: 78,
          sono: 65
        },
        attributes: {
          vida: 12,
          forca: 3,
          defesa: 2
        },
        lastUpdated: Date.now()
      },
      null, // Espaço Vazio 1
      null  // Espaço Vazio 2
    ]
  })

  // Companheiro atualmente selecionado (índice 0, 1 ou 2)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const currentPet = pets[selectedSlotIndex] || pets[0]

  // Nível de vínculo do jogador
  const [bondState, setBondState] = useState(() => {
    try {
      const saved = localStorage.getItem('jardim_tamagotchi_bond')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return { level: 4, xp: 320, maxXp: 1000 }
  })

  // Histórico de atividades
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('jardim_tamagotchi_history')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return [
      { id: 'h1', icon: '🥣', text: 'Slime Azul comeu e está bem alimentado.', time: 'Há 12 minutos' },
      { id: 'h2', icon: '⚽', text: 'Você brincou com Slime Azul.', time: 'Há 2 horas' },
      { id: 'h3', icon: '🌙', text: 'Slime Azul dormiu confortavelmente.', time: 'Há 5 horas' },
      { id: 'h4', icon: '❤️', text: 'Slime Azul ficou radiante ao receber carinho.', time: 'Há 1 dia' }
    ]
  })

  // Efeitos visuais & Interatividade do Pet
  const [isBouncing, setIsBouncing] = useState(false)
  const [floatingParticles, setFloatingParticles] = useState([])
  const [speechBubble, setSpeechBubble] = useState('')
  const [isRestingMode, setIsRestingMode] = useState(false)

  // Sub-modais
  const [showBenefitsModal, setShowBenefitsModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showAdoptModal, setShowAdoptModal] = useState(false)
  const [adoptSlotTarget, setAdoptSlotTarget] = useState(null)

  // Formulário de Detalhes
  const [editName, setEditName] = useState('')
  const [editSpriteUrl, setEditSpriteUrl] = useState('')

  // Sincronização no LocalStorage
  useEffect(() => {
    localStorage.setItem('jardim_tamagotchi_pets', JSON.stringify(pets))
  }, [pets])

  useEffect(() => {
    localStorage.setItem('jardim_tamagotchi_bond', JSON.stringify(bondState))
  }, [bondState])

  useEffect(() => {
    localStorage.setItem('jardim_tamagotchi_history', JSON.stringify(history))
  }, [history])

  // Decaimento realista suave das necessidades com o tempo
  useEffect(() => {
    const interval = setInterval(() => {
      setPets(prevPets => {
        return prevPets.map(p => {
          if (!p) return null
          const now = Date.now()
          const minutesPassed = (now - (p.lastUpdated || now)) / 60000

          if (minutesPassed >= 2) {
            // Decai 1% a cada 2 minutos
            const decay = Math.floor(minutesPassed / 2)
            return {
              ...p,
              needs: {
                fome: Math.max(0, p.needs.fome - decay),
                sede: Math.max(0, p.needs.sede - decay),
                felicidade: Math.max(0, p.needs.felicidade - decay),
                sono: Math.max(0, p.needs.sono - decay)
              },
              lastUpdated: now
            }
          }
          return p
        })
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  // Disparo de partículas flutuantes
  const spawnParticles = (icon, count = 3) => {
    const newItems = []
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: Math.random(),
        icon,
        x: (Math.random() - 0.5) * 80 + 'px'
      })
    }
    setFloatingParticles(prev => [...prev, ...newItems])
    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => !newItems.some(n => n.id === p.id)))
    }, 1200)
  }

  // Falas espontâneas e fofas
  const triggerSpeech = (text) => {
    setSpeechBubble(text)
    setTimeout(() => setSpeechBubble(''), 3000)
  }

  // Adiciona ao histórico
  const addHistoryEntry = (icon, text) => {
    setHistory(prev => [
      { id: Date.now().toString(), icon, text, time: 'Agora mesmo' },
      ...prev.slice(0, 9)
    ])
  }

  // Concessão de XP e aumento de nível
  const grantPetXp = (amount) => {
    setPets(prev => {
      const next = [...prev]
      const pet = next[selectedSlotIndex]
      if (!pet) return next

      let newXp = pet.xp + amount
      let newLvl = pet.level
      let newMaxXp = pet.maxXp
      let newStage = pet.stageIndex

      if (newXp >= newMaxXp) {
        newXp -= newMaxXp
        newLvl += 1
        newMaxXp = Math.floor(newMaxXp * 1.35)
        tamagotchiAudio.playLevelUp()
        triggerSpeech(`🎉 Subiu para o Nível ${newLvl}!`)
        addHistoryEntry('⭐', `${pet.name} alcançou o Nível ${newLvl}!`)

        // Verificação de evolução
        if (newLvl >= 10 && newStage < 3) {
          newStage = 3
          triggerSpeech(`✨ Evoluiu para a Forma Adulta!`)
        } else if (newLvl >= 5 && newStage < 2) {
          newStage = 2
          triggerSpeech(`✨ Evoluiu para a Forma Jovem!`)
        }
      }

      next[selectedSlotIndex] = {
        ...pet,
        level: newLvl,
        xp: newXp,
        maxXp: newMaxXp,
        stageIndex: newStage,
        attributes: {
          vida: 12 + (newLvl - 1) * 3,
          forca: 3 + Math.floor(newLvl * 0.8),
          defesa: 2 + Math.floor(newLvl * 0.6)
        }
      }
      return next
    })

    // Concede XP de Vínculo também
    setBondState(prev => {
      let bXp = prev.xp + Math.floor(amount * 0.7)
      let bLvl = prev.level
      let bMax = prev.maxXp
      if (bXp >= bMax) {
        bXp -= bMax
        bLvl += 1
        bMax = Math.floor(bMax * 1.4)
      }
      return { level: bLvl, xp: bXp, maxXp: bMax }
    })
  }

  // Ações Principais
  const handlePetAction = (actionType) => {
    if (!currentPet) return

    setIsBouncing(true)
    setTimeout(() => setIsBouncing(false), 500)

    let updatedNeeds = { ...currentPet.needs }

    switch (actionType) {
      case 'carinho':
        tamagotchiAudio.playPetSound()
        updatedNeeds.felicidade = Math.min(100, updatedNeeds.felicidade + 12)
        spawnParticles('💖', 4)
        triggerSpeech('Bloop! ♥ (Adorou o carinho!)')
        addHistoryEntry('❤️', `${currentPet.name} ficou feliz ao receber carinho.`)
        grantPetXp(25)
        break

      case 'alimentar':
        tamagotchiAudio.playEatSound()
        updatedNeeds.fome = Math.min(100, updatedNeeds.fome + 20)
        updatedNeeds.felicidade = Math.min(100, updatedNeeds.felicidade + 5)
        spawnParticles('🥣', 3)
        triggerSpeech('Glup, glup! Delicioso!')
        addHistoryEntry('🥣', `${currentPet.name} comeu e está bem alimentado.`)
        grantPetXp(30)
        break

      case 'brincar':
        tamagotchiAudio.playPlaySound()
        updatedNeeds.felicidade = Math.min(100, updatedNeeds.felicidade + 18)
        updatedNeeds.sono = Math.max(0, updatedNeeds.sono - 10)
        spawnParticles('⚽', 3)
        triggerSpeech('Ploft! Que brincadeira divertida!')
        addHistoryEntry('⚽', `Você brincou com ${currentPet.name}.`)
        grantPetXp(35)
        break

      case 'descansar':
        tamagotchiAudio.playSleepSound()
        updatedNeeds.sono = Math.min(100, updatedNeeds.sono + 30)
        setIsRestingMode(true)
        spawnParticles('💤', 3)
        triggerSpeech('Zzz... Bocejou com sono...')
        addHistoryEntry('🌙', `${currentPet.name} tirou uma boa soneca.`)
        setTimeout(() => setIsRestingMode(false), 3000)
        grantPetXp(20)
        break

      case 'cuidar':
        tamagotchiAudio.playCareSound()
        updatedNeeds.sede = Math.min(100, updatedNeeds.sede + 18)
        updatedNeeds.fome = Math.min(100, updatedNeeds.fome + 8)
        updatedNeeds.felicidade = Math.min(100, updatedNeeds.felicidade + 10)
        spawnParticles('✨', 4)
        triggerSpeech('Plop reluzente! Sentindo-se renovado!')
        addHistoryEntry('✨', `Você cuidou e higienizou ${currentPet.name}.`)
        grantPetXp(40)
        break

      default:
        break
    }

    setPets(prev => {
      const next = [...prev]
      next[selectedSlotIndex] = {
        ...currentPet,
        needs: updatedNeeds,
        lastUpdated: Date.now()
      }
      return next
    })
  }

  // Ao clicar no pet no cenário
  const handlePetSpriteClick = () => {
    tamagotchiAudio.playPetSound()
    setIsBouncing(true)
    setTimeout(() => setIsBouncing(false), 500)
    spawnParticles('❤️', 2)
    const quotes = ['Plop!', 'Bloop... ♥', 'Nyah!', '~ Slime fofinho! ~', 'Glup!']
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    triggerSpeech(randomQuote)
  }

  // Salvar Detalhes Personalizados
  const handleSaveDetails = () => {
    if (!currentPet) return
    setPets(prev => {
      const next = [...prev]
      next[selectedSlotIndex] = {
        ...currentPet,
        name: editName.trim() || currentPet.name,
        spriteUrl: editSpriteUrl.trim() || currentPet.spriteUrl
      }
      return next
    })
    setShowDetailsModal(false)
  }

  // Abrir Modal de Detalhes
  const handleOpenDetails = () => {
    if (!currentPet) return
    setEditName(currentPet.name)
    setEditSpriteUrl(currentPet.spriteUrl)
    setShowDetailsModal(true)
  }

  // Adotar um novo companheiro
  const handleAdoptSpecies = (species) => {
    if (adoptSlotTarget === null) return

    const newPet = {
      id: 'pet_' + Date.now(),
      speciesId: species.id,
      name: species.name,
      subtitle: species.family,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      level: 1,
      xp: 0,
      maxXp: 300,
      spriteUrl: species.sprite,
      stageIndex: 1,
      needs: {
        fome: 90,
        sede: 90,
        felicidade: 95,
        sono: 85
      },
      attributes: {
        vida: 10,
        forca: 2,
        defesa: 1
      },
      lastUpdated: Date.now()
    }

    setPets(prev => {
      const next = [...prev]
      next[adoptSlotTarget] = newPet
      return next
    })

    setSelectedSlotIndex(adoptSlotTarget)
    setShowAdoptModal(false)
    setAdoptSlotTarget(null)
    triggerSpeech(`Bem-vindo(a), ${newPet.name}!`)
    addHistoryEntry('🥚', `Você adotou ${newPet.name}!`)
  }

  // Filtragem da Coleção
  const filteredCollection = useMemo(() => {
    if (!searchQuery.trim()) return SPECIES_COLLECTION
    const q = searchQuery.toLowerCase()
    return SPECIES_COLLECTION.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.family.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q)
    )
  }, [searchQuery])

  // Filtragem de pets para a lista da esquerda
  const filteredPets = useMemo(() => {
    return pets.filter(p => {
      if (!p) return true
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    })
  }, [pets, searchQuery])

  return (
    <div className="tamagotchi-modal-backdrop" onClick={onClose}>
      <div className="tamagotchi-frame-container" onClick={e => e.stopPropagation()}>

        {/* ─────────────────────────────────────────────────────────────
           CABEÇALHO OFICIAL (Banner com Ícone, Título e Nível de Vínculo)
           ───────────────────────────────────────────────────────────── */}
        <header className="tamagotchi-header-bar">
          <div className="tamagotchi-header-bg" />
          <div className="tamagotchi-header-overlay" />

          {/* Esquerda: Logo + Título */}
          <div className="tamagotchi-header-left">
            <div className="tamagotchi-header-icon-orb">
              <span>🐱</span>
            </div>
            <div className="tamagotchi-header-titles">
              <h1 className="tamagotchi-main-title">Pets</h1>
              <span className="tamagotchi-subtitle">
                Cuide do seu companheiro, fortaleça o vínculo e veja ele crescer.
              </span>
            </div>
          </div>

          {/* Direita: Nível de Vínculo + Botão Benefícios + Fechar */}
          <div className="tamagotchi-header-right">
            <div className="tamagotchi-bond-badge">
              <div className="tamagotchi-hex-badge">
                {bondState.level}
              </div>
              <div className="tamagotchi-bond-info">
                <span className="tamagotchi-bond-label">Nível de Vínculo</span>
                <div className="tamagotchi-bond-bar-wrap">
                  <div
                    className="tamagotchi-bond-bar-fill"
                    style={{ width: `${Math.min(100, (bondState.xp / bondState.maxXp) * 100)}%` }}
                  />
                </div>
                <span className="tamagotchi-bond-text">
                  {bondState.xp} / {bondState.maxXp} XP
                </span>
              </div>
            </div>

            <button
              type="button"
              className="tamagotchi-benefits-btn"
              onClick={() => setShowBenefitsModal(true)}
            >
              Ver Benefícios
            </button>

            <button
              type="button"
              className="tamagotchi-close-btn"
              onClick={onClose}
              title="Fechar Pets"
            >
              ✕
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
           CORPO PRINCIPAL (3 COLUNAS)
           ───────────────────────────────────────────────────────────── */}
        <div className="tamagotchi-body-grid">

          {/* ═══════════════════════════════════════════════════════════
             COLUNA ESQUERDA: LISTA DE COMPANHEIROS / COLEÇÃO
             ═══════════════════════════════════════════════════════════ */}
          <aside className="tamagotchi-left-col">
            {/* Abas */}
            <div className="tamagotchi-tabs-nav">
              <button
                type="button"
                className={`tamagotchi-tab-btn ${activeTab === 'meu_pet' ? 'active' : ''}`}
                onClick={() => setActiveTab('meu_pet')}
              >
                Meu Companheiro
              </button>
              <button
                type="button"
                className={`tamagotchi-tab-btn ${activeTab === 'colecao' ? 'active' : ''}`}
                onClick={() => setActiveTab('colecao')}
              >
                Coleção
              </button>
            </div>

            {/* Busca */}
            <div className="tamagotchi-search-box">
              <span className="tamagotchi-search-icon">🔍</span>
              <input
                type="text"
                className="tamagotchi-search-input"
                placeholder="Buscar companheiro..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Exibição: Meu Companheiro */}
            {activeTab === 'meu_pet' && (
              <div className="tamagotchi-pet-cards-list">
                {pets.map((pet, idx) => {
                  if (pet) {
                    const isSelected = selectedSlotIndex === idx
                    return (
                      <div
                        key={pet.id}
                        className={`tamagotchi-pet-card ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedSlotIndex(idx)}
                      >
                        <div className="tamagotchi-pet-thumb-box">
                          <img
                            src={pet.spriteUrl}
                            alt={pet.name}
                            className="tamagotchi-pet-thumb-img"
                            onError={(e) => {
                              e.target.src = '/assets/slime-azul.gif'
                            }}
                          />
                        </div>

                        <div className="tamagotchi-pet-card-info">
                          <div className="tamagotchi-pet-card-title-row">
                            <span className="tamagotchi-pet-card-name">
                              {pet.name}
                              <span className={pet.gender === 'male' ? 'tamagotchi-gender-male' : 'tamagotchi-gender-female'}>
                                {pet.gender === 'male' ? '♂' : '♀'}
                              </span>
                            </span>
                          </div>
                          <span className="tamagotchi-pet-card-species">{pet.subtitle}</span>

                          <div className="tamagotchi-pet-card-lvl-row">
                            <span className="tamagotchi-pet-card-lvl-text">Nível {pet.level}</span>
                            <div className="tamagotchi-pet-card-bar">
                              <div
                                className="tamagotchi-pet-card-bar-fill"
                                style={{ width: `${Math.min(100, (pet.xp / pet.maxXp) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // Slot Vazio
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="tamagotchi-empty-slot-card"
                      onClick={() => {
                        setAdoptSlotTarget(idx)
                        setShowAdoptModal(true)
                      }}
                    >
                      <div className="tamagotchi-empty-egg-box">
                        <span>🥚</span>
                      </div>
                      <div className="tamagotchi-empty-slot-info">
                        <span className="tamagotchi-empty-slot-title">Espaço Vazio</span>
                        <span className="tamagotchi-empty-slot-sub">Adote um novo companheiro</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Exibição: Coleção / Bestiário de Companheiros */}
            {activeTab === 'colecao' && (
              <div className="tamagotchi-pet-cards-list">
                {filteredCollection.map(item => (
                  <div key={item.id} className="tamagotchi-pet-card">
                    <div className="tamagotchi-pet-thumb-box">
                      <span style={{ fontSize: 28 }}>{item.icon}</span>
                    </div>
                    <div className="tamagotchi-pet-card-info">
                      <div className="tamagotchi-pet-card-title-row">
                        <span className="tamagotchi-pet-card-name">{item.name}</span>
                        <span style={{ fontSize: 10, color: '#f0bd5a' }}>{item.element}</span>
                      </div>
                      <span className="tamagotchi-pet-card-species">{item.family}</span>
                      <span style={{ fontSize: 10, color: '#6f7f85', marginTop: 3 }}>
                        {item.bonus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ═══════════════════════════════════════════════════════════
             COLUNA CENTRAL: CENÁRIO DO QUARTO, AÇÕES E EVOLUÇÃO
             ═══════════════════════════════════════════════════════════ */}
          <main className="tamagotchi-center-col">
            {/* Cenário do Aposento / Habitat */}
            <div className={`tamagotchi-room-stage ${isRestingMode ? 'night-mode' : ''}`}>
              <div className="tamagotchi-room-ambient-light" />

              {/* Badge de Felicidade */}
              <div className="tamagotchi-room-badge-topright">
                <div className="tamagotchi-room-badge-header">
                  <span>❤️ Felicidade</span>
                  <span>{currentPet ? currentPet.needs.felicidade : 0}%</span>
                </div>
                <div className="tamagotchi-room-badge-bar">
                  <div
                    className="tamagotchi-room-badge-bar-fill"
                    style={{ width: `${currentPet ? currentPet.needs.felicidade : 0}%` }}
                  />
                </div>
              </div>

              {/* Badge de Nível e XP */}
              <div className="tamagotchi-room-badge-level">
                <div className="tamagotchi-room-badge-header">
                  <span>⭐ Nível {currentPet ? currentPet.level : 1}</span>
                </div>
                <div className="tamagotchi-room-badge-bar">
                  <div
                    className="tamagotchi-room-badge-bar-fill"
                    style={{
                      width: `${currentPet ? Math.min(100, (currentPet.xp / currentPet.maxXp) * 100) : 0}%`,
                      background: 'linear-gradient(90deg, #c4923b, #f0bd5a)'
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: '#8899a6', textAlign: 'right', marginTop: 2 }}>
                  {currentPet ? `${currentPet.xp} / ${currentPet.maxXp} XP` : '0/0'}
                </span>
              </div>

              {/* Pet Animado no Tapete */}
              <div className="tamagotchi-pet-entity-container">
                {/* Balão de Fala */}
                {speechBubble && (
                  <div className="tamagotchi-speech-bubble">
                    {speechBubble}
                  </div>
                )}

                {/* Partículas Flutuantes */}
                {floatingParticles.map(p => (
                  <div
                    key={p.id}
                    className="tamagotchi-floating-particle"
                    style={{ '--p-x': p.x }}
                  >
                    {p.icon}
                  </div>
                ))}

                {/* Sprite do Pet com animações */}
                <div
                  className={`tamagotchi-pet-sprite-wrap ${isBouncing ? 'bounce' : ''}`}
                  onClick={handlePetSpriteClick}
                  title="Clique para brincar e fazer carinho!"
                >
                  <img
                    src={currentPet ? currentPet.spriteUrl : '/assets/tamagotchi/slime-azul.gif'}
                    alt={currentPet ? currentPet.name : 'Slime'}
                    className="tamagotchi-pet-sprite"
                    onError={(e) => {
                      e.target.src = '/assets/slime-azul.gif'
                    }}
                  />
                </div>

                {/* Sombra no Tapete */}
                <div className="tamagotchi-pet-rug-shadow" />
              </div>
            </div>

            {/* Barra de Ações */}
            <div className="tamagotchi-actions-section">
              <h2 className="tamagotchi-section-title">Ações</h2>

              <div className="tamagotchi-actions-grid">
                <button
                  type="button"
                  className="tamagotchi-action-btn"
                  onClick={() => handlePetAction('carinho')}
                  title="Fazer carinho (+Felicidade, +Vínculo)"
                >
                  <span className="tamagotchi-action-icon">🤲</span>
                  <span className="tamagotchi-action-label">Acariciar</span>
                </button>

                <button
                  type="button"
                  className="tamagotchi-action-btn"
                  onClick={() => handlePetAction('alimentar')}
                  title="Alimentar prato caseiro (+Fome, +XP)"
                >
                  <span className="tamagotchi-action-icon">🥣</span>
                  <span className="tamagotchi-action-label">Alimentar</span>
                </button>

                <button
                  type="button"
                  className="tamagotchi-action-btn"
                  onClick={() => handlePetAction('brincar')}
                  title="Brincar de bola (+Felicidade, -Sono)"
                >
                  <span className="tamagotchi-action-icon">⚽</span>
                  <span className="tamagotchi-action-label">Brincar</span>
                </button>

                <button
                  type="button"
                  className="tamagotchi-action-btn"
                  onClick={() => handlePetAction('descansar')}
                  title="Descansar no aposento (+Sono)"
                >
                  <span className="tamagotchi-action-icon">🛏️</span>
                  <span className="tamagotchi-action-label">Descansar</span>
                </button>

                <button
                  type="button"
                  className="tamagotchi-action-btn"
                  onClick={() => handlePetAction('cuidar')}
                  title="Cuidar e higienizar (+Sede, +Saúde)"
                >
                  <span className="tamagotchi-action-icon">➕</span>
                  <span className="tamagotchi-action-label">Cuidar</span>
                </button>
              </div>
            </div>

            {/* Linha do Tempo de Evolução */}
            <div className="tamagotchi-evolution-section">
              <h2 className="tamagotchi-section-title">Evolução</h2>

              <div className="tamagotchi-evolution-timeline">
                {/* Etapa 1: Ovo */}
                <div className={`tamagotchi-evo-step ${currentPet?.stageIndex === 0 ? 'active' : ''}`}>
                  <div className="tamagotchi-evo-thumb-box">
                    <span>🥚</span>
                  </div>
                  <span className="tamagotchi-evo-step-label">Ovo</span>
                  <span className="tamagotchi-evo-step-lvl">Nv. 1</span>
                </div>

                <span className="tamagotchi-evo-arrow">≫</span>

                {/* Etapa 2: Filhote */}
                <div className={`tamagotchi-evo-step ${currentPet?.stageIndex === 1 ? 'active' : ''}`}>
                  <div className="tamagotchi-evo-thumb-box">
                    <img
                      src={currentPet?.spriteUrl || '/assets/tamagotchi/slime-azul.gif'}
                      alt=""
                      style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                      onError={(e) => { e.target.src = '/assets/slime-azul.gif' }}
                    />
                  </div>
                  <span className="tamagotchi-evo-step-label">Filhote (Atual)</span>
                  <span className="tamagotchi-evo-step-lvl">Nv. 3</span>
                </div>

                <span className="tamagotchi-evo-arrow">≫</span>

                {/* Etapa 3: Jovem */}
                <div className={`tamagotchi-evo-step ${currentPet?.stageIndex === 2 ? 'active' : ''}`}>
                  <div className="tamagotchi-evo-thumb-box">
                    <span style={{ filter: currentPet?.stageIndex < 2 ? 'grayscale(1)' : 'none' }}>
                      💧
                    </span>
                  </div>
                  <span className="tamagotchi-evo-step-label">Jovem</span>
                  <span className="tamagotchi-evo-step-lvl">Nv. 5</span>
                </div>

                <span className="tamagotchi-evo-arrow">≫</span>

                {/* Etapa 4: Adulto */}
                <div className={`tamagotchi-evo-step ${currentPet?.stageIndex === 3 ? 'active' : ''}`}>
                  <div className="tamagotchi-evo-thumb-box">
                    <span style={{ filter: currentPet?.stageIndex < 3 ? 'grayscale(1)' : 'none' }}>
                      👑
                    </span>
                  </div>
                  <span className="tamagotchi-evo-step-label">Adulto</span>
                  <span className="tamagotchi-evo-step-lvl">Nv. 10</span>
                </div>
              </div>
            </div>
          </main>

          {/* ═══════════════════════════════════════════════════════════
             COLUNA DIREITA: NECESSIDADES, ATRIBUTOS, HISTÓRICO, DETALHES
             ═══════════════════════════════════════════════════════════ */}
          <aside className="tamagotchi-right-col">
            {/* Necessidades */}
            <div className="tamagotchi-needs-card">
              <div className="tamagotchi-card-header">
                <span>⚙️ Necessidades</span>
              </div>

              {/* Fome */}
              <div className="tamagotchi-need-row">
                <span className="tamagotchi-need-icon">🥣</span>
                <span className="tamagotchi-need-label">Fome</span>
                <div className="tamagotchi-need-bar-track">
                  <div
                    className="tamagotchi-need-bar-fill hunger"
                    style={{ width: `${currentPet ? currentPet.needs.fome : 0}%` }}
                  />
                </div>
                <span className="tamagotchi-need-val">{currentPet ? currentPet.needs.fome : 0}%</span>
              </div>

              {/* Sede */}
              <div className="tamagotchi-need-row">
                <span className="tamagotchi-need-icon">💧</span>
                <span className="tamagotchi-need-label">Sede</span>
                <div className="tamagotchi-need-bar-track">
                  <div
                    className="tamagotchi-need-bar-fill thirst"
                    style={{ width: `${currentPet ? currentPet.needs.sede : 0}%` }}
                  />
                </div>
                <span className="tamagotchi-need-val">{currentPet ? currentPet.needs.sede : 0}%</span>
              </div>

              {/* Felicidade */}
              <div className="tamagotchi-need-row">
                <span className="tamagotchi-need-icon">❤️</span>
                <span className="tamagotchi-need-label">Felicidade</span>
                <div className="tamagotchi-need-bar-track">
                  <div
                    className="tamagotchi-need-bar-fill happy"
                    style={{ width: `${currentPet ? currentPet.needs.felicidade : 0}%` }}
                  />
                </div>
                <span className="tamagotchi-need-val">{currentPet ? currentPet.needs.felicidade : 0}%</span>
              </div>

              {/* Sono */}
              <div className="tamagotchi-need-row">
                <span className="tamagotchi-need-icon">🌙</span>
                <span className="tamagotchi-need-label">Sono</span>
                <div className="tamagotchi-need-bar-track">
                  <div
                    className="tamagotchi-need-bar-fill sleep"
                    style={{ width: `${currentPet ? currentPet.needs.sono : 0}%` }}
                  />
                </div>
                <span className="tamagotchi-need-val">{currentPet ? currentPet.needs.sono : 0}%</span>
              </div>
            </div>

            {/* Atributos RPG */}
            <div className="tamagotchi-attrs-card">
              <div className="tamagotchi-card-header">
                <span>🛡️ Atributos</span>
              </div>

              <div className="tamagotchi-attr-row">
                <div className="tamagotchi-attr-left">
                  <span>❤️</span>
                  <span>Vida</span>
                </div>
                <span className="tamagotchi-attr-val">+{currentPet ? currentPet.attributes.vida : 12}</span>
              </div>

              <div className="tamagotchi-attr-row">
                <div className="tamagotchi-attr-left">
                  <span>⚔️</span>
                  <span>Força</span>
                </div>
                <span className="tamagotchi-attr-val">+{currentPet ? currentPet.attributes.forca : 3}</span>
              </div>

              <div className="tamagotchi-attr-row">
                <div className="tamagotchi-attr-left">
                  <span>🛡️</span>
                  <span>Defesa</span>
                </div>
                <span className="tamagotchi-attr-val">+{currentPet ? currentPet.attributes.defesa : 2}</span>
              </div>

              <div className="tamagotchi-attr-row">
                <div className="tamagotchi-attr-left">
                  <span>⭐</span>
                  <span>Experiência</span>
                </div>
                <span className="tamagotchi-attr-val">
                  {currentPet ? `${currentPet.xp} / ${currentPet.maxXp}` : '320 / 600'}
                </span>
              </div>
            </div>

            {/* Histórico */}
            <div className="tamagotchi-history-card">
              <div className="tamagotchi-card-header">
                <span>📜 Histórico</span>
              </div>

              <div className="tamagotchi-history-list">
                {history.map(item => (
                  <div key={item.id} className="tamagotchi-history-item">
                    <span className="tamagotchi-history-icon">{item.icon}</span>
                    <div className="tamagotchi-history-text-col">
                      <span>{item.text}</span>
                      <span className="tamagotchi-history-time">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão de Rodapé: Ver Detalhes */}
            <button
              type="button"
              className="tamagotchi-details-btn"
              onClick={handleOpenDetails}
            >
              <div className="tamagotchi-details-btn-content">
                <span>🐱</span>
                <span>Ver Detalhes</span>
              </div>
              <span>❯</span>
            </button>
          </aside>
        </div>

        {/* ─────────────────────────────────────────────────────────────
           SUB-MODAL: VER BENEFÍCIOS DO NÍVEL DE VÍNCULO
           ───────────────────────────────────────────────────────────── */}
        {showBenefitsModal && (
          <div className="tamagotchi-submodal-overlay" onClick={() => setShowBenefitsModal(false)}>
            <div className="tamagotchi-submodal-content" onClick={e => e.stopPropagation()}>
              <div className="tamagotchi-submodal-header">
                <h3 className="tamagotchi-submodal-title">Benefícios do Nível de Vínculo</h3>
                <button
                  type="button"
                  className="tamagotchi-close-btn"
                  onClick={() => setShowBenefitsModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="tamagotchi-submodal-body">
                <p style={{ fontSize: 12, color: 'var(--tama-text-sec)', margin: 0 }}>
                  Conforme você cuida, alimenta e se aventura ao lado dos seus companheiros, seu Vínculo aumenta e confere bônus permanentes ao seu personagem em todo o Bosque de Alma!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                  {BOND_BENEFITS.map(b => {
                    const isUnlocked = bondState.level >= b.level
                    return (
                      <div
                        key={b.level}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: 10,
                          borderRadius: 6,
                          background: isUnlocked ? 'rgba(36, 26, 16, 0.7)' : 'rgba(16, 22, 26, 0.4)',
                          border: isUnlocked ? '1.5px solid var(--tama-gold-main)' : '1px solid var(--tama-border-subtle)',
                          opacity: isUnlocked ? 1 : 0.6
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{b.icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isUnlocked ? 'var(--tama-gold-bright)' : 'var(--tama-text-muted)' }}>
                            Nível {b.level}: {b.title} {isUnlocked ? '✓ (Desbloqueado)' : '🔒'}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--tama-text-sec)' }}>
                            {b.desc}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="tamagotchi-submodal-footer">
                <button
                  type="button"
                  className="tamagotchi-primary-btn"
                  onClick={() => setShowBenefitsModal(false)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           SUB-MODAL: VER DETALHES & PERSONALIZAR PET / SPRITE GIF
           ───────────────────────────────────────────────────────────── */}
        {showDetailsModal && currentPet && (
          <div className="tamagotchi-submodal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="tamagotchi-submodal-content" onClick={e => e.stopPropagation()}>
              <div className="tamagotchi-submodal-header">
                <h3 className="tamagotchi-submodal-title">Detalhes do Companheiro</h3>
                <button
                  type="button"
                  className="tamagotchi-close-btn"
                  onClick={() => setShowDetailsModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="tamagotchi-submodal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="tamagotchi-pet-thumb-box" style={{ width: 64, height: 64 }}>
                    <img
                      src={editSpriteUrl || currentPet.spriteUrl}
                      alt=""
                      className="tamagotchi-pet-thumb-img"
                      onError={(e) => { e.target.src = '/assets/slime-azul.gif' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tama-gold-bright)' }}>
                      {currentPet.name}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--tama-text-muted)' }}>
                      {currentPet.subtitle} • Nível {currentPet.level}
                    </div>
                  </div>
                </div>

                <div className="tamagotchi-form-group">
                  <label className="tamagotchi-form-label">Nome do Companheiro</label>
                  <input
                    type="text"
                    className="tamagotchi-form-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Ex: Slime Azul, Fafnir..."
                  />
                </div>

                <div className="tamagotchi-form-group">
                  <label className="tamagotchi-form-label">Caminho do Sprite / GIF Animado</label>
                  <input
                    type="text"
                    className="tamagotchi-form-input"
                    value={editSpriteUrl}
                    onChange={e => setEditSpriteUrl(e.target.value)}
                    placeholder="Ex: /assets/tamagotchi/slime-azul.gif ou URL externa..."
                  />
                  <span style={{ fontSize: 10, color: 'var(--tama-text-muted)', marginTop: 2 }}>
                    Dica: Você pode usar arquivos locais em <code>public/assets/...</code> ou colar links diretos de GIFs e Pixel Arts!
                  </span>
                </div>

                <div style={{ background: '#0a0d10', padding: 12, borderRadius: 6, border: '1px solid var(--tama-border-subtle)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tama-gold-bright)' }}>
                    Bônus Passivo Ativo
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--tama-text-sec)', marginTop: 4 }}>
                    ❤️ +{currentPet.attributes.vida} Vida • ⚔️ +{currentPet.attributes.forca} Força • 🛡️ +{currentPet.attributes.defesa} Defesa
                  </div>
                </div>
              </div>

              <div className="tamagotchi-submodal-footer">
                <button
                  type="button"
                  className="tamagotchi-sec-btn"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="tamagotchi-primary-btn"
                  onClick={handleSaveDetails}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           SUB-MODAL: ADOTAR NOVO COMPANHEIRO / CHOCAR OVO
           ───────────────────────────────────────────────────────────── */}
        {showAdoptModal && (
          <div className="tamagotchi-submodal-overlay" onClick={() => setShowAdoptModal(false)}>
            <div className="tamagotchi-submodal-content" onClick={e => e.stopPropagation()}>
              <div className="tamagotchi-submodal-header">
                <h3 className="tamagotchi-submodal-title">Adotar Novo Companheiro</h3>
                <button
                  type="button"
                  className="tamagotchi-close-btn"
                  onClick={() => setShowAdoptModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="tamagotchi-submodal-body">
                <p style={{ fontSize: 12, color: 'var(--tama-text-sec)', margin: 0 }}>
                  Escolha qual criatura você deseja chocar ou adotar para este espaço livre no seu berçário:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SPECIES_COLLECTION.map(sp => (
                    <div
                      key={sp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 10,
                        borderRadius: 6,
                        background: '#161e23',
                        border: '1px solid var(--tama-border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 26 }}>{sp.icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tama-text-main)' }}>
                            {sp.name}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--tama-text-muted)' }}>
                            {sp.family} • {sp.element}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="tamagotchi-primary-btn"
                        style={{ fontSize: 11, padding: '6px 12px' }}
                        onClick={() => handleAdoptSpecies(sp)}
                      >
                        Adotar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tamagotchi-submodal-footer">
                <button
                  type="button"
                  className="tamagotchi-sec-btn"
                  onClick={() => setShowAdoptModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
