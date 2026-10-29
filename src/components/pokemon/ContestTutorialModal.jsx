import { useState } from 'react'

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: 'Bem-vindo ao Grand Gala Pokémon! 🎀',
    subtitle: 'Uma celebração de elegância, talento e conexão com seu Pokémon',
    icon: '✨',
    badge: 'Conceito Fundamental',
    content: (
      <div className="tutorial-step-content">
        <p>
          Nos Festivais de Concurso, <strong>não há barras de vida para esgotar</strong>. Ninguém sai desmaiado!
        </p>
        <div className="tutorial-highlight-box">
          <span className="tutorial-highlight-icon">🎯</span>
          <div>
            <strong>O Grande Objetivo:</strong>
            <p>
              Conquistar a maior quantidade de <strong>Corações de Apelo (❤️)</strong> avaliados por 3 jurados oficiais e aplaudidos por um auditório vibrante.
            </p>
          </div>
        </div>
        <p style={{ marginTop: '0.8rem', color: '#cbd5e1' }}>
          O festival é dividido em <strong>Preparação no Camarim</strong>, <strong>Rodadas de Apresentação de Golpes</strong> e o <strong>Gran Finale de Pose</strong>!
        </p>
      </div>
    ),
  },
  {
    step: 2,
    title: 'Camarim, Atributos & Apelo de Entrada 🪮',
    subtitle: 'Como os atributos estéticos e a pelagem viram pontos no palco',
    icon: '🌸',
    badge: 'Preparação & SPA',
    content: (
      <div className="tutorial-step-content">
        <p>
          Todo Pokémon possui <strong>5 Atributos Estéticos</strong> (de 0 a 100) e o <strong>Lustre da Pelagem</strong>:
        </p>
        <div className="tutorial-stats-grid">
          <div className="stat-pill" style={{ color: '#38bdf8', borderColor: '#38bdf8' }}>
            <span>🌸 Graça</span>
            <small>Fluidez e arcos serenos</small>
          </div>
          <div className="stat-pill" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>
            <span>☀️ Imponência</span>
            <small>Impacto régio e chamas</small>
          </div>
          <div className="stat-pill" style={{ color: '#ec4899', borderColor: '#ec4899' }}>
            <span>💖 Encanto</span>
            <small>Fofura e carisma puro</small>
          </div>
          <div className="stat-pill" style={{ color: '#a855f7', borderColor: '#a855f7' }}>
            <span>🔮 Mistério</span>
            <small>Ilusão e sombras enigmáticas</small>
          </div>
          <div className="stat-pill" style={{ color: '#10b981', borderColor: '#10b981' }}>
            <span>⚡ Vigor</span>
            <small>Acrobacias e ritmo veloz</small>
          </div>
        </div>
        <div className="tutorial-highlight-box" style={{ marginTop: '1rem' }}>
          <span className="tutorial-highlight-icon">💡</span>
          <div>
            <strong>Como isso funciona na prática?</strong>
            <p>
              Ao escolher um festival (ex: <em>Graça</em>), o atributo correspondente do seu Pokémon e o polimento da pelagem são somados e convertidos em <strong>Corações de Entrada (❤️)</strong>. Você já sobe ao palco com vantagem sobre os rivais!
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 3,
    title: 'O Palco: Escolha Estratégica de Golpes 🎭',
    subtitle: 'Afinidade temática, combos cênicos e o julgamento dos juízes',
    icon: '🎪',
    badge: 'Apresentação Cênica',
    content: (
      <div className="tutorial-step-content">
        <p>
          Em cada uma das 4 rodadas no palco, você escolhe qual golpe seu Pokémon vai apresentar para a plateia. <strong>Fique atento aos badges visuais no card de cada golpe:</strong>
        </p>
        <div className="tutorial-tips-list">
          <div className="tutorial-tip-item">
            <span className="badge-preview theme">⭐ Tema (+1 ❤️)</span>
            <span>
              Golpes da mesma categoria do festival ganham corações extras e animam a plateia.
            </span>
          </div>
          <div className="tutorial-tip-item">
            <span className="badge-preview combo">⚡ COMBO ATIVO (+80%)</span>
            <span>
              Quando seu golpe combina perfeitamente com o movimento usado pelo concorrente logo antes de você, ele ganha uma bonificação colossal de corações!
            </span>
          </div>
          <div className="tutorial-tip-item">
            <span className="badge-preview repeat">⚠️ Repetido (-2 ❤️)</span>
            <span>
              Os jurados acham previsível quando um Pokémon usa o mesmo golpe duas vezes seguidas e penalizam a nota.
            </span>
          </div>
          <div className="tutorial-tip-item">
            <span className="badge-preview jam">💥 Tensão (-X ❤️)</span>
            <span>
              Certos golpes intimidam os adversários e reduzem corações deles.
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 4,
    title: 'Fervor da Plateia & Gran Finale QTE 🎆',
    subtitle: 'O clímax do espetáculo e a pose em sincronia perfeita',
    icon: '⭐',
    badge: 'Clímax & Timing',
    content: (
      <div className="tutorial-step-content">
        <div className="tutorial-highlight-box">
          <span className="tutorial-highlight-icon">🔥</span>
          <div>
            <strong>Fervor da Plateia (As 5 Estrelas no topo):</strong>
            <p>
              Sempre que alguém usa um golpe do tema do festival, o medidor ganha estrelas. O participante que preencher a <strong>5ª estrela</strong> causa uma explosão de ovação e fatura <strong>+4 corações bônus</strong>!
            </p>
          </div>
        </div>
        <div className="tutorial-highlight-box" style={{ marginTop: '0.8rem' }}>
          <span className="tutorial-highlight-icon">🎯</span>
          <div>
            <strong>O Showstopper Final (Ato III):</strong>
            <p>
              Ao fim das rodadas, você escolhe uma pose marcante. Um anel dourado começará a encolher: <strong>clique no botão exatamente quando o anel tocar o disco central</strong> para atingir a pontuação máxima de <em>Ovação Absoluta</em>!
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 5,
    title: 'Pódio, Fitas & Como Repetir o Tutorial 🏅',
    subtitle: 'Coleção de Fitas Oficiais e glória no mundo Pokémon',
    icon: '🎀',
    badge: 'Premiação',
    content: (
      <div className="tutorial-step-content">
        <p>
          O participante com a maior soma de corações ao final sobe no <strong>1º Lugar do Pódio</strong>!
        </p>
        <div className="tutorial-rewards-preview">
          <div className="reward-box">
            <span style={{ fontSize: '2rem' }}>🥉 / 🥈 / 🥇</span>
            <strong>Fita Oficial de Festival</strong>
            <small>Gravada permanentemente na ficha de honra do seu Pokémon</small>
          </div>
          <div className="reward-box">
            <span style={{ fontSize: '2rem' }}>✨</span>
            <strong>Glamour Coins</strong>
            <small>Moedas para comprar novos óleos, essências e escovas no Camarim</small>
          </div>
        </div>
        <div className="tutorial-highlight-box" style={{ marginTop: '1.2rem', borderColor: '#fbbf24' }}>
          <span className="tutorial-highlight-icon">🎓</span>
          <div>
            <strong>Quer rever estas dicas no futuro?</strong>
            <p>
              Você pode reabrir este tutorial sempre que quiser clicando no botão <strong>"🎓 Como Funciona (Tutorial)"</strong> localizado no Camarim.
            </p>
          </div>
        </div>
      </div>
    ),
  },
]

export default function ContestTutorialModal({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  if (!isOpen) return null

  const stepData = TUTORIAL_STEPS[currentStepIndex]
  const isFirst = currentStepIndex === 0
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      onClose()
    } else {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  return (
    <div className="contest-tutorial-overlay" onClick={onClose}>
      <div className="contest-tutorial-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header do Modal */}
        <div className="tutorial-modal-header">
          <div className="tutorial-title-area">
            <span className="tutorial-category-badge">{stepData.badge}</span>
            <h2 className="tutorial-main-title">{stepData.title}</h2>
            <p className="tutorial-subtitle">{stepData.subtitle}</p>
          </div>
          <button className="tutorial-close-btn" onClick={onClose} title="Fechar tutorial">
            ✕
          </button>
        </div>

        {/* Indicadores de Progresso em Bolinhas */}
        <div className="tutorial-stepper">
          {TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={s.step}
              className={`tutorial-stepper-dot ${idx === currentStepIndex ? 'active' : ''} ${
                idx < currentStepIndex ? 'completed' : ''
              }`}
              onClick={() => setCurrentStepIndex(idx)}
              title={`Ir para o Passo ${s.step}: ${s.title}`}
            >
              <span>{s.step}</span>
            </button>
          ))}
        </div>

        {/* Corpo do Passo Atual */}
        <div className="tutorial-body">{stepData.content}</div>

        {/* Rodapé com Navegação */}
        <div className="tutorial-modal-footer">
          <button
            className="tutorial-nav-btn prev"
            onClick={handlePrev}
            disabled={isFirst}
            style={{ opacity: isFirst ? 0.3 : 1, cursor: isFirst ? 'not-allowed' : 'pointer' }}
          >
            ← Anterior
          </button>

          <span className="tutorial-counter">
            Passo {currentStepIndex + 1} de {TUTORIAL_STEPS.length}
          </span>

          <button className="tutorial-nav-btn next" onClick={handleNext}>
            {isLast ? '✨ Concluir e Jogar!' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>
  )
}
