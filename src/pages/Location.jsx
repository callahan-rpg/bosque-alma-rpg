import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import HUD from '../components/HUD.jsx'
import LocationChat from '../components/chat/LocationChat.jsx'
import WeatherEffects from '../components/WeatherEffects.jsx'
import AmbientSoundPlayer from '../components/AmbientSoundPlayer.jsx'
import FantasyNavButton from '../components/FantasyNavButton.jsx'

// Localidade padrão de fallback (Jardim do Crepúsculo com botões paralelos)
const FALLBACK_LOCATION = {
  name: 'Pátio da Cabana - Crepúsculo',
  slug: 'crepusculo',
  description: 'O coração do bosque mágico de Alma Koskovic. O ar é suave e perfumado por flores raras.',
  backgroundImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
  weatherCondition: 'none',
  locationSound: '',
  navigationButtons: [
    { label: 'Chalés / Estufas', targetSlug: 'estufas', position: 'left' },
    { label: 'Entrar na Cabana', targetSlug: 'cabana-alma', position: 'right' },
    { label: 'Campos do Sul', targetSlug: 'jardim-noite', position: 'right' },
  ]
}

export default function Location() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const currentSlug = slug || 'crepusculo'

  const [locationData, setLocationData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const locRef = doc(db, 'locations', currentSlug)

    const unsub = onSnapshot(locRef, (snap) => {
      if (snap.exists()) {
        setLocationData({ slug: snap.id, ...snap.data() })
      } else {
        setLocationData({
          ...FALLBACK_LOCATION,
          slug: currentSlug,
          name: currentSlug === 'crepusculo' ? FALLBACK_LOCATION.name : `Domínio: ${currentSlug}`,
        })
      }
      setLoading(false)
    }, (err) => {
      console.warn('[Location] Erro ao ler localidade:', err)
      setLocationData({ ...FALLBACK_LOCATION, slug: currentSlug })
      setLoading(false)
    })

    return () => unsub()
  }, [currentSlug])

  const loc = locationData || FALLBACK_LOCATION

  const navLeft = (loc.navigationButtons || []).filter(b => b.position === 'left')
  const navRight = (loc.navigationButtons || []).filter(b => b.position !== 'left')

  return (
    <div className="location-page-container">
      {/* Player de Trilha Sonora */}
      <AmbientSoundPlayer locationSoundUrl={loc.locationSound || ''} />

      {/* HUD Menu Superior Arredondado */}
      <HUD
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
          className="location-bg-layer"
          style={{ backgroundImage: `url("${loc.backgroundImage}")` }}
        />
      )}
      <div className="location-bg-overlay" />

      {/* Efeitos de Clima Específicos */}
      <WeatherEffects condition={loc.weatherCondition || 'none'} enabled={true} />

      {/* Conteúdo Principal com Botões de Navegação Paralelos ao Chat */}
      <div className="location-content">
        <div className="location-main">
          {/* Botões de saída (Esquerda) */}
          <div className="nav-buttons-left">
            {navLeft.map((btn, i) => (
              <FantasyNavButton
                key={i}
                label={btn.label}
                onClick={() => navigate(`/location/${btn.targetSlug}`)}
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
                onClick={() => navigate(`/location/${btn.targetSlug}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
