import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { useDefaultLocation } from './hooks/useDefaultLocation'
import { LocationTransitionProvider } from './contexts/LocationTransitionContext.jsx'
import LocationTransitionOverlay from './components/transitions/LocationTransitionOverlay.jsx'

const Location = lazy(() => import('./pages/Location.jsx'))
const Compendium = lazy(() => import('./pages/Compendium.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const CharacterSheet = lazy(() => import('./pages/CharacterSheet.jsx'))
const PublicCharacters = lazy(() => import('./pages/PublicCharacters.jsx'))
const Combat = lazy(() => import('./pages/Combat.jsx'))
const PotionCraftingModal = lazy(() => import('./components/PotionCraftingModal.jsx'))
const CookingCraftingModal = lazy(() => import('./components/CookingCraftingModal.jsx'))
const TamagotchiModal = lazy(() => import('./components/TamagotchiModal.jsx'))
const WorldSelector = lazy(() => import('./pages/WorldSelector.jsx'))
const GlobeWorld = lazy(() => import('./pages/GlobeWorld.jsx'))
const PokemonAdmin = lazy(() => import('./pages/pokemon/PokemonAdmin.jsx'))
const PokemonHub = lazy(() => import('./pages/pokemon/PokemonHub.jsx'))
const PokemonLocation = lazy(() => import('./pages/pokemon/PokemonLocation.jsx'))
const PokemonContest = lazy(() => import('./pages/pokemon/PokemonContest.jsx'))

// Universo Cyberpunk 2099
const CyberpunkAdmin = lazy(() => import('./pages/cyberpunk/CyberpunkAdmin.jsx'))
const CyberpunkLocation = lazy(() => import('./pages/cyberpunk/CyberpunkLocation.jsx'))
const CyberpunkCharacterSheet = lazy(() => import('./pages/cyberpunk/CyberpunkCharacterSheet.jsx'))
const CyberpunkPublicCharacters = lazy(() => import('./pages/cyberpunk/CyberpunkPublicCharacters.jsx'))

function DynamicDefaultRedirect() {
  const { defaultSlug } = useDefaultLocation()
  return <Navigate to={`/location/${defaultSlug}`} replace />
}

/** Guard que exige autenticação para ver o conteúdo */
function AuthGuard({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <span className="auth-loading-rune">⬡</span>
        <span className="auth-loading-text">Verificando acesso...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LocationTransitionProvider>
          <LocationTransitionOverlay />
          <Suspense fallback={<div className="loading-screen"><span className="loading-dot" /></div>}>
            <Routes>
              {/* Rota de pré-visualização e teste de bordas da Alquimia */}
              <Route path="/alchemy-preview" element={<PotionCraftingModal onClose={() => {}} />} />
              {/* Rota de pré-visualização e teste da Cozinha */}
              <Route path="/cooking-preview" element={<CookingCraftingModal onClose={() => {}} />} />
              <Route path="/cozinha" element={<CookingCraftingModal onClose={() => {}} />} />
              {/* Rotas de pré-visualização e acesso aos Pets */}
              <Route path="/tamagotchi-preview" element={<TamagotchiModal onClose={() => {}} />} />
              <Route path="/tamagotchi" element={<TamagotchiModal onClose={() => {}} />} />
              <Route path="/pet" element={<TamagotchiModal onClose={() => {}} />} />
              <Route path="/pets" element={<TamagotchiModal onClose={() => {}} />} />

              {/* Rotas protegidas por autenticação */}
              <Route path="/*" element={
                <AuthGuard>
                  <Routes>
                    {/* Rota inicial leva direto para a Localidade Padrão configurada pelo Mestre */}
                    <Route path="/" element={<DynamicDefaultRedirect />} />

                    {/* Seletor de Mundos / Portal do Multiverso (3D Coverflow) */}
                    <Route path="/worlds" element={<WorldSelector />} />
                    <Route path="/mundos" element={<WorldSelector />} />
                    <Route path="/portal" element={<WorldSelector />} />

                    {/* Globo 3D Interativo — Mapa do Multiverso */}
                    <Route path="/globo" element={<GlobeWorld />} />
                    <Route path="/globe" element={<GlobeWorld />} />
                    <Route path="/mapa" element={<GlobeWorld />} />

                {/* Visualização de Domínios e Localidades com Chat */}
                <Route path="/location/:slug" element={<Location />} />

                {/* Compêndio do Bosque (Bestiário, Herbário e Poções) */}
                <Route path="/compendio" element={<Compendium />} />

                {/* Ficha / Página do Personagem */}
                <Route path="/personagem" element={<CharacterSheet />} />
                <Route path="/personagem/:targetUid" element={<CharacterSheet />} />
                <Route path="/ficha" element={<CharacterSheet />} />
                <Route path="/character" element={<CharacterSheet />} />
                <Route path="/character/:targetUid" element={<CharacterSheet />} />

                {/* Lista / Galeria Pública de Personagens */}
                <Route path="/personagens" element={<PublicCharacters />} />
                <Route path="/characters" element={<PublicCharacters />} />
                <Route path="/viajantes" element={<PublicCharacters />} />

                {/* Mesa de Combate Tático em Tempo Real */}
                <Route path="/combat" element={<Combat />} />
                <Route path="/combate" element={<Combat />} />

                {/* Portal de Mestre / Painel de Admin do Jardim */}
                <Route path="/soul-master" element={<Admin />} />
                <Route path="/admin" element={<Admin />} />

                {/* Universo Pokémon — Temporariamente inacessível (em desenvolvimento) */}
                <Route path="/pokemon/*" element={<Navigate to="/mundos" replace />} />
                <Route path="/pokemon" element={<Navigate to="/mundos" replace />} />
                <Route path="/mundo-pokemon" element={<Navigate to="/mundos" replace />} />
                <Route path="/pokedex" element={<Navigate to="/mundos" replace />} />

                {/* Universo Cyberpunk 2099 — Localidades e Distritos com Chat */}
                <Route path="/cyberpunk" element={<CyberpunkLocation />} />
                <Route path="/cyberpunk/location/:slug" element={<CyberpunkLocation />} />

                {/* Universo Cyberpunk 2099 — Painel de Administração / Criação de Localidades */}
                <Route path="/cyberpunk/admin" element={<CyberpunkAdmin />} />
                <Route path="/cyberpunk-admin" element={<CyberpunkAdmin />} />

                {/* Universo Cyberpunk 2099 — Ficha de Personagem Independente */}
                <Route path="/cyberpunk/personagem" element={<CyberpunkCharacterSheet />} />
                <Route path="/cyberpunk/personagem/:targetUid" element={<CyberpunkCharacterSheet />} />
                <Route path="/cyberpunk/ficha" element={<CyberpunkCharacterSheet />} />
                <Route path="/cyberpunk/character" element={<CyberpunkCharacterSheet />} />
                <Route path="/cyberpunk/character/:targetUid" element={<CyberpunkCharacterSheet />} />

                {/* Universo Cyberpunk 2099 — Galeria Pública de Mercenários */}
                <Route path="/cyberpunk/personagens" element={<CyberpunkPublicCharacters />} />
                <Route path="/cyberpunk/mercenarios" element={<CyberpunkPublicCharacters />} />

                {/* Fallback de rotas */}
                <Route path="*" element={<DynamicDefaultRedirect />} />
              </Routes>
            </AuthGuard>
          } />
        </Routes>
      </Suspense>
    </LocationTransitionProvider>
  </BrowserRouter>
</AuthProvider>
)
}

