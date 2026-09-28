import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GuestProvider } from './contexts/GuestContext.jsx'

const Location = lazy(() => import('./pages/Location.jsx'))
const Compendium = lazy(() => import('./pages/Compendium.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

export default function App() {
  return (
    <GuestProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="loading-screen"><span className="loading-dot" /></div>}>
          <Routes>
            {/* Rota inicial leva direto para a Zona Neutra (Jardim do Crepúsculo) */}
            <Route path="/" element={<Navigate to="/location/crepusculo" replace />} />
            
            {/* Visualização de Domínios e Localidades com Chat */}
            <Route path="/location/:slug" element={<Location />} />

            {/* Compêndio do Bosque (Bestiário, Herbário e Poções) */}
            <Route path="/compendio" element={<Compendium />} />

            {/* Portal de Mestre / Painel de Admin com Senha Mestra */}
            <Route path="/soul-master" element={<Admin />} />

            {/* Fallback de rotas */}
            <Route path="*" element={<Navigate to="/location/crepusculo" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </GuestProvider>
  )
}
