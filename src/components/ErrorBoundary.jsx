import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro capturado na aplicação:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'radial-gradient(ellipse at center, #1b1329 0%, #09070d 100%)',
          color: '#f5f3f7',
          fontFamily: "'Cinzel', serif, sans-serif",
          textAlign: 'center',
          zIndex: 99999
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            filter: 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.5))'
          }}>
            🔮
          </div>
          <h1 style={{
            fontSize: '1.8rem',
            marginBottom: '12px',
            letterSpacing: '0.05em',
            color: '#c084fc'
          }}>
            Perturbação no Véu do Reino
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#b4a8d4',
            maxWidth: '480px',
            marginBottom: '24px',
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.6
          }}>
            Ocorreu uma instabilidade mágica ao carregar este reino. Clique abaixo para tentar restaurar a conexão cósmica.
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: '0.75rem',
              color: '#f87171',
              background: 'rgba(0,0,0,0.5)',
              padding: '10px 16px',
              borderRadius: '8px',
              maxWidth: '90vw',
              overflowX: 'auto',
              marginBottom: '20px',
              fontFamily: 'monospace'
            }}>
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
              border: '1px solid #a855f7',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
              transition: 'all 0.2s ease',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            ↺ Recarregar Reino
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
