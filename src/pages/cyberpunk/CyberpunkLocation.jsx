import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CyberpunkHUD from '../../components/cyberpunk/CyberpunkHUD.jsx'
import CyberNavButton from '../../components/cyberpunk/CyberNavButton.jsx'
import LocationChat from '../../components/chat/LocationChat.jsx'
import AmbientSoundPlayer from '../../components/AmbientSoundPlayer.jsx'
import WeatherEffects from '../../components/WeatherEffects.jsx'
import {
  getCyberpunkLocation,
  subscribeCyberpunkLocations,
  subscribeCyberpunkConfig,
  DEFAULT_CYBERPUNK_LOCATIONS
} from '../../firebase/cyberpunkService'
import '../../styles/cyberpunk.css'

export default function CyberpunkLocation() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [currentSlug, setCurrentSlug] = useState(slug || 'doca-central')
  const [locationData, setLocationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)

  // Escuta config global para saber a sala padrão
  useEffect(() => {
    const unsub = subscribeCyberpunkConfig(setConfig)
    return () => unsub()
  }, [])

  // Sincroniza localidade selecionada
  useEffect(() => {
    const target = slug || config?.defaultLocation || 'doca-central'
    setCurrentSlug(target)

    let isMounted = true
    setLoading(true)

    async function load() {
      const data = await getCyberpunkLocation(target)
      if (isMounted) {
        setLocationData(data)
        setLoading(false)
      }
    }

    load()

    // Escuta mudanças de localidades no Firestore
    const unsub = subscribeCyberpunkLocations((locs) => {
      if (isMounted) {
        const found = locs.find(l => l.slug === target)
        if (found) setLocationData(found)
      }
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [slug, config?.defaultLocation])

  const loc = locationData || DEFAULT_CYBERPUNK_LOCATIONS[0]
  const navLeft = (loc.navigationButtons || []).filter(b => b.position === 'left')
  const navRight = (loc.navigationButtons || []).filter(b => b.position !== 'left')

  return (
    <div className="location-page-container">
      {/* Player de Trilha Sonora */}
      {loc.locationSound && (
        <AmbientSoundPlayer locationSoundUrl={loc.locationSound} />
      )}

      {/* HUD Menu Superior do Universo Cyberpunk */}
      <CyberpunkHUD
        locationName={loc.name}
      />

      {/* Imagem de Fundo e Overlay Limpo */}
      {loc.backgroundImage && (
        <div
          className="location-bg-layer"
          style={{ backgroundImage: `url("${loc.backgroundImage}")` }}
        />
      )}
      <div
        className="location-bg-overlay"
        style={{
          background: 'linear-gradient(180deg, rgba(6, 8, 14, 0.6) 0%, rgba(6, 8, 14, 0.85) 100%)'
        }}
      />

      {/* Efeitos Climáticos / Atmosfera (Aurora Boreal, Chuva Barométrica, Névoa, Tempestade EMP, etc) */}
      <WeatherEffects condition={loc.weatherCondition || 'none'} enabled={true} />

      {/* Conteúdo Principal — Layout idêntico ao Jardim: Botões Esquerda, Chat Central (680px) e Botões Direita */}
      <div className="location-content">
        <div className="location-main">
          {/* Botões de saída / conexões (Esquerda) */}
          <div className="nav-buttons-left">
            {navLeft.map((btn, i) => (
              <CyberNavButton
                key={i}
                label={btn.label}
                position="left"
                onClick={() => navigate(`/cyberpunk/location/${btn.targetSlug}`)}
              />
            ))}
          </div>

          {/* Chat Central (Não-esticado, mesmo padrão do Jardim) */}
          <div className="chat-container">
            <LocationChat
              key={currentSlug}
              slug={`cyberpunk_${currentSlug}`}
              locationName={loc.name}
            />
          </div>

          {/* Botões de saída / conexões (Direita) */}
          <div className="nav-buttons-right">
            {navRight.map((btn, i) => (
              <CyberNavButton
                key={i}
                label={btn.label}
                position="right"
                onClick={() => navigate(`/cyberpunk/location/${btn.targetSlug}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
