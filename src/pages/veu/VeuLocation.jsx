import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import VeuHUD from '../../components/veu/VeuHUD.jsx'
import VeuNavButton from '../../components/veu/VeuNavButton.jsx'
import LocationChat from '../../components/chat/LocationChat.jsx'
import AmbientSoundPlayer from '../../components/AmbientSoundPlayer.jsx'
import WeatherEffects from '../../components/WeatherEffects.jsx'
import {
  getVeuLocation,
  subscribeVeuLocations,
  subscribeVeuConfig,
  DEFAULT_VEU_LOCATIONS
} from '../../firebase/veuService'
import '../../styles/veu.css'

export default function VeuLocation() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [currentSlug, setCurrentSlug] = useState(slug || 'encruzilhada-das-brumas')
  const [locationData, setLocationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)

  // Escuta configuração global para saber a sala padrão
  useEffect(() => {
    const unsub = subscribeVeuConfig(setConfig)
    return () => unsub()
  }, [])

  // Sincroniza localidade selecionada
  useEffect(() => {
    const target = slug || config?.defaultLocation || 'encruzilhada-das-brumas'
    setCurrentSlug(target)

    let isMounted = true
    setLoading(true)

    async function load() {
      const data = await getVeuLocation(target)
      if (isMounted) {
        setLocationData(data)
        setLoading(false)
      }
    }

    load()

    // Escuta mudanças de localidades no Firestore
    const unsub = subscribeVeuLocations((locs) => {
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

  const loc = locationData || DEFAULT_VEU_LOCATIONS[0]
  const navLeft = (loc.navigationButtons || []).filter(b => b.position === 'left')
  const navRight = (loc.navigationButtons || []).filter(b => b.position !== 'left')

  return (
    <div className="location-page-container">
      {/* Trilha Sonora / Áudio Ambiente */}
      {loc.locationSound && (
        <AmbientSoundPlayer locationSoundUrl={loc.locationSound} />
      )}

      {/* HUD Menu Superior de O Véu Sombrio */}
      <VeuHUD locationName={loc.name} />

      {/* Imagem de Fundo e Camada Atmosférica */}
      {loc.backgroundImage && (
        <div
          className="location-bg-layer"
          style={{ backgroundImage: `url("${loc.backgroundImage}")` }}
        />
      )}
      <div
        className="location-bg-overlay"
        style={{
          background: 'linear-gradient(180deg, rgba(7, 6, 10, 0.45) 0%, rgba(13, 10, 20, 0.8) 100%)'
        }}
      />

      {/* Efeitos Climáticos de Riverview (Névoa Espectral, Lua de Sangue, etc., ou Nenhum) */}
      <WeatherEffects
        condition={loc.weatherCondition || 'none'}
        enabled={Boolean(loc.weatherCondition && loc.weatherCondition !== 'none')}
      />

      {/* Conteúdo Principal — Botões Esquerda, Chat Central e Botões Direita */}
      <div className="location-content">
        <div className="location-main">
          {/* Botões de saída / conexões (Esquerda) */}
          <div className="nav-buttons-left">
            {navLeft.map((btn, i) => (
              <VeuNavButton
                key={i}
                label={btn.label}
                position="left"
                onClick={() => navigate(`/veu/location/${btn.targetSlug}`)}
              />
            ))}
          </div>

          {/* Chat Central de O Véu Sombrio (com universo='veu') */}
          <div className="chat-container">
            <LocationChat
              key={currentSlug}
              slug={`veu_${currentSlug}`}
              locationName={loc.name}
              universe="veu"
            />
          </div>

          {/* Botões de saída / conexões (Direita) */}
          <div className="nav-buttons-right">
            {navRight.map((btn, i) => (
              <VeuNavButton
                key={i}
                label={btn.label}
                position="right"
                onClick={() => navigate(`/veu/location/${btn.targetSlug}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

