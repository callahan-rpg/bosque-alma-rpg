import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { useDefaultLocation } from './hooks/useDefaultLocation'

const Location = lazy(() => import('./pages/Location.jsx'))
const Compendium = lazy(() => import('./pages/Compendium.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const CharacterSheet = lazy(() => import('./pages/CharacterSheet.jsx'))
const PublicCharacters = lazy(() => import('./pages/PublicCharacters.jsx'))
const Combat = lazy(() => import('./pages/Combat.jsx'))

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
        <AuthGuard>
          <Suspense fallback={<div className="loading-screen"><span className="loading-dot" /></div>}>
            <Routes>
              {/* Rota inicial leva direto para a Localidade Padrão configurada pelo Mestre */}
              <Route path="/" element={<DynamicDefaultRedirect />} />

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

              {/* Portal de Mestre / Painel de Admin com Senha Mestra */}
              <Route path="/soul-master" element={<Admin />} />
              <Route path="/admin" element={<Admin />} />

              {/* Fallback de rotas */}
              <Route path="*" element={<DynamicDefaultRedirect />} />
            </Routes>
          </Suspense>
        </AuthGuard>
      </BrowserRouter>
    </AuthProvider>
  )
}

