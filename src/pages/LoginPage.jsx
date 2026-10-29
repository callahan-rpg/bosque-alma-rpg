import { useState } from 'react'
import { registerWithNick, loginWithNick, resetPasswordWithNick } from '../firebase/auth'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [nick, setNick] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setSuccessMsg('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await loginWithNick(nick, password)
      } else if (mode === 'register') {
        await registerWithNick(nick, password)
      } else if (mode === 'reset') {
        const loggedUser = await resetPasswordWithNick(nick, password)
        if (loggedUser) {
          setSuccessMsg('Chave arcana renovada! Entrando no bosque...')
        } else {
          // Senha foi alterada com sucesso no RTDB
          setSuccessMsg('Nova senha definida com sucesso! Faça login para continuar.')
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        }
      }
      // AuthContext detecta a mudança de estado e redireciona automaticamente
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
          <div className="login-rune-icon" aria-hidden="true">
            {mode === 'reset' ? '🗝️' : '⬡'}
          </div>
          <h1 className="login-title">O Bosque de Alma</h1>
          <p className="login-subtitle">
            {mode === 'login' && 'Adentre os domínios encantados'}
            {mode === 'register' && 'Registre sua presença nos anais do bosque'}
            {mode === 'reset' && 'Defina uma nova chave arcana para o seu viajante'}
          </p>
        </div>

        {/* Alternador Login / Cadastro / Nova Senha */}
        <div className="login-mode-tabs">
          <button
            id="tab-login"
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            Entrar
          </button>
          <button
            id="tab-register"
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            Criar Conta
          </button>
          <button
            id="tab-reset"
            className={`login-tab ${mode === 'reset' ? 'active' : ''}`}
            onClick={() => switchMode('reset')}
            type="button"
          >
            Nova Senha
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
              {mode === 'reset' ? 'Nova Senha Arcana' : 'Senha Arcana'}
            </label>
            <input
              id="login-password"
              className="login-input"
              type="password"
              placeholder={mode === 'login' ? 'Sua senha' : 'Mínimo 6 caracteres'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              disabled={loading}
            />
          </div>

          {(mode === 'register' || mode === 'reset') && (
            <div className="login-field">
              <label className="login-label" htmlFor="login-confirm">
                <span className="login-label-icon">🔐</span>
                {mode === 'reset' ? 'Confirmar Nova Senha' : 'Confirmar Senha'}
              </label>
              <input
                id="login-confirm"
                className="login-input"
                type="password"
                placeholder={mode === 'reset' ? 'Repita a nova senha arcana' : 'Repita a senha arcana'}
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

          {successMsg && (
            <div className="login-success" role="status">
              <span>✨</span> {successMsg}
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
                <span>
                  {mode === 'login' ? '✦' : mode === 'register' ? '✧' : '🗝️'}
                </span>
                {mode === 'login' && 'Atravessar o Portal'}
                {mode === 'register' && 'Inscrever-se no Bosque'}
                {mode === 'reset' && 'Forjar Nova Senha'}
              </>
            )}
          </button>
        </form>

        <div className="login-footer-note">
          {mode === 'login' && (
            <>
              <div>
                Novo por aqui?{' '}
                <button
                  className="login-link"
                  onClick={() => switchMode('register')}
                  type="button"
                >
                  Crie sua conta
                </button>
              </div>
              <div style={{ marginTop: '0.4rem' }}>
                Esqueceu a chave?{' '}
                <button
                  className="login-link"
                  onClick={() => switchMode('reset')}
                  type="button"
                >
                  Definir nova senha
                </button>
              </div>
            </>
          )}

          {mode === 'register' && (
            <div>
              Já tem acesso?{' '}
              <button
                className="login-link"
                onClick={() => switchMode('login')}
                type="button"
              >
                Faça login
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div>
              Lembrou sua senha?{' '}
              <button
                className="login-link"
                onClick={() => switchMode('login')}
                type="button"
              >
                Voltar para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
