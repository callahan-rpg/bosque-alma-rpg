import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  playAdamStartupSound,
  playAdamScanTick,
  playAdamCompleteSound,
  playAdamWarningSound
} from '../../utils/adamAudio'
import { generateAtmosphereReport } from '../../utils/atmosphereReportEngine'

export default function CyberpunkAtmosphereScanner({ location, onClose }) {
  const { user } = useAuth()

  // Telemetria da localidade
  const atmosphere = location?.atmosphere
  const isAtmosphereAvailable = !!atmosphere && atmosphere.enabled !== false

  // Dados com fallbacks
  const o2 = Number(atmosphere?.o2 ?? 21.01)
  const co2 = Number(atmosphere?.co2 ?? 0.05)
  const n2 = Number(atmosphere?.n2 ?? 78.90)
  const temp = Number(atmosphere?.temp ?? 22.2)
  const press = Number(atmosphere?.press ?? 1.034)
  const rad = Number(atmosphere?.rad ?? 0.20)
  const humid = Number(atmosphere?.humid ?? 45.0)
  const stability = Number(atmosphere?.stability ?? 72)

  // Estado do escaneamento de 1 minuto (60 segundos)
  const [isScanning, setIsScanning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [scanStageText, setScanStageText] = useState('Pronto para amostragem')
  const [generatedReport, setGeneratedReport] = useState(null)
  const [savingReport, setSavingReport] = useState(false)
  const [reportSavedSuccess, setReportSavedSuccess] = useState(false)

  // Drag da janela flutuante
  const [pos, setPos] = useState({
    x: Math.max(20, Math.min(window.innerWidth - 420, window.innerWidth / 2 - 200)),
    y: Math.max(40, window.innerHeight * 0.12)
  })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const panelRef = useRef(null)

  // Toca som de inicialização ao abrir
  useEffect(() => {
    if (isAtmosphereAvailable) {
      playAdamStartupSound()
    } else {
      playAdamWarningSound()
    }
  }, [isAtmosphereAvailable])

  // Lógica de Drag no cabeçalho
  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  useEffect(() => {
    function onMouseMove(e) {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx
        const dy = e.clientY - dragStart.current.my
        const panel = panelRef.current
        const maxX = panel ? window.innerWidth - panel.offsetWidth : 9999
        const maxY = panel ? window.innerHeight - panel.offsetHeight : 9999
        setPos({
          x: Math.max(0, Math.min(dragStart.current.px + dx, maxX)),
          y: Math.max(0, Math.min(dragStart.current.py + dy, maxY))
        })
      }
    }
    function onMouseUp() {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Timer de 1 minuto (60 segundos)
  useEffect(() => {
    let timer = null
    if (isScanning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1

          // Toca bipe sutil a cada 5 segundos
          if (next % 5 === 0 && next > 0) {
            playAdamScanTick()
          }

          // Atualiza texto de telemetria conforme o progresso
          const elapsed = 60 - next
          if (elapsed < 12) {
            setScanStageText('Sincronizando espectrômetro de plasma molecular...')
          } else if (elapsed < 25) {
            setScanStageText('Coletando densidade gasosa e frações de O₂ / CO₂...')
          } else if (elapsed < 38) {
            setScanStageText('Calculando pressão barométrica e isótopos de radiação...')
          } else if (elapsed < 50) {
            setScanStageText('Cruzando telemetria com biomarcadores padrão Terra...')
          } else {
            setScanStageText('Compilando relatório e protocolos de respirabilidade...')
          }

          return next
        })
      }, 1000)
    } else if (isScanning && timeLeft === 0) {
      // 1 minuto completo! Conclui o relatório
      setIsScanning(false)
      playAdamCompleteSound()

      const report = generateAtmosphereReport(
        { o2, co2, n2, temp, press, rad, humid, stability },
        location?.name || 'Localidade Espacial'
      )
      setGeneratedReport(report)
      saveReportToCharacterSheet(report)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isScanning, timeLeft, o2, co2, n2, temp, press, rad, humid, stability, location?.name])

  // Iniciar geração de relatório
  const handleStartReport = () => {
    if (isScanning) return
    setIsScanning(true)
    setTimeLeft(60)
    setGeneratedReport(null)
    setReportSavedSuccess(false)
    playAdamStartupSound()
  }

  // Salvar relatório na ficha do personagem
  const saveReportToCharacterSheet = async (report) => {
    if (!user?.uid) return
    setSavingReport(true)
    try {
      const charRef = doc(db, 'cyberpunk_characters', user.uid)
      const snap = await getDoc(charRef)
      if (snap.exists()) {
        await updateDoc(charRef, {
          atmosphericReports: arrayUnion(report)
        })
      }
      setReportSavedSuccess(true)
      window.dispatchEvent(new CustomEvent('cyberpunk_report_saved', { detail: { report } }))
    } catch (err) {
      console.warn('[A.D.A.M.] Erro ao salvar relatório na ficha:', err)
    } finally {
      setSavingReport(false)
    }
  }

  // Helpers para barras de porcentagem / medidores
  const o2Percent = Math.min(100, Math.max(0, (o2 / 30) * 100))
  const co2Percent = Math.min(100, Math.max(0, (co2 / 5) * 100))
  const n2Percent = Math.min(100, Math.max(0, (n2 / 100) * 100))
  const tempPercent = Math.min(100, Math.max(0, ((temp + 50) / 110) * 100))
  const pressPercent = Math.min(100, Math.max(0, (press / 2.5) * 100))
  const radPercent = Math.min(100, Math.max(0, (rad / 2.0) * 100))
  const humidPercent = Math.min(100, Math.max(0, humid))

  return (
    <div
      ref={panelRef}
      className="adam-scanner-modal"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`
      }}
    >
      {/* Barra de Título Arrastável */}
      <div className="adam-header-drag" onMouseDown={onHeaderMouseDown}>
        <div className="adam-header-title-box">
          <span className="adam-header-icon">📡</span>
          <span className="adam-header-title">A.D.A.M. // ANALISADOR ATMOSFÉRICO</span>
        </div>
        <button
          type="button"
          className="adam-close-btn"
          onClick={onClose}
          title="Fechar Dispositivo (ou digite /adam no chat)"
        >
          ✕
        </button>
      </div>

      {/* Conteúdo Principal do Painel */}
      <div className="adam-body">
        {/* Abas Superiores Idênticas ao Print: PARÂMETROS | ATMOSFÉRICO */}
        <div className="adam-top-tabs">
          <div className="adam-tab-item inactive">
            <span>PARÂMETROS</span>
          </div>
          <div className="adam-tab-item active">
            <span>ATMOSFÉRICO</span>
          </div>
        </div>

        {/* Sub-Header: ANÁLISE ATMOSFÉRICA • AO VIVO */}
        <div className="adam-subheader-row">
          <span className="adam-sub-title">ANÁLISE ATMOSFÉRICA</span>
          {isAtmosphereAvailable ? (
            <span className="adam-live-indicator">
              <span className="adam-live-dot" /> AO VIVO
            </span>
          ) : (
            <span className="adam-offline-indicator">
              <span className="adam-offline-dot" /> SEM SINAL
            </span>
          )}
        </div>

        {/* Separador */}
        <div className="adam-divider-line" />

        {/* CASO 1: Localidade SEM dados atmosféricos cadastrados */}
        {!isAtmosphereAvailable ? (
          <div className="adam-no-signal-box">
            <div className="adam-no-signal-icon">⚠️</div>
            <h4 className="adam-no-signal-title">SEM TELEMETRIA NESTE SETOR</h4>
            <p className="adam-no-signal-desc">
              Os sensores espectrais do A.D.A.M. não detectam uma atmosfera planetária aberta mapeada neste local.
              Este setor pode ser hermeticamente isolado ou não conter dados cadastrados pela administração.
            </p>
            <div className="adam-no-signal-tip">
              💡 <em>Dica: Fale com o mestre ou configure os dados desta localidade no painel administrativo.</em>
            </div>
          </div>
        ) : (
          /* CASO 2: Localidade COM dados atmosféricos cadastrados (Layout Idêntico ao Print) */
          <>
            <div className="adam-metrics-grid">
              {/* O2 */}
              <div className="adam-metric-row">
                <span className="adam-metric-label">O₂</span>
                <div className="adam-bar-track">
                  <div
                    className="adam-bar-fill fill-cyan"
                    style={{ width: `${o2Percent}%` }}
                  />
                </div>
                <span className="adam-metric-val val-cyan">{o2.toFixed(2)}%</span>
              </div>

              {/* CO2 */}
              <div className="adam-metric-row">
                <span className="adam-metric-label">CO₂</span>
                <div className="adam-bar-track">
                  <div
                    className="adam-bar-fill fill-orange"
                    style={{ width: `${co2Percent}%` }}
                  />
                </div>
                <span className="adam-metric-val val-orange">{co2.toFixed(2)}%</span>
              </div>

              {/* N2 */}
              <div className="adam-metric-row">
                <span className="adam-metric-label">N₂</span>
                <div className="adam-bar-track">
                  <div
                    className="adam-bar-fill fill-gray"
                    style={{ width: `${n2Percent}%` }}
                  />
                </div>
                <span className="adam-metric-val val-gray">{n2.toFixed(2)}%</span>
              </div>

              {/* TEMP */}
              <div className="adam-metric-row">
                <span className="adam-metric-label">TEMP</span>
                <div className="adam-bar-track">
                  <div
                    className="adam-bar-fill fill-orange"
                    style={{ width: `${tempPercent}%` }}
                  />
                </div>
                <span className="adam-metric-val val-orange">{temp.toFixed(1)}°C</span>
              </div>

              {/* PRESS */}
              <div className="adam-metric-row">
                <span className="adam-metric-label">PRESS</span>
                <div className="adam-bar-track">
                  <div
                    className="adam-bar-fill fill-cyan"
                    style={{ width: `${pressPercent}%` }}
                  />
                </div>
                <span className="adam-metric-val val-cyan">{press.toFixed(3)} atm</span>
              </div>

              {/* RAD */}
              <div className="adam-metric-row">
                <span className="adam-metric-label">RAD</span>
                <div className="adam-bar-track">
                  <div
                    className="adam-bar-fill fill-green"
                    style={{ width: `${radPercent}%` }}
                  />
                </div>
                <span className="adam-metric-val val-green">{rad.toFixed(2)} mSv/h</span>
              </div>

              {/* HUMID */}
              <div className="adam-metric-row">
                <span className="adam-metric-label">HUMID</span>
                <div className="adam-bar-track">
                  <div
                    className="adam-bar-fill fill-cyan"
                    style={{ width: `${humidPercent}%` }}
                  />
                </div>
                <span className="adam-metric-val val-cyan">{humid.toFixed(1)}%</span>
              </div>
            </div>

            {/* Separador */}
            <div className="adam-divider-line" />

            {/* Rodapé: ESTABILIDADE GERAL */}
            <div className="adam-stability-row">
              <span className="adam-stability-label">ESTABILIDADE GERAL</span>
              <span className="adam-stability-val">{stability}%</span>
            </div>

            {/* Seção de Ação: Gerar Relatório com 1 Minuto */}
            <div className="adam-action-area">
              {!isScanning && !generatedReport && (
                <button
                  type="button"
                  className="adam-generate-btn"
                  onClick={handleStartReport}
                  title="Inicia varredura profunda de 1 minuto e compila relatório comparativo com a Terra"
                >
                  ⚡ GERAR RELATÓRIO ATMOSFÉRICO (1 MIN)
                </button>
              )}

              {/* Barra de Progresso de 1 minuto */}
              {isScanning && (
                <div className="adam-scanning-box">
                  <div className="adam-scanning-header">
                    <span className="adam-scanning-spinner">⬡</span>
                    <span className="adam-scanning-title">ESCANEAMENTO ESPECTROMÉTRICO EM CURSO</span>
                    <span className="adam-scanning-timer">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="adam-scan-progress-bar">
                    <div
                      className="adam-scan-progress-fill"
                      style={{ width: `${((60 - timeLeft) / 60) * 100}%` }}
                    />
                  </div>

                  <div className="adam-scanning-log">
                    <span className="log-prefix">&gt;</span> {scanStageText}
                  </div>
                </div>
              )}
            </div>

            {/* Relatório Gerado (Aparece abaixo do painel) */}
            {generatedReport && (
              <div className="adam-report-dossier">
                <div className="adam-report-header">
                  <div className="adam-report-badge" style={{ borderColor: generatedReport.badgeColor, color: generatedReport.badgeColor }}>
                    ● {generatedReport.classification}
                  </div>
                  {reportSavedSuccess && (
                    <span className="adam-saved-tag">
                      ✓ Salvo na Ficha de Personagem
                    </span>
                  )}
                </div>

                <p className="adam-report-verdict">
                  {generatedReport.generalVerdict}
                </p>

                {/* Tabela Comparativa com a Terra */}
                <div className="adam-report-table-wrapper">
                  <table className="adam-report-table">
                    <thead>
                      <tr>
                        <th>Parâmetro</th>
                        <th>Este Planeta</th>
                        <th>Padrão Terra</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedReport.comparisons.map((c, idx) => (
                        <tr key={idx}>
                          <td className="bold">{c.param}</td>
                          <td className="mono">{c.value}</td>
                          <td className="dim">{c.earth}</td>
                          <td className="status-cell">{c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Riscos Biológicos */}
                {generatedReport.risks.length > 0 && (
                  <div className="adam-report-section">
                    <h5 className="adam-section-title text-red">⚠️ RISCOS BIOLÓGICOS DETECTADOS</h5>
                    <ul className="adam-bullet-list">
                      {generatedReport.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cuidados e Equipamentos Obrigatórios */}
                {generatedReport.precautions.length > 0 && (
                  <div className="adam-report-section">
                    <h5 className="adam-section-title text-cyan">🛡️ CUIDADOS E PROTOCOLOS OBRIGATÓRIOS</h5>
                    <ul className="adam-bullet-list">
                      {generatedReport.precautions.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="adam-report-footer">
                  <button
                    type="button"
                    className="adam-btn-rescan"
                    onClick={handleStartReport}
                  >
                    🔄 Realizar Nova Amostragem
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

