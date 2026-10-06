import { useState } from 'react'
import { registerWithNick, loginWithNick } from '../firebase/auth'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [nick, setNick] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await loginWithNick(nick, password)
      } else {
        await registerWithNick(nick, password)
      }
      // AuthContext detecta a mudança e desbloqueia o app automaticamente
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg" />
      <div className="login-bg-overlay" />

      {/* Partículas decorativas */}
      <div className="login-particles" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="login-particle" style={{ '--i': i }} />
        ))}
      </div>

      {/* Card de Login */}
      <div className="login-card">
        {/* Topo com ícone e título */}
        <div className="login-card-header">
          <div className="login-rune-icon" aria-hidden="true">⬡</div>
          <h1 className="login-title">O Bosque de Alma</h1>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Adentre os domínios encantados'
              : 'Registre sua presença nos anais do bosque'}
          </p>
        </div>

        {/* Alternador Login / Cadastro */}
        <div className="login-mode-tabs">
          <button
            id="tab-login"
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
            type="button"
          >
            Entrar
          </button>
          <button
            id="tab-register"
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError('') }}
            type="button"
          >
            Criar Conta
          </button>
        </div>

        {/* Formulário */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-label" htmlFor="login-nick">
              <span className="login-label-icon">⚔️</span>
              Nick do Viajante
            </label>
            <input
              id="login-nick"
              className="login-input"
              type="text"
              placeholder="Seu apelido único no bosque"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              autoComplete="username"
              maxLength={30}
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">
              <span className="login-label-icon">🔑</span>
              Senha Arcana
            </label>
            <input
              id="login-password"
              className="login-input"
              type="password"
              placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Sua senha'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              disabled={loading}
            />
          </div>

          {mode === 'register' && (
            <div className="login-field">
              <label className="login-label" htmlFor="login-confirm">
                <span className="login-label-icon">🔐</span>
                Confirmar Senha
              </label>
              <input
                id="login-confirm"
                className="login-input"
                type="password"
                placeholder="Repita a senha arcana"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="login-error" role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            id="login-submit"
            className="login-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <span>{mode === 'login' ? '✦' : '✧'}</span>
                {mode === 'login' ? 'Atravessar o Portal' : 'Inscrever-se no Bosque'}
              </>
            )}
          </button>
        </form>

        <p className="login-footer-note">
          {mode === 'login' ? (
            <>Novo por aqui? <button className="login-link" onClick={() => { setMode('register'); setError('') }} type="button">Crie sua conta</button></>
          ) : (
            <>Já tem acesso? <button className="login-link" onClick={() => { setMode('login'); setError('') }} type="button">Faça login</button></>
          )}
        </p>
      </div>
    </div>
  )
}
