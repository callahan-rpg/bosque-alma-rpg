import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GuestProvider } from './contexts/GuestContext.jsx'
import { useDefaultLocation } from './hooks/useDefaultLocation'

const Location = lazy(() => import('./pages/Location.jsx'))
const Compendium = lazy(() => import('./pages/Compendium.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

function DynamicDefaultRedirect() {
  const { defaultSlug } = useDefaultLocation()
  return <Navigate to={`/location/${defaultSlug}`} replace />
}

export default function App() {
  return (
    <GuestProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="loading-screen"><span className="loading-dot" /></div>}>
          <Routes>
            {/* Rota inicial leva direto para a Localidade Padrão configurada pelo Mestre */}
            <Route path="/" element={<DynamicDefaultRedirect />} />
            
            {/* Visualização de Domínios e Localidades com Chat */}
            <Route path="/location/:slug" element={<Location />} />

            {/* Compêndio do Bosque (Bestiário, Herbário e Poções) */}
            <Route path="/compendio" element={<Compendium />} />

            {/* Portal de Mestre / Painel de Admin com Senha Mestra */}
            <Route path="/soul-master" element={<Admin />} />

            {/* Fallback de rotas */}
            <Route path="*" element={<DynamicDefaultRedirect />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </GuestProvider>
  )
}
