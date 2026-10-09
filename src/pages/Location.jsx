import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import HUD from '../components/HUD.jsx'
import LocationChat from '../components/chat/LocationChat.jsx'
import WeatherEffects from '../components/WeatherEffects.jsx'
import AmbientSoundPlayer from '../components/AmbientSoundPlayer.jsx'
import FantasyNavButton from '../components/FantasyNavButton.jsx'

import { useLocationTransition } from '../contexts/LocationTransitionContext.jsx'

// Localidade padrão de fallback (Jardim do Crepúsculo)
const FALLBACK_LOCATION = {
  name: 'Jardim do Crepúsculo',
  slug: 'jardim-do-crepusculo',
  description: 'O coração do bosque mágico de Alma Koskovic.',
  backgroundImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
  weatherCondition: 'none',
  locationSound: '',
  navigationButtons: []
}

// Cache global em memória para localidades já carregadas (elimina qualquer piscada ou recarregamento indevido)
const globalLocationsCache = {}

export default function Location() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const currentSlug = slug || 'jardim-do-crepusculo'

  const {
    startTransition,
    isTransitioning,
    transitionEffect,
    transitionPhase,
  } = useLocationTransition()

  const [locationData, setLocationData] = useState(() => globalLocationsCache[currentSlug] || null)
  const [loading, setLoading] = useState(!globalLocationsCache[currentSlug])

  useEffect(() => {
    // Se já estiver em cache, usa imediatamente para a transição ser 100% contínua
    if (globalLocationsCache[currentSlug]) {
      setLocationData(globalLocationsCache[currentSlug])
      setLoading(false)
    }

    const locRef = doc(db, 'locations', currentSlug)

    const unsub = onSnapshot(locRef, (snap) => {
      if (snap.exists()) {
        const data = { slug: snap.id, ...snap.data() }
        globalLocationsCache[currentSlug] = data
        setLocationData(data)
      } else {
        const fallback = {
          ...FALLBACK_LOCATION,
          slug: currentSlug,
          name: currentSlug === 'jardim-do-crepusculo' ? FALLBACK_LOCATION.name : `Domínio: ${currentSlug}`,
          navigationButtons: []
        }
        globalLocationsCache[currentSlug] = fallback
        setLocationData(fallback)
      }
      setLoading(false)
    }, (err) => {
      console.warn('[Location] Erro ao ler localidade:', err)
      const fallback = { ...FALLBACK_LOCATION, slug: currentSlug }
      setLocationData(fallback)
      setLoading(false)
    })

    return () => unsub()
  }, [currentSlug])

  const loc = locationData || globalLocationsCache[currentSlug] || {
    ...FALLBACK_LOCATION,
    slug: currentSlug,
    name: currentSlug === 'jardim-do-crepusculo' ? FALLBACK_LOCATION.name : `Domínio: ${currentSlug}`
  }

  const navLeft = (loc.navigationButtons || []).filter(b => b.position === 'left')
  const navRight = (loc.navigationButtons || []).filter(b => b.position !== 'left')

  const handleNavigate = (btn) => {
    const effect = btn.transitionEffect
    // Só usa a transição visual se houver efeito explicitamente configurado no botão
    if (effect && effect !== '') {
      startTransition(btn.targetSlug, effect, { locationName: btn.label })
    } else {
      // Sem transição configurada: navega direto para o local-alvo
      navigate(`/location/${btn.targetSlug}`)
    }
  }

  // Define classe CSS animada no container principal para engolir ou emergir elementos suavemente
  const transitionClass = isTransitioning
    ? (transitionEffect === 'water_whirlpool'
        ? (transitionPhase === 'swallowing' || transitionPhase === 'switching' ? 'whirlpool-swallowing' : 'whirlpool-emerging')
        : transitionEffect === 'portal_arcane'
        ? (transitionPhase === 'swallowing' || transitionPhase === 'switching' ? 'arcane-swallowing' : 'arcane-emerging')
        : transitionEffect === 'mystic_mist'
        ? (transitionPhase === 'swallowing' || transitionPhase === 'switching' ? 'mist-swallowing' : 'mist-emerging')
        : (transitionPhase === 'swallowing' || transitionPhase === 'switching' ? 'whirlpool-swallowing' : 'whirlpool-emerging'))
    : ''

  return (
    <div className={`location-page-container ${isTransitioning ? 'is-transitioning' : ''}`}>
      {/* Player de Trilha Sonora */}
      <AmbientSoundPlayer locationSoundUrl={loc.locationSound || ''} />

      {/* HUD Menu Superior Arredondado */}
      <HUD
        locationSlug={currentSlug}
        locationName={loc.name}
        weatherCondition={loc.weatherCondition || 'none'}
        minTemp={loc.minTemp}
        maxTemp={loc.maxTemp}
        temperature={loc.temperature}
        windSpeed={loc.windSpeed || loc.wind}
      />

      {/* Imagem de Fundo e Overlay */}
      {loc.backgroundImage && (
        <div
          className={`location-bg-layer ${transitionClass}`}
          style={{ backgroundImage: `url("${loc.backgroundImage}")` }}
        />
      )}
      <div className="location-bg-overlay" />

      {/* Efeitos de Clima Específicos */}
      <WeatherEffects condition={loc.weatherCondition || 'none'} enabled={true} />

      {/* Conteúdo Principal com Botões de Navegação Paralelos ao Chat (Engolidos no Vórtice) */}
      <div className={`location-content ${transitionClass}`}>
        <div className="location-main">
          {/* Botões de saída (Esquerda) */}
          <div className="nav-buttons-left">
            {navLeft.map((btn, i) => (
              <FantasyNavButton
                key={i}
                label={btn.label}
                onClick={() => handleNavigate(btn)}
              />
            ))}
          </div>

          {/* Chat Central */}
          <div className="chat-container">
            <LocationChat
              key={currentSlug}
              slug={currentSlug}
              locationName={loc.name}
            />
          </div>

          {/* Botões de saída (Direita) */}
          <div className="nav-buttons-right">
            {navRight.map((btn, i) => (
              <FantasyNavButton
                key={i}
                label={btn.label}
                onClick={() => handleNavigate(btn)}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
