/**
 * GuestContext — mantido para compatibilidade retroativa.
 * Todos os componentes que importam useGuest() daqui continuam funcionando,
 * pois apenas re-exportamos do AuthContext.
 */
export { useGuest, AuthProvider as GuestProvider } from './AuthContext.jsx'
