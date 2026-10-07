import { useState, useEffect } from 'react'
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { uploadImageFree } from '../utils/imageUpload'
import { calculateMaxHp, calculateMaxVigor, ATTRIBUTE_ICONS, COMBAT_STATUS_EFFECTS } from '../utils/combatSystem'

const CLIMATE_OPTIONS = [
  { value: 'none', label: 'Nenhum Efeito (Clima Estável)', icon: '🌿' },
  { value: 'snowy', label: 'Nevando (Véu da Geada)', icon: '❄️' },
  { value: 'foggy', label: 'Névoa / Neblina Rasteira (Brejo)', icon: '🌫️' },
  { value: 'rainy', label: 'Chovendo', icon: '🌧️' },
  { value: 'storm', label: 'Tempestade Arcana com Chuva e Relâmpagos', icon: '⛈️' },
  { value: 'lightning', label: 'Tempestade de Raios (Apenas Raios / Sem Chuva)', icon: '⚡' },
  { value: 'lava', label: 'Fagulhas & Lava Ardente (Calor Extremo)', icon: '🌋' },
]

const COMPENDIUM_CATEGORIES = [
  { id: 'criaturas', label: 'Criaturas (Bestiário)', icon: '🐺' },
  { id: 'plantas_fungos', label: 'Plantas & Fungos (Herbário)', icon: '🌿' },
  { id: 'pocoes', label: 'Poções (Alquimia)', icon: '🧪' },
]

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Admin() {
  const navigate = useNavigate()
  const { isMaster, role } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('jardim_master_auth') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (isMaster || role === 'master' || role === 'admin') {
      setIsAuthenticated(true)
      sessionStorage.setItem('jardim_master_auth', 'true')
    }
  }, [isMaster, role])

  // Aba ativa no Admin: 'locations', 'compendium', 'tempo' ou 'combate'
  const [adminTab, setAdminTab] = useState('locations')

  // ==========================================
  // ESTADOS DE COMBATE (MESA TÁTICA)
  // ==========================================
  const [selectedCombatSlug, setSelectedCombatSlug] = useState('crepusculo')
  const [combatTitle, setCombatTitle] = useState('Confronto em Andamento')
  const [selectedCombatPlayers, setSelectedCombatPlayers] = useState([])
  const [combatEnemies, setCombatEnemies] = useState([])
  const [activeCombatData, setActiveCombatData] = useState(null)
  const [allPlayersList, setAllPlayersList] = useState([])
  const [saveCombatStatus, setSaveCombatStatus] = useState('')

  // Formulário para adicionar novo inimigo (sem monstros padrões)
  const [newEnemyForm, setNewEnemyForm] = useState({
    name: '',
    icon: '👹',
    avatarUrl: '',
    maxHp: 50,
    maxVigor: 10,
    forca: 10,
    destreza: 10,
    poder: 10,
    sabedoria: 10,
    vitalidade: 10,
    isBoss: false
  })

  // ==========================================
  // ESTADOS DE TEMPO & ESTAÇÃO
  // ==========================================
  const [timeMode, setTimeMode]     = useState('dynamic')   // 'dynamic' | 'manual'
  const [timeValue, setTimeValue]   = useState('10:00')   // HH:MM horário base configurado
  const [timeSpeed, setTimeSpeed]   = useState(1)          // 1 = tempo real, 2 = 2x, 4 = 4x
  const [timeSeason, setTimeSeason] = useState('autumn')  // override de estação
  const [timeMoon, setTimeMoon]     = useState('full')    // override de fase da lua
  const [saveTimeStatus, setSaveTimeStatus] = useState('')
  const [clearingDice, setClearingDice] = useState(false)
  const [clearDiceStatus, setClearDiceStatus] = useState('')

  // ==========================================
  // ESTADOS DE LOCALIDADES & CONFIGURAÇÕES GLOBAIS
  // ==========================================
  const [defaultLocation, setDefaultLocation] = useState('crepusculo')
  const [saveDefaultLocStatus, setSaveDefaultLocStatus] = useState('')
  const [locations, setLocations] = useState([])
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [saveLocStatus, setSaveLocStatus] = useState('')
  const [uploadingLocBg, setUploadingLocBg] = useState(false)

  const [formSlug, setFormSlug] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formBg, setFormBg] = useState('')
  const [formSound, setFormSound] = useState('')
  const [formClimate, setFormClimate] = useState('none')
  const [formMinTemp, setFormMinTemp] = useState('')
  const [formMaxTemp, setFormMaxTemp] = useState('')
  const [formWindSpeed, setFormWindSpeed] = useState('')
  const [formNavButtons, setFormNavButtons] = useState([])

  // ==========================================
  // ESTADOS DO COMPÊNDIO
  // ==========================================
  const [compendiumList, setCompendiumList] = useState([])
  const [selectedCompEntry, setSelectedCompEntry] = useState(null)
  const [compCategoryFilter, setCompCategoryFilter] = useState('all')
  const [saveCompStatus, setSaveCompStatus] = useState('')
  const [uploadingCompImg, setUploadingCompImg] = useState(false)

  const [compName, setCompName] = useState('')
  const [compCategory, setCompCategory] = useState('criaturas')
  const [compSubcategory, setCompSubcategory] = useState('')
  const [compImageUrl, setCompImageUrl] = useState('')
  const [compHeightWeight, setCompHeightWeight] = useState('')
  const [compArmorClass, setCompArmorClass] = useState(10)
  const [compHp, setCompHp] = useState(100)
  const [compMp, setCompMp] = useState(50)
  const [compSpecies, setCompSpecies] = useState('')
  const [compRiskLevel, setCompRiskLevel] = useState(3)
  const [compMatingSeason, setCompMatingSeason] = useState('')
  const [compHabitat, setCompHabitat] = useState('')
  const [compCanRationalize, setCompCanRationalize] = useState(false)
  const [compPassive1Name, setCompPassive1Name] = useState('')
  const [compPassive1Desc, setCompPassive1Desc] = useState('')
  const [compPassive2Name, setCompPassive2Name] = useState('')
  const [compPassive2Desc, setCompPassive2Desc] = useState('')
  const [compActiveName, setCompActiveName] = useState('')
  const [compActiveDesc, setCompActiveDesc] = useState('')
  const [compQuote, setCompQuote] = useState('')
  const [compQuoteAuthor, setCompQuoteAuthor] = useState('')
  const [compDescription, setCompDescription] = useState('')
  const [compTactics, setCompTactics] = useState('')
  const [compWeaknesses, setCompWeaknesses] = useState([])
  const [compStats, setCompStats] = useState({
    forca: 10,
    destreza: 10,
    poder: 10,
    sabedoria: 10,
    carisma: 10,
    vitalidade: 10
  })
  const [compDrops, setCompDrops] = useState([])
  const [compAttributes, setCompAttributes] = useState([])
  const [compendiumGlobalBg, setCompendiumGlobalBg] = useState('')
  const [uploadingGlobalBg, setUploadingGlobalBg] = useState(false)
  const [saveGlobalBgStatus, setSaveGlobalBgStatus] = useState('')

  const MASTER_PIN = import.meta.env.VITE_ADMIN_PIN || 'alma2026'

  const handleLogin = (e) => {
    e.preventDefault()
    const validPins = [MASTER_PIN, 'alma2026', 'alma2024', 'admin']
    if (validPins.includes(pinInput.trim())) {
      setIsAuthenticated(true)
      sessionStorage.setItem('jardim_master_auth', 'true')
      setAuthError('')
    } else {
      setAuthError('Chave de Mestre incorreta.')
    }
  }

  // Escuta Localidades
  useEffect(() => {
    if (!isAuthenticated) return
    const unsub = onSnapshot(collection(db, 'locations'), (snap) => {
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [isAuthenticated])

  // Escuta Compêndio e Configurações
  useEffect(() => {
    if (!isAuthenticated) return
    const unsubComp = onSnapshot(collection(db, 'compendium_entries'), (snap) => {
      setCompendiumList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsubConfig = onSnapshot(doc(db, 'settings', 'compendium_config'), (snap) => {
      if (snap.exists() && snap.data().backgroundImage) {
        setCompendiumGlobalBg(snap.data().backgroundImage)
      }
    })
    // Escuta configurações globais (tempo, estação, localidade padrão)
    const unsubTime = onSnapshot(doc(db, 'settings', 'game_config'), (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        if (d.defaultLocation)      setDefaultLocation(d.defaultLocation)
        if (d.time?.mode)           setTimeMode(d.time.mode)
        if (d.time?.value || d.time?.currentTime) setTimeValue(d.time.value || d.time.currentTime)
        if (d.time?.speedRatio)     setTimeSpeed(Number(d.time.speedRatio))
        if (d.time?.seasonOverride) setTimeSeason(d.time.seasonOverride)
        if (d.time?.moonOverride)   setTimeMoon(d.time.moonOverride)
      }
    })
    // Escuta lista de jogadores para a seleção de combate
    const unsubPlayers = onSnapshot(collection(db, 'players'), (snap) => {
      setAllPlayersList(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
    })

    return () => {
      unsubComp()
      unsubConfig()
      unsubTime()
      unsubPlayers()
    }
  }, [isAuthenticated])

  // Escuta dados do combate ativo na localidade selecionada
  useEffect(() => {
    if (!isAuthenticated || !selectedCombatSlug) return
    const unsub = onSnapshot(doc(db, 'active_combats', selectedCombatSlug), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setActiveCombatData(data)
        if (data.active) {
          setCombatTitle(data.title || 'Confronto em Andamento')
          setSelectedCombatPlayers(data.participantUids || [])
          setCombatEnemies(data.enemies || [])
        }
      } else {
        setActiveCombatData(null)
      }
    })
    return () => unsub()
  }, [isAuthenticated, selectedCombatSlug])

  // ==========================================
  // FUNÇÕES DE COMBATE (ADMIN)
  // ==========================================
  const handleAddCustomEnemyToCombat = (e) => {
    if (e) e.preventDefault()
    if (!newEnemyForm.name.trim()) return alert('Informe o nome do inimigo')

    const hp = Number(newEnemyForm.maxHp) || 50
    const vigor = Number(newEnemyForm.maxVigor) || 10
    const enemyObj = {
      id: 'enemy_' + Math.random().toString(36).substring(2, 8),
      name: newEnemyForm.name.trim(),
      icon: newEnemyForm.icon.trim() || '👹',
      avatarUrl: newEnemyForm.avatarUrl.trim(),
      currentHp: hp,
      maxHp: hp,
      currentVigor: vigor,
      maxVigor: vigor,
      attributes: {
        forca: Number(newEnemyForm.forca) || 10,
        destreza: Number(newEnemyForm.destreza) || 10,
        poder: Number(newEnemyForm.poder) || 10,
        sabedoria: Number(newEnemyForm.sabedoria) || 10,
        vitalidade: Number(newEnemyForm.vitalidade) || 10
      },
      status: [],
      isBoss: !!newEnemyForm.isBoss
    }

    setCombatEnemies(prev => [...prev, enemyObj])
    setNewEnemyForm({
      name: '',
      icon: '👹',
      avatarUrl: '',
      maxHp: 50,
      maxVigor: 10,
      forca: 10,
      destreza: 10,
      poder: 10,
      sabedoria: 10,
      vitalidade: 10,
      isBoss: false
    })
  }

  const handleRemoveEnemyFromCombat = (enemyId) => {
    setCombatEnemies(prev => prev.filter(en => en.id !== enemyId))
  }

  const handleStartOrUpdateCombatAdmin = async (e) => {
    if (e) e.preventDefault()
    if (!selectedCombatSlug) return alert('Selecione uma localidade para o combate')
    if (selectedCombatPlayers.length === 0 && combatEnemies.length === 0) {
      return alert('Selecione ao menos 1 personagem ou adicione 1 inimigo para o combate')
    }

    const existingPData = activeCombatData?.participantsData || {}
    const participantsData = {}

    selectedCombatPlayers.forEach(uid => {
      const p = allPlayersList.find(player => player.uid === uid) || {}
      const vit = p.attributes?.vitalidade ?? 10
      const hpMax = p.hpMax || calculateMaxHp(vit)
      const vigorMax = p.vigorMax || calculateMaxVigor(vit)

      participantsData[uid] = {
        ...(existingPData[uid] || {}),
        uid,
        name: p.chatName || p.characterName || p.nick || 'Viajante',
        avatarUrl: p.avatarUrl || '',
        hpCurrent: p.hpCurrent ?? hpMax,
        hpMax,
        vigorCurrent: p.vigorCurrent ?? vigorMax,
        vigorMax,
        attributes: p.attributes || { forca: 10, destreza: 10, poder: 10, sabedoria: 10, vitalidade: 10 },
        level: p.level || 1
      }
    })

    try {
      setSaveCombatStatus('Salvando...')
      const docRef = doc(db, 'active_combats', selectedCombatSlug)
      await setDoc(docRef, {
        active: true,
        locationSlug: selectedCombatSlug,
        title: combatTitle.trim() || 'Confronto em Andamento',
        participantUids: selectedCombatPlayers,
        participantsData,
        enemies: combatEnemies,
        combatLog: activeCombatData?.combatLog || [
          { id: Math.random().toString(36).substring(2), text: `Combate iniciado em ${selectedCombatSlug}!`, timestamp: Date.now() }
        ],
        lastImpact: activeCombatData?.lastImpact || null,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setSaveCombatStatus('✅ Combate sincronizado com sucesso!')
      setTimeout(() => setSaveCombatStatus(''), 3500)
    } catch (err) {
      alert('Erro ao iniciar combate: ' + err.message)
      setSaveCombatStatus('')
    }
  }

  // Estado para inputs customizados de dano/cura no Admin
  const [adminDeltaInputs, setAdminDeltaInputs] = useState({})
  // Estado para comentários de narração em tempo real no Admin
  const [adminPlayerComments, setAdminPlayerComments] = useState({})
  const [adminEnemyComments, setAdminEnemyComments] = useState({})

  const handleAdminSetDeltaInput = (id, val) => {
    setAdminDeltaInputs(prev => ({ ...prev, [id]: val }))
  }

  const handleAdminChangePlayerComment = (uid, text) => {
    setAdminPlayerComments(prev => ({ ...prev, [uid]: text }))
  }

  const handleAdminSavePlayerComment = async (uid) => {
    const pData = activeCombatData?.participantsData?.[uid] || {}
    const pRecord = allPlayersList.find(p => p.uid === uid) || {}
    const currentVal = pData.comment || activeCombatData?.participantComments?.[uid] || pRecord.narrationComment || ''
    const text = (adminPlayerComments[uid] !== undefined ? adminPlayerComments[uid] : currentVal).trim()
    
    if (selectedCombatSlug) {
      const combatRef = doc(db, 'active_combats', selectedCombatSlug)
      const existingPData = activeCombatData?.participantsData || {}
      const curP = existingPData[uid] || {}
      const existingComments = activeCombatData?.participantComments || {}

      const updatedPData = {
        ...existingPData,
        [uid]: {
          ...curP,
          comment: text
        }
      }

      try {
        await updateDoc(combatRef, {
          participantsData: updatedPData,
          participantComments: {
            ...existingComments,
            [uid]: text
          }
        })
      } catch (err) {
        console.error('Erro ao salvar comentário de combate:', err)
      }
    }

    try {
      const playerRef = doc(db, 'players', uid)
      await updateDoc(playerRef, {
        narrationComment: text
      })
    } catch (err) {
      console.error('Erro ao salvar comentário no perfil do jogador:', err)
    }
  }

  const handleAdminChangeEnemyComment = (enemyId, text) => {
    setAdminEnemyComments(prev => ({ ...prev, [enemyId]: text }))
  }

  const handleAdminSaveEnemyComment = async (enemyId) => {
    if (!selectedCombatSlug) return
    const currentEnemies = activeCombatData?.enemies || combatEnemies || []
    const targetEnemy = currentEnemies.find(e => e.id === enemyId)
    const currentVal = targetEnemy?.turnComment || targetEnemy?.comment || ''
    const text = (adminEnemyComments[enemyId] !== undefined ? adminEnemyComments[enemyId] : currentVal).trim()

    const combatRef = doc(db, 'active_combats', selectedCombatSlug)
    const updatedEnemies = currentEnemies.map(en => {
      if (en.id === enemyId) {
        return { ...en, turnComment: text, comment: text }
      }
      return en
    })

    setCombatEnemies(updatedEnemies)
    try {
      await updateDoc(combatRef, {
        enemies: updatedEnemies
      })
    } catch (err) {
      console.error('Erro ao salvar comentário do inimigo:', err)
    }
  }

  // Desconto / Cura de HP em Jogador pelo Admin
  const handleAdminDeltaPlayerHp = async (uid, deltaHp) => {
    if (!selectedCombatSlug) return
    const combatRef = doc(db, 'active_combats', selectedCombatSlug)
    const existingPData = activeCombatData?.participantsData || {}
    const pData = existingPData[uid]
    
    const playerRecord = allPlayersList.find(p => p.uid === uid) || {}
    const vit = pData?.attributes?.vitalidade ?? playerRecord.attributes?.vitalidade ?? 10
    const maxHp = pData?.hpMax || playerRecord.hpMax || calculateMaxHp(vit)
    const currentHp = pData?.hpCurrent ?? playerRecord.hpCurrent ?? maxHp
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + deltaHp))

    const updatedPData = {
      ...existingPData,
      [uid]: {
        ...(pData || {}),
        uid,
        name: pData?.name || playerRecord.chatName || playerRecord.characterName || 'Viajante',
        hpCurrent: nextHp,
        hpMax: maxHp
      }
    }

    const impact = {
      targetId: uid,
      targetType: 'ally',
      amount: -deltaHp,
      type: deltaHp < 0 ? 'damage' : 'heal',
      timestamp: Date.now()
    }

    try {
      await updateDoc(combatRef, {
        participantsData: updatedPData,
        lastImpact: impact
      })

      const pDocRef = doc(db, 'players', uid)
      await updateDoc(pDocRef, {
        hpCurrent: nextHp
      })
    } catch (err) {
      console.error('Erro ao atualizar HP do jogador:', err)
    }
  }

  // Desconto / Recuperação de Vigor em Jogador pelo Admin
  const handleAdminDeltaPlayerVigor = async (uid, deltaVigor) => {
    if (!selectedCombatSlug) return
    const combatRef = doc(db, 'active_combats', selectedCombatSlug)
    const existingPData = activeCombatData?.participantsData || {}
    const pData = existingPData[uid]
    
    const playerRecord = allPlayersList.find(p => p.uid === uid) || {}
    const vit = pData?.attributes?.vitalidade ?? playerRecord.attributes?.vitalidade ?? 10
    const maxVigor = pData?.vigorMax || playerRecord.vigorMax || calculateMaxVigor(vit)
    const currentVigor = pData?.vigorCurrent ?? playerRecord.vigorCurrent ?? maxVigor
    const nextVigor = Math.max(0, Math.min(maxVigor, currentVigor + deltaVigor))

    const updatedPData = {
      ...existingPData,
      [uid]: {
        ...(pData || {}),
        uid,
        name: pData?.name || playerRecord.chatName || playerRecord.characterName || 'Viajante',
        vigorCurrent: nextVigor,
        vigorMax: maxVigor
      }
    }

    try {
      await updateDoc(combatRef, {
        participantsData: updatedPData
      })

      const pDocRef = doc(db, 'players', uid)
      await updateDoc(pDocRef, {
        vigorCurrent: nextVigor
      })
    } catch (err) {
      console.error('Erro ao atualizar Vigor do jogador:', err)
    }
  }

  // Alternar Condição / Status em Jogador pelo Admin
  const handleAdminTogglePlayerStatus = async (uid, statusId) => {
    if (!selectedCombatSlug) return
    const combatRef = doc(db, 'active_combats', selectedCombatSlug)
    const existingPData = activeCombatData?.participantsData || {}
    const pData = existingPData[uid] || {}
    const currentStatus = pData.status || []
    const nextStatus = currentStatus.includes(statusId)
      ? currentStatus.filter(s => s !== statusId)
      : [...currentStatus, statusId]

    const updatedPData = {
      ...existingPData,
      [uid]: {
        ...pData,
        status: nextStatus
      }
    }

    try {
      await updateDoc(combatRef, {
        participantsData: updatedPData
      })
    } catch (err) {
      console.error('Erro ao alternar status do jogador:', err)
    }
  }

  // Desconto / Cura de HP em Inimigo pelo Admin
  const handleAdminDeltaEnemyHp = async (enemyId, deltaHp) => {
    if (!selectedCombatSlug) return
    const combatRef = doc(db, 'active_combats', selectedCombatSlug)
    const currentEnemies = activeCombatData?.enemies || combatEnemies || []
    const updatedEnemies = currentEnemies.map(en => {
      if (en.id === enemyId) {
        const maxHp = en.maxHp || 50
        const currentHp = en.currentHp ?? maxHp
        const nextHp = Math.max(0, Math.min(maxHp, currentHp + deltaHp))
        return { ...en, currentHp: nextHp }
      }
      return en
    })

    const impact = {
      targetId: enemyId,
      targetType: 'enemy',
      amount: -deltaHp,
      type: deltaHp < 0 ? 'damage' : 'heal',
      timestamp: Date.now()
    }

    setCombatEnemies(updatedEnemies)
    try {
      await updateDoc(combatRef, {
        enemies: updatedEnemies,
        lastImpact: impact
      })
    } catch (err) {
      console.error('Erro ao atualizar HP do inimigo:', err)
    }
  }

  // Desconto / Recuperação de Vigor em Inimigo pelo Admin
  const handleAdminDeltaEnemyVigor = async (enemyId, deltaVigor) => {
    if (!selectedCombatSlug) return
    const combatRef = doc(db, 'active_combats', selectedCombatSlug)
    const currentEnemies = activeCombatData?.enemies || combatEnemies || []
    const updatedEnemies = currentEnemies.map(en => {
      if (en.id === enemyId) {
        const maxVigor = en.maxVigor || 10
        const currentVigor = en.currentVigor ?? maxVigor
        const nextVigor = Math.max(0, Math.min(maxVigor, currentVigor + deltaVigor))
        return { ...en, currentVigor: nextVigor }
      }
      return en
    })

    setCombatEnemies(updatedEnemies)
    try {
      await updateDoc(combatRef, {
        enemies: updatedEnemies
      })
    } catch (err) {
      console.error('Erro ao atualizar Vigor do inimigo:', err)
    }
  }

  // Alternar Condição / Status em Inimigo pelo Admin
  const handleAdminToggleEnemyStatus = async (enemyId, statusId) => {
    if (!selectedCombatSlug) return
    const combatRef = doc(db, 'active_combats', selectedCombatSlug)
    const currentEnemies = activeCombatData?.enemies || combatEnemies || []
    const updatedEnemies = currentEnemies.map(en => {
      if (en.id === enemyId) {
        const currentStatus = en.status || []
        const nextStatus = currentStatus.includes(statusId)
          ? currentStatus.filter(s => s !== statusId)
          : [...currentStatus, statusId]
        return { ...en, status: nextStatus }
      }
      return en
    })

    setCombatEnemies(updatedEnemies)
    try {
      await updateDoc(combatRef, {
        enemies: updatedEnemies
      })
    } catch (err) {
      console.error('Erro ao alternar status do inimigo:', err)
    }
  }

  const handleEndCombatAdmin = async () => {
    if (!confirm('Deseja encerrar o combate nesta sala? O banner desaparecerá para os jogadores.')) return
    try {
      const docRef = doc(db, 'active_combats', selectedCombatSlug)
      await setDoc(docRef, {
        active: false,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      setCombatEnemies([])
      alert('Combate finalizado!')
    } catch (err) {
      alert('Erro ao finalizar combate: ' + err.message)
    }
  }

  // ==========================================
  // FUNÇÕES DE LOCALIDADES
  // ==========================================
  const startNewLocation = () => {
    setSelectedLoc(null)
    setFormSlug('')
    setFormName('')
    setFormDesc('')
    setFormBg('')
    setFormSound('')
    setFormClimate('none')
    setFormMinTemp('')
    setFormMaxTemp('')
    setFormWindSpeed('')
    setFormNavButtons([])
  }

  const selectLocForEdit = (loc) => {
    setSelectedLoc(loc)
    setFormSlug(loc.id || loc.slug)
    setFormName(loc.name || '')
    setFormDesc(loc.description || '')
    setFormBg(loc.backgroundImage || '')
    setFormSound(loc.locationSound || '')
    setFormClimate(loc.weatherCondition || 'none')
    setFormMinTemp(
      loc.minTemp !== undefined && loc.minTemp !== null
        ? loc.minTemp
        : (loc.temperature !== undefined && loc.temperature !== null ? Number(loc.temperature) - 4 : '')
    )
    setFormMaxTemp(
      loc.maxTemp !== undefined && loc.maxTemp !== null
        ? loc.maxTemp
        : (loc.temperature !== undefined && loc.temperature !== null ? Number(loc.temperature) + 4 : '')
    )
    setFormWindSpeed(loc.windSpeed || loc.wind || '')
    setFormNavButtons(loc.navigationButtons || [])
  }

  const handleUploadLocBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLocBg(true)
    try {
      const url = await uploadImageFree(file)
      setFormBg(url)
    } catch (err) {
      alert('Erro no upload para Cloudinary: ' + err.message)
    } finally {
      setUploadingLocBg(false)
    }
  }

  const handleAddNavButton = (pos = 'right') => {
    setFormNavButtons(prev => [...prev, { label: 'Ir para...', targetSlug: '', position: pos }])
  }

  const handleUpdateNavButton = (index, field, value) => {
    setFormNavButtons(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveNavButton = (index) => {
    setFormNavButtons(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveLocation = async (e) => {
    e.preventDefault()
    const cleanSlug = formSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    if (!cleanSlug || !formName.trim()) {
      alert('Preencha o slug identificador e o nome da localidade.')
      return
    }

    setSaveLocStatus('Salvando localidade...')
    try {
      const payload = {
        name: formName.trim(),
        slug: cleanSlug,
        description: formDesc.trim(),
        backgroundImage: formBg.trim(),
        locationSound: formSound.trim(),
        weatherCondition: formClimate,
        minTemp: formMinTemp !== '' ? Number(formMinTemp) : null,
        maxTemp: formMaxTemp !== '' ? Number(formMaxTemp) : null,
        temperature: (formMinTemp !== '' && formMaxTemp !== '')
          ? Math.round((Number(formMinTemp) + Number(formMaxTemp)) / 2)
          : (formMinTemp !== '' ? Number(formMinTemp) : (formMaxTemp !== '' ? Number(formMaxTemp) : null)),
        windSpeed: formWindSpeed.trim() || null,
        navigationButtons: formNavButtons.filter(b => b.targetSlug.trim()),
        updatedAt: Date.now()
      }

      await setDoc(doc(db, 'locations', cleanSlug), payload, { merge: true })
      setSaveLocStatus('Localidade salva com sucesso!')
      setTimeout(() => setSaveLocStatus(''), 2500)
    } catch (err) {
      console.error(err)
      setSaveLocStatus('Erro ao salvar localidade.')
    }
  }

  const handleDeleteLocation = async (slugToDelete) => {
    if (!window.confirm(`Tem certeza que deseja apagar a localidade "${slugToDelete}"?`)) return
    try {
      await deleteDoc(doc(db, 'locations', slugToDelete))
      if (selectedLoc?.id === slugToDelete) {
        startNewLocation()
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir localidade.')
    }
  }

  const handleSetDefaultLocation = async (slug) => {
    const targetSlug = slug || formSlug
    if (!targetSlug) {
      alert('Selecione ou salve uma localidade válida primeiro.')
      return
    }
    setSaveDefaultLocStatus('Definindo localidade padrão...')
    try {
      await setDoc(doc(db, 'settings', 'game_config'), {
        defaultLocation: targetSlug,
        updatedAt: serverTimestamp()
      }, { merge: true })
      setDefaultLocation(targetSlug)
      localStorage.setItem('bosque_default_location', targetSlug)
      setSaveDefaultLocStatus(`⭐ "${targetSlug}" é agora a entrada principal do Bosque!`)
      setTimeout(() => setSaveDefaultLocStatus(''), 3500)
    } catch (err) {
      console.error(err)
      setSaveDefaultLocStatus('❌ Erro ao salvar localidade padrão.')
    }
  }

  // ==========================================
  // FUNÇÕES DO COMPÊNDIO
  // ==========================================
  const startNewCompEntry = () => {
    setSelectedCompEntry(null)
    setCompName('')
    setCompCategory('criaturas')
    setCompSubcategory('')
    setCompImageUrl('')
    setCompHeightWeight('')
    setCompArmorClass(10)
    setCompHp(100)
    setCompMp(50)
    setCompSpecies('')
    setCompRiskLevel(3)
    setCompMatingSeason('')
    setCompHabitat('')
    setCompCanRationalize(false)
    setCompPassive1Name('')
    setCompPassive1Desc('')
    setCompPassive2Name('')
    setCompPassive2Desc('')
    setCompActiveName('')
    setCompActiveDesc('')
    setCompQuote('')
    setCompQuoteAuthor('')
    setCompDescription('')
    setCompTactics('')
    setCompWeaknesses([])
    setCompStats({
      forca: 10,
      destreza: 10,
      poder: 10,
      sabedoria: 10,
      carisma: 10,
      vitalidade: 10
    })
    setCompDrops([])
  }

  const selectCompEntryForEdit = (entry) => {
    setSelectedCompEntry(entry)
    setCompName(entry.name || '')
    setCompCategory(entry.category || 'criaturas')
    setCompSubcategory(entry.subcategory || '')
    setCompImageUrl(entry.imageUrl || '')
    setCompHeightWeight(entry.heightWeight || '')
    setCompArmorClass(entry.armorClass ?? entry.ca ?? 10)
    setCompHp(entry.hp ?? 100)
    setCompMp(entry.mp ?? 50)
    setCompSpecies(entry.species || entry.classe || '')
    setCompRiskLevel(entry.riskLevel ?? 3)
    setCompMatingSeason(entry.matingSeason || '')
    setCompHabitat(entry.habitat || '')
    setCompCanRationalize(entry.canRationalize ?? (entry.stats?.sabedoria !== null && entry.stats?.sabedoria !== undefined))
    setCompPassive1Name(entry.abilities?.passive1?.name || '')
    setCompPassive1Desc(entry.abilities?.passive1?.desc || '')
    setCompPassive2Name(entry.abilities?.passive2?.name || '')
    setCompPassive2Desc(entry.abilities?.passive2?.desc || '')
    setCompActiveName(entry.abilities?.active?.name || '')
    setCompActiveDesc(entry.abilities?.active?.desc || '')
    setCompQuote(entry.quote || '')
    setCompQuoteAuthor(entry.quoteAuthor || '')
    setCompDescription(entry.description || '')
    setCompTactics(entry.tactics || '')
    setCompWeaknesses(entry.weaknesses || entry.attributes || [])
    setCompStats({
      forca: entry.stats?.forca ?? 10,
      destreza: entry.stats?.destreza ?? 10,
      poder: entry.stats?.poder ?? 10,
      sabedoria: entry.stats?.sabedoria ?? 10,
      carisma: entry.stats?.carisma ?? 10,
      vitalidade: entry.stats?.vitalidade ?? 10,
    })
    setCompDrops(entry.drops || [])
  }

  const handleUploadCompImg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCompImg(true)
    try {
      const url = await uploadImageFree(file)
      setCompImageUrl(url)
    } catch (err) {
      alert('Erro no upload para Cloudinary: ' + err.message)
    } finally {
      setUploadingCompImg(false)
    }
  }

  const handleAddWeakness = () => {
    setCompWeaknesses(prev => [...prev, { label: 'Nova Fraqueza', icon: '⚡' }])
  }

  const handleUpdateWeakness = (index, field, value) => {
    setCompWeaknesses(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveWeakness = (index) => {
    setCompWeaknesses(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddDrop = () => {
    setCompDrops(prev => [...prev, { name: '', chance: 'Comum', icon: compCategory === 'plantas_fungos' ? '🌸' : '💎' }])
  }

  const handleUpdateDrop = (index, field, value) => {
    setCompDrops(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveDrop = (index) => {
    setCompDrops(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateStat = (key, value) => {
    setCompStats(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSaveCompEntry = async (e) => {
    e.preventDefault()
    if (!compName.trim()) {
      alert('Preencha o nome do registro do compêndio.')
      return
    }

    setSaveCompStatus('Salvando compêndio...')
    try {
      const payload = {
        name: compName.trim(),
        category: compCategory,
        subcategory: compSubcategory.trim(),
        imageUrl: compImageUrl.trim(),
        heightWeight: compHeightWeight.trim(),
        armorClass: Number(compArmorClass) || 10,
        ca: Number(compArmorClass) || 10,
        hp: Number(compHp) || 100,
        mp: Number(compMp) || 0,
        species: compSpecies.trim(),
        classe: compSpecies.trim(),
        riskLevel: Math.max(0, Math.min(5, Number(compRiskLevel) || 0)),
        matingSeason: compMatingSeason.trim(),
        habitat: compHabitat.trim(),
        canRationalize: Boolean(compCanRationalize),
        quote: compQuote.trim(),
        quoteAuthor: compQuoteAuthor.trim(),
        description: compDescription.trim(),
        tactics: compTactics.trim(),
        weaknesses: compWeaknesses.filter(a => a.label?.trim()),
        attributes: compWeaknesses.filter(a => a.label?.trim()),
        stats: {
          forca: Number(compStats.forca) || 0,
          destreza: Number(compStats.destreza) || 0,
          poder: Number(compStats.poder) || 0,
          sabedoria: compCanRationalize ? (Number(compStats.sabedoria) || 0) : null,
          carisma: Number(compStats.carisma) || 0,
          vitalidade: Number(compStats.vitalidade) || 0,
        },
        abilities: {
          passive1: { name: compPassive1Name.trim(), desc: compPassive1Desc.trim() },
          passive2: { name: compPassive2Name.trim(), desc: compPassive2Desc.trim() },
          active: { name: compActiveName.trim(), desc: compActiveDesc.trim() },
        },
        drops: compDrops.filter(d => (typeof d === 'string' ? d.trim() : d.name?.trim())),
        updatedAt: serverTimestamp()
      }

      if (selectedCompEntry?.id) {
        await setDoc(doc(db, 'compendium_entries', selectedCompEntry.id), payload, { merge: true })
      } else {
        await addDoc(collection(db, 'compendium_entries'), {
          ...payload,
          createdAt: serverTimestamp()
        })
      }

      setSaveCompStatus('Registro salvo com sucesso no Compêndio!')
      setTimeout(() => setSaveCompStatus(''), 2500)
    } catch (err) {
      console.error(err)
      setSaveCompStatus('Erro ao salvar no Compêndio.')
    }
  }

  const handleSaveGlobalCompBg = async (e) => {
    e?.preventDefault()
    setSaveGlobalBgStatus('Salvando fundo...')
    try {
      await setDoc(doc(db, 'settings', 'compendium_config'), {
        backgroundImage: compendiumGlobalBg.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      setSaveGlobalBgStatus('Imagem de fundo do Compêndio salva com sucesso!')
      setTimeout(() => setSaveGlobalBgStatus(''), 3000)
    } catch (err) {
      console.error(err)
      setSaveGlobalBgStatus('Erro ao salvar fundo do Compêndio.')
    }
  }

  const handleUploadGlobalCompBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingGlobalBg(true)
    try {
      const url = await uploadImageFree(file)
      setCompendiumGlobalBg(url)
      await setDoc(doc(db, 'settings', 'compendium_config'), {
        backgroundImage: url,
        updatedAt: serverTimestamp()
      }, { merge: true })
      setSaveGlobalBgStatus('Imagem enviada e salva com sucesso!')
      setTimeout(() => setSaveGlobalBgStatus(''), 3000)
    } catch (err) {
      alert('Erro ao enviar imagem: ' + err.message)
    } finally {
      setUploadingGlobalBg(false)
    }
  }

  const handleDeleteCompEntry = async (entryId) => {
    if (!window.confirm('Tem certeza que deseja apagar este registro do Compêndio?')) return
    try {
      await deleteDoc(doc(db, 'compendium_entries', entryId))
      if (selectedCompEntry?.id === entryId) {
        startNewCompEntry()
      }
    } catch (err) {
      alert('Erro ao excluir do Compêndio: ' + err.message)
    }
  }

  const filteredCompendium = compendiumList.filter(item => {
    if (compCategoryFilter === 'all') return true
    return item.category === compCategoryFilter
  })

  // ==========================================
  // FUNÇÕES DE TEMPO & ESTAÇÃO
  // ==========================================
  const handleSetCurrentRealTime = () => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setTimeValue(`${hh}:${mm}`)
  }

  const handleSaveTimeConfig = async (e) => {
    e.preventDefault()
    setSaveTimeStatus('Salvando...')
    try {
      const [hStr, mStr] = String(timeValue || '10:00').split(':')
      const baseHour = parseInt(hStr || '10', 10) || 10
      const baseMinute = parseInt(mStr || '00', 10) || 0
      const isDay = baseHour >= 6 && baseHour < 19

      const payload = {
        time: {
          mode: timeMode,
          value: timeValue,
          currentTime: timeValue,
          baseHour,
          baseMinute,
          baseEpochMs: Date.now(),
          speedRatio: Number(timeSpeed) || 1,
          period: isDay ? 'day' : 'night',
          seasonOverride: timeSeason,
          moonOverride: timeMoon,
        },
        updatedAt: serverTimestamp()
      }
      await setDoc(doc(db, 'settings', 'game_config'), payload, { merge: true })
      setSaveTimeStatus('✅ Configuração de tempo salva! O relógio atualizará automaticamente.')
      setTimeout(() => setSaveTimeStatus(''), 3500)
    } catch (err) {
      console.error(err)
      setSaveTimeStatus('❌ Erro ao salvar configuração de tempo.')
    }
  }

  const handleClearDiceHistory = async () => {
    if (!window.confirm('Tem certeza que deseja apagar todo o histórico de rolagens de dados do Bosque? Esta ação é definitiva e apagará os dados de todos os jogadores.')) return
    setClearingDice(true)
    setClearDiceStatus('Limpando histórico de rolagens...')
    try {
      const snap = await getDocs(collection(db, 'dice_rolls'))
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'dice_rolls', d.id)))
      await Promise.all(deletePromises)
      setClearDiceStatus(`✅ Histórico limpo com sucesso! (${snap.size} registros apagados)`)
      setTimeout(() => setClearDiceStatus(''), 4000)
    } catch (err) {
      console.error(err)
      setClearDiceStatus('❌ Erro ao limpar histórico de dados.')
      setTimeout(() => setClearDiceStatus(''), 4000)
    } finally {
      setClearingDice(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-login-icon">🔮</div>
          <h2 className="admin-login-title">Santuário de Mestre</h2>
          <p className="admin-login-subtitle">Insira a Chave Arcana para acessar o controle do Bosque</p>

          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="password"
              className="admin-login-input"
              placeholder="Chave de Mestre..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              required
            />
            {authError && <span className="admin-login-error">{authError}</span>}

            <button type="submit" className="admin-login-submit-btn">
              Adentrar o Santuário
            </button>
            <button
              type="button"
              className="admin-login-back-btn"
              onClick={() => navigate(`/location/${defaultLocation}`)}
            >
              ← Voltar ao Bosque
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <header className="admin-topbar">
        <div className="admin-title-col">
          <h1>🔮 Painel de Criação do Bosque</h1>
          <span>Controle de Domínios, Cenários, Climas e Compêndio</span>
        </div>

        {/* Abas Superiores de Mestre */}
        <div className="admin-tab-nav">
          <button
            type="button"
            className={`admin-tab-nav-btn ${adminTab === 'locations' ? 'active' : ''}`}
            onClick={() => setAdminTab('locations')}
          >
            🧭 Domínios & Locais ({locations.length})
          </button>
          <button
            type="button"
            className={`admin-tab-nav-btn ${adminTab === 'compendium' ? 'active' : ''}`}
            onClick={() => setAdminTab('compendium')}
          >
            📖 Compêndio ({compendiumList.length})
          </button>
          <button
            type="button"
            className={`admin-tab-nav-btn ${adminTab === 'tempo' ? 'active' : ''}`}
            onClick={() => setAdminTab('tempo')}
          >
            ⏱️ Tempo & Estação
          </button>
          <button
            type="button"
            className={`admin-tab-nav-btn ${adminTab === 'combate' ? 'active' : ''}`}
            onClick={() => setAdminTab('combate')}
          >
            ⚔️ Mesa de Combate {activeCombatData?.active ? '🔴' : ''}
          </button>
        </div>

        <div className="admin-actions-col">
          <button type="button" className="admin-nav-link-btn" onClick={() => window.open('/combat', '_blank')}>
            ⚔️ Abrir Combate
          </button>
          <button type="button" className="admin-nav-link-btn" onClick={() => navigate('/compendio')}>
            📖 Ver Compêndio
          </button>
          <button type="button" className="admin-nav-link-btn" onClick={() => navigate(`/location/${defaultLocation}`)}>
            🌿 Ver Bosque
          </button>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={() => {
              sessionStorage.removeItem('jardim_master_auth')
              setIsAuthenticated(false)
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* =========================================================================
          ABA 1: GERENCIAMENTO DE DOMÍNIOS & LOCALIDADES
          ========================================================================= */}
      {adminTab === 'locations' && (
        <div className="admin-main-grid">
          <aside className="admin-locations-sidebar">
            {/* Banner de Localidade Padrão */}
            <div className="admin-default-loc-card">
              <div className="admin-default-loc-header">
                <span className="admin-default-star">⭐</span>
                <strong>Entrada Principal do Bosque</strong>
              </div>
              <p className="admin-default-loc-desc">
                Esta é a área que abre ao acessar o site e ao clicar em <em>"BOSQUE DE ALMA"</em> no menu.
              </p>
              <div className="admin-default-loc-picker">
                <select
                  className="profile-form-input"
                  value={defaultLocation}
                  onChange={(e) => handleSetDefaultLocation(e.target.value)}
                  style={{ fontSize: 12, padding: '6px 8px' }}
                >
                  <option value="crepusculo">Pátio da Cabana (crepusculo)</option>
                  {locations.filter(l => l.id !== 'crepusculo').map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name || l.id} ({l.id})
                    </option>
                  ))}
                </select>
              </div>
              {saveDefaultLocStatus && (
                <div style={{ fontSize: 11, color: 'var(--accent-glow, #a78bfa)', marginTop: 4 }}>
                  {saveDefaultLocStatus}
                </div>
              )}
            </div>

            <div className="admin-sidebar-header" style={{ marginTop: 12 }}>
              <h3>Localidades ({locations.length})</h3>
              <button type="button" className="admin-add-btn" onClick={startNewLocation}>
                + Nova Área
              </button>
            </div>

            <div className="admin-locations-list">
              {locations.length === 0 ? (
                <p className="admin-empty-text">Nenhuma área customizada ainda.</p>
              ) : (
                locations.map((loc) => {
                  const isDefault = (loc.id === defaultLocation) || (loc.slug === defaultLocation)
                  return (
                    <div
                      key={loc.id}
                      className={`admin-loc-item ${formSlug === loc.id ? 'active' : ''}`}
                      onClick={() => selectLocForEdit(loc)}
                    >
                      <div className="admin-loc-item-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong>{loc.name || loc.id}</strong>
                          {isDefault && (
                            <span className="admin-default-pill" title="Localidade Padrão do Bosque">
                              ⭐ Padrão
                            </span>
                          )}
                        </div>
                        <small>/{loc.id}</small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className="admin-loc-visit-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/location/${loc.id || loc.slug}`, '_blank')
                          }}
                          title="Visitar Localidade (Abrir em nova aba)"
                        >
                          ↗️
                        </button>
                        <button
                          type="button"
                          className="admin-loc-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          <main className="admin-editor-panel">
            <div className="admin-editor-card">
              <div className="admin-editor-header-row">
                <div>
                  <h2>{selectedLoc ? `Editando: ${selectedLoc.name}` : 'Criar Nova Localidade'}</h2>
                  {formSlug && formSlug === defaultLocation && (
                    <span className="admin-default-pill-large">
                      ⭐ Esta é a Localidade Padrão (Entrada Principal)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {formSlug && formSlug !== defaultLocation && (
                    <button
                      type="button"
                      className="admin-tab-nav-btn"
                      onClick={() => handleSetDefaultLocation(formSlug)}
                      title="Definir esta localidade como a que abre inicialmente no site"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      ⭐ Definir como Padrão
                    </button>
                  )}
                  {formSlug && (
                    <button
                      type="button"
                      className="admin-visit-loc-action-btn"
                      onClick={() => window.open(`/location/${formSlug}`, '_blank')}
                      title="Abrir este local diretamente em uma nova aba"
                    >
                      🔗 Visitar Localidade ({formSlug})
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveLocation} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ margin: 0 }}>Identificador da URL (Slug único):</label>
                      {formName && (
                        <button
                          type="button"
                          className="admin-slug-gen-btn"
                          onClick={() => setFormSlug(slugify(formName))}
                          title="Recriar slug a partir do Nome"
                        >
                          ⚡ Auto-Slug
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="ex: estufas, veu-geada, cabana-alma"
                      required
                    />
                    <small>Acesso: /location/{formSlug || 'slug'}</small>
                  </div>

                  <div className="admin-form-group">
                    <label>Nome de Exibição:</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => {
                        const newName = e.target.value
                        setFormName(newName)
                        if (!selectedLoc) {
                          setFormSlug(slugify(newName))
                        }
                      }}
                      placeholder="ex: Chalés e Estufas de Koskovic"
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Descrição do Ambiente (Lore do Bosque):</label>
                  <textarea
                    rows={4}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Descreva a atmosfera gótica, folhagens, clima..."
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Imagem de Fundo do Cenário (Cloudinary / URL):</label>
                    <div className="admin-upload-input-group">
                      <input
                        type="url"
                        value={formBg}
                        onChange={(e) => setFormBg(e.target.value)}
                        placeholder="https://res.cloudinary.com/..."
                      />
                      <label className="admin-upload-label-btn">
                        {uploadingLocBg ? '⏳ Enviando...' : '📷 Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLocBg}
                          disabled={uploadingLocBg}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Efeito Climático:</label>
                    <select
                      value={formClimate}
                      onChange={(e) => setFormClimate(e.target.value)}
                    >
                      {CLIMATE_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Temp. Mínima (°C) ❄️:</label>
                    <input
                      type="number"
                      value={formMinTemp}
                      onChange={(e) => setFormMinTemp(e.target.value)}
                      placeholder="ex: 8 (Madrugada)"
                      step="1"
                    />
                    <small>Frio da madrugada / noite</small>
                  </div>

                  <div className="admin-form-group">
                    <label>Temp. Máxima (°C) ☀️:</label>
                    <input
                      type="number"
                      value={formMaxTemp}
                      onChange={(e) => setFormMaxTemp(e.target.value)}
                      placeholder="ex: 22 (Meio da Tarde)"
                      step="1"
                    />
                    <small>Pico de calor à tarde</small>
                  </div>

                  <div className="admin-form-group">
                    <label>Velocidade do Vento (Opcional):</label>
                    <input
                      type="text"
                      value={formWindSpeed}
                      onChange={(e) => setFormWindSpeed(e.target.value)}
                      placeholder="ex: 18 km/h ou 25 km/h"
                    />
                    <small>Exibido apenas em locais com vento</small>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Trilha Sonora Ambiente (Link do YouTube ou ID do Vídeo):</label>
                  <input
                    type="text"
                    value={formSound}
                    onChange={(e) => setFormSound(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... ou ID"
                  />
                </div>

                {/* Trilhas / Botões Paralelos de Navegação */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header">
                    <label>Botões de Navegação (Posicionados paralelamente ao chat):</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="admin-add-nav-btn" onClick={() => handleAddNavButton('left')}>
                        + Coluna Esquerda
                      </button>
                      <button type="button" className="admin-add-nav-btn" onClick={() => handleAddNavButton('right')}>
                        + Coluna Direita
                      </button>
                    </div>
                  </div>

                  <div className="admin-nav-list">
                    {formNavButtons.map((btn, idx) => (
                      <div key={idx} className="admin-nav-item-row">
                        <select
                          value={btn.position || 'right'}
                          onChange={(e) => handleUpdateNavButton(idx, 'position', e.target.value)}
                          style={{ width: '110px' }}
                        >
                          <option value="left">👈 Esquerda</option>
                          <option value="right">Direita 👉</option>
                        </select>
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={btn.label || ''}
                          onChange={(e) => handleUpdateNavButton(idx, 'label', e.target.value)}
                          placeholder="Texto do Botão (ex: Entrar na Cabana)"
                        />
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={btn.targetSlug || ''}
                          onChange={(e) => handleUpdateNavButton(idx, 'targetSlug', e.target.value)}
                          placeholder="Slug de destino (ex: cabana-alma)"
                        />
                        <button
                          type="button"
                          className="admin-remove-nav-btn"
                          onClick={() => handleRemoveNavButton(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {saveLocStatus && <div className="admin-save-feedback">{saveLocStatus}</div>}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar Localidade
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          ABA 2: GERENCIAMENTO DO COMPÊNDIO (BESTIÁRIO / HERBÁRIO / POÇÕES)
          ========================================================================= */}
      {adminTab === 'compendium' && (
        <div className="admin-main-grid">
          <aside className="admin-locations-sidebar">
            <div className="admin-sidebar-header">
              <h3>Registros ({compendiumList.length})</h3>
              <button type="button" className="admin-add-btn" onClick={startNewCompEntry}>
                + Novo Registro
              </button>
            </div>

            {/* Filtro Rápido de Categorias */}
            <div className="admin-comp-filter-tabs">
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('all')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'criaturas' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('criaturas')}
              >
                🐺 Criaturas
              </button>
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'plantas_fungos' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('plantas_fungos')}
              >
                🌿 Plantas
              </button>
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'pocoes' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('pocoes')}
              >
                🧪 Poções
              </button>
            </div>

            <div className="admin-locations-list">
              {filteredCompendium.length === 0 ? (
                <p className="admin-empty-text">Nenhum registro encontrado nesta categoria.</p>
              ) : (
                filteredCompendium.map((entry) => (
                  <div
                    key={entry.id}
                    className={`admin-loc-item ${selectedCompEntry?.id === entry.id ? 'active' : ''}`}
                    onClick={() => selectCompEntryForEdit(entry)}
                  >
                    <div className="admin-loc-item-info">
                      <strong>{entry.name}</strong>
                      <small>
                        {entry.category === 'criaturas' ? '🐺 Criatura' : entry.category === 'plantas_fungos' ? '🌿 Planta/Fungo' : '🧪 Poção'}
                        {entry.subcategory ? ` · ${entry.subcategory}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="admin-loc-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCompEntry(entry.id); }}
                      title="Excluir registro"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <main className="admin-editor-panel">
            {/* Configuração de Fundo Global do Compêndio */}
            <div className="admin-editor-card" style={{ marginBottom: '16px' }}>
              <h2>🖼️ Imagem de Fundo do Compêndio</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '12px' }}>
                Defina a imagem de fundo atmosférica que aparece atrás do Compêndio de Koskovic.
              </p>

              <form onSubmit={handleSaveGlobalCompBg} className="admin-form">
                <div className="admin-form-group">
                  <label>URL da Imagem:</label>
                  <div className="admin-upload-group">
                    <input
                      type="url"
                      value={compendiumGlobalBg}
                      onChange={(e) => setCompendiumGlobalBg(e.target.value)}
                      placeholder="https://exemplo.com/fundo-compendio.jpg"
                    />
                    <label className={`admin-upload-btn ${uploadingGlobalBg ? 'loading' : ''}`}>
                      {uploadingGlobalBg ? 'Enviando...' : '📁 Enviar Imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadGlobalCompBg}
                        disabled={uploadingGlobalBg}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                {compendiumGlobalBg && (
                  <div className="admin-bg-preview-wrapper">
                    <div className="admin-bg-preview-label">
                      <span>Pré-visualização do Fundo:</span>
                      <button
                        type="button"
                        className="admin-bg-preview-clear"
                        onClick={() => setCompendiumGlobalBg('')}
                        title="Remover imagem de fundo"
                      >
                        ✕ Limpar Fundo
                      </button>
                    </div>
                    <div className="admin-bg-preview-frame">
                      <img src={compendiumGlobalBg} alt="Preview Fundo Compêndio" />
                      <span className="admin-bg-preview-tag">📖 Fundo do Compêndio</span>
                    </div>
                  </div>
                )}

                {saveGlobalBgStatus && (
                  <div className="admin-save-feedback">{saveGlobalBgStatus}</div>
                )}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar Fundo do Compêndio
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-editor-card">
              <h2>{selectedCompEntry ? `Editando: ${selectedCompEntry.name}` : 'Criar Registro no Compêndio'}</h2>

              <form onSubmit={handleSaveCompEntry} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Nome do Registro:</label>
                    <input
                      type="text"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="ex: Urso das Sombras, Mandrágora Sussurrante..."
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Categoria do Compêndio:</label>
                    <select
                      value={compCategory}
                      onChange={(e) => setCompCategory(e.target.value)}
                    >
                      {COMPENDIUM_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Subcategoria / Família (Agrupador estilo The Witcher):</label>
                    <input
                      type="text"
                      value={compSubcategory}
                      onChange={(e) => setCompSubcategory(e.target.value)}
                      placeholder="ex: Feras, Espectros, Ervas Raras, Elixires..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Ilustração / Foto (Cloudinary / URL):</label>
                    <div className="admin-upload-input-group">
                      <input
                        type="url"
                        value={compImageUrl}
                        onChange={(e) => setCompImageUrl(e.target.value)}
                        placeholder="https://res.cloudinary.com/..."
                      />
                      <label className="admin-upload-label-btn">
                        {uploadingCompImg ? '⏳ Enviando...' : '📷 Upload Cloudinary'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadCompImg}
                          disabled={uploadingCompImg}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* ── SEÇÃO: ECOLOGIA & STATUS DE COMBATE (HP, MP, RISCO, ESPÉCIE) ── */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header">
                    <label>🩸 Vida, Mana, Risco & Dimensões:</label>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group" style={{ flex: 1 }}>
                      <label>❤️ Vida (HP):</label>
                      <input
                        type="number"
                        value={compHp}
                        onChange={(e) => setCompHp(e.target.value)}
                        placeholder="ex: 120"
                      />
                    </div>
                    <div className="admin-form-group" style={{ flex: 1 }}>
                      <label>🔮 Mana (MP):</label>
                      <input
                        type="number"
                        value={compMp}
                        onChange={(e) => setCompMp(e.target.value)}
                        placeholder="ex: 60"
                      />
                    </div>
                    <div className="admin-form-group" style={{ flex: 1 }}>
                      <label>🛡️ Classe de Armadura (CA):</label>
                      <input
                        type="number"
                        value={compArmorClass}
                        onChange={(e) => setCompArmorClass(e.target.value)}
                        placeholder="ex: 14"
                      />
                    </div>
                    <div className="admin-form-group" style={{ flex: 1 }}>
                      <label>💀 Risco (0 a 5 Crânios):</label>
                      <select
                        value={compRiskLevel}
                        onChange={(e) => setCompRiskLevel(Number(e.target.value))}
                      >
                        <option value={0}>0 - Inofensivo / Neutro</option>
                        <option value={1}>1 - 💀 (Baixo)</option>
                        <option value={2}>2 - 💀💀 (Moderado)</option>
                        <option value={3}>3 - 💀💀💀 (Perigoso)</option>
                        <option value={4}>4 - 💀💀💀💀 (Mortal)</option>
                        <option value={5}>5 - 💀💀💀💀💀 (Calamidade)</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group" style={{ flex: 1.5 }}>
                      <label>🐾 Espécie (Classe):</label>
                      <input
                        type="text"
                        value={compSpecies}
                        onChange={(e) => setCompSpecies(e.target.value)}
                        placeholder="ex: Predador Draconiano, Aracnídeo Gigante..."
                      />
                    </div>
                    <div className="admin-form-group" style={{ flex: 1.2 }}>
                      <label>📏 Altura e Peso (ex: 2.40m | 85kg):</label>
                      <input
                        type="text"
                        value={compHeightWeight}
                        onChange={(e) => setCompHeightWeight(e.target.value)}
                        placeholder="ex: 2.40m | 85kg"
                      />
                    </div>
                    <div className="admin-form-group" style={{ flex: 1.2 }}>
                      <label>🍂 Época de Acasalamento:</label>
                      <input
                        type="text"
                        value={compMatingSeason}
                        onChange={(e) => setCompMatingSeason(e.target.value)}
                        placeholder="ex: Primavera / Outono"
                      />
                    </div>
                    <div className="admin-form-group" style={{ flex: 1.2 }}>
                      <label>🏔️ Habitat Natural:</label>
                      <input
                        type="text"
                        value={compHabitat}
                        onChange={(e) => setCompHabitat(e.target.value)}
                        placeholder="ex: Bosques Profundos, Picos Nevados"
                      />
                    </div>
                  </div>
                </div>

                {/* ── ATRIBUTOS DE FICHA (FORÇA, DESTREZA, SABEDORIA) ── */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header" style={{ justifyContent: 'space-between' }}>
                    <label>✦ Atributos de Ficha (Força, Destreza & Sabedoria):</label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', color: '#c084fc' }}>
                      <input
                        type="checkbox"
                        checked={compCanRationalize}
                        onChange={(e) => setCompCanRationalize(e.target.checked)}
                      />
                      Consegue Racionalizar (habilita Sabedoria)
                    </label>
                  </div>
                  <div className="admin-stats-inputs-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="admin-stat-input-box">
                      <span className="stat-icon">⚔️</span>
                      <label>FORÇA:</label>
                      <input
                        type="number"
                        value={compStats.forca ?? 10}
                        onChange={(e) => handleUpdateStat('forca', e.target.value)}
                      />
                    </div>
                    <div className="admin-stat-input-box">
                      <span className="stat-icon">🏹</span>
                      <label>DESTREZA:</label>
                      <input
                        type="number"
                        value={compStats.destreza ?? 10}
                        onChange={(e) => handleUpdateStat('destreza', e.target.value)}
                      />
                    </div>
                    <div className={`admin-stat-input-box ${!compCanRationalize ? 'disabled' : ''}`}>
                      <span className="stat-icon">📜</span>
                      <label>SABEDORIA:</label>
                      <input
                        type="number"
                        disabled={!compCanRationalize}
                        value={compCanRationalize ? (compStats.sabedoria ?? 10) : ''}
                        placeholder={compCanRationalize ? '10' : 'Não Racionaliza'}
                        onChange={(e) => handleUpdateStat('sabedoria', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* ── HABILIDADES (2 PASSIVAS E 1 ATIVA) ── */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header">
                    <label>✨ Habilidades (2 Passivas e 1 Ativa):</label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Passiva 1 */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#93c5fd' }}>🛡️ HABILIDADE PASSIVA 1</span>
                      <div className="admin-form-row" style={{ marginTop: '6px', marginBottom: 0 }}>
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={compPassive1Name}
                          onChange={(e) => setCompPassive1Name(e.target.value)}
                          placeholder="Nome da Passiva 1 (ex: Pele de Pedra)"
                        />
                        <input
                          type="text"
                          style={{ flex: 2 }}
                          value={compPassive1Desc}
                          onChange={(e) => setCompPassive1Desc(e.target.value)}
                          placeholder="Descrição do efeito passivo..."
                        />
                      </div>
                    </div>

                    {/* Passiva 2 */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#93c5fd' }}>👁️ HABILIDADE PASSIVA 2</span>
                      <div className="admin-form-row" style={{ marginTop: '6px', marginBottom: 0 }}>
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={compPassive2Name}
                          onChange={(e) => setCompPassive2Name(e.target.value)}
                          placeholder="Nome da Passiva 2 (ex: Sentido Predatório)"
                        />
                        <input
                          type="text"
                          style={{ flex: 2 }}
                          value={compPassive2Desc}
                          onChange={(e) => setCompPassive2Desc(e.target.value)}
                          placeholder="Descrição do efeito passivo..."
                        />
                      </div>
                    </div>

                    {/* Ativa */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(234,179,8,0.2)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fde047' }}>⚡ HABILIDADE ATIVA</span>
                      <div className="admin-form-row" style={{ marginTop: '6px', marginBottom: 0 }}>
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={compActiveName}
                          onChange={(e) => setCompActiveName(e.target.value)}
                          placeholder="Nome da Ativa (ex: Rugido Sísmico)"
                        />
                        <input
                          type="text"
                          style={{ flex: 2 }}
                          value={compActiveDesc}
                          onChange={(e) => setCompActiveDesc(e.target.value)}
                          placeholder="Descrição do efeito ativo..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── LORE, DESCRIÇÃO E CITAÇÃO ── */}
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 2 }}>
                    <label>Frase / Citação de Abertura (Opcional):</label>
                    <input
                      type="text"
                      value={compQuote}
                      onChange={(e) => setCompQuote(e.target.value)}
                      placeholder="ex: Quando a névoa do crepúsculo desce sobre os carvalhos..."
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Autor da Frase:</label>
                    <input
                      type="text"
                      value={compQuoteAuthor}
                      onChange={(e) => setCompQuoteAuthor(e.target.value)}
                      placeholder="ex: Alma Koskovic"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Descrição Detalhada & Lore:</label>
                  <textarea
                    rows={5}
                    value={compDescription}
                    onChange={(e) => setCompDescription(e.target.value)}
                    placeholder="Escreva a descrição do tomo de conhecimento, características biológicas, origem..."
                  />
                </div>

                <div className="admin-form-group">
                  <label>Comportamento, Modo de Coleta ou Efeitos:</label>
                  <textarea
                    rows={3}
                    value={compTactics}
                    onChange={(e) => setCompTactics(e.target.value)}
                    placeholder="Dicas estratégicas para viajantes ao encontrar este elemento..."
                  />
                </div>

                {/* ── DROPS / COLETÁVEIS & RECURSOS ── */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header">
                    <label>
                      {compCategory === 'criaturas'
                        ? '🎒 Espólios / Drops da Criatura:'
                        : '🌿 Recursos / Extrações Coletáveis (Pólen, Seiva, etc.):'}
                    </label>
                    <button type="button" className="admin-add-nav-btn" onClick={handleAddDrop}>
                      + Adicionar Item Dropável
                    </button>
                  </div>

                  <div className="admin-nav-list">
                    {compDrops.map((drop, idx) => (
                      <div key={idx} className="admin-nav-item-row">
                        <input
                          type="text"
                          style={{ width: '60px', textAlign: 'center' }}
                          value={drop.icon || (compCategory === 'plantas_fungos' ? '🌸' : '💎')}
                          onChange={(e) => handleUpdateDrop(idx, 'icon', e.target.value)}
                          placeholder="Ícone"
                        />
                        <input
                          type="text"
                          style={{ flex: 2 }}
                          value={drop.name || ''}
                          onChange={(e) => handleUpdateDrop(idx, 'name', e.target.value)}
                          placeholder="Nome do Item (ex: Pólen Dourado, Couro Grisálido)"
                        />
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={drop.chance || ''}
                          onChange={(e) => handleUpdateDrop(idx, 'chance', e.target.value)}
                          placeholder="Raridade/Chance (ex: Comum, Raro, 15%)"
                        />
                        <button
                          type="button"
                          className="admin-remove-nav-btn"
                          onClick={() => handleRemoveDrop(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── FRAQUEZAS & VULNERABILIDADES ── */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header">
                    <label>⚡ Fraquezas / Vulnerabilidades (Ícone + Texto):</label>
                    <button type="button" className="admin-add-nav-btn" onClick={handleAddWeakness}>
                      + Adicionar Fraqueza
                    </button>
                  </div>

                  <div className="admin-nav-list">
                    {compWeaknesses.map((weakness, idx) => (
                      <div key={idx} className="admin-nav-item-row">
                        <input
                          type="text"
                          style={{ width: '60px', textAlign: 'center' }}
                          value={weakness.icon || '⚡'}
                          onChange={(e) => handleUpdateWeakness(idx, 'icon', e.target.value)}
                          placeholder="Ícone"
                        />
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={weakness.label || ''}
                          onChange={(e) => handleUpdateWeakness(idx, 'label', e.target.value)}
                          placeholder="Fraqueza (ex: Fogo Arcano, Óleo de Fera, Luz Solar)"
                        />
                        <button
                          type="button"
                          className="admin-remove-nav-btn"
                          onClick={() => handleRemoveWeakness(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pré-visualização da Imagem */}
                {compImageUrl && (
                  <div className="admin-comp-preview-box">
                    <label>Pré-visualização da Ilustração:</label>
                    <div className="admin-comp-preview-img-wrap">
                      <img src={compImageUrl} alt="Preview" className="admin-comp-preview-img" />
                    </div>
                  </div>
                )}

                {saveCompStatus && <div className="admin-save-feedback">{saveCompStatus}</div>}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar no Compêndio
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          ABA 3: TEMPO & ESTAÇÃO DO ANO
          ========================================================================= */}
      {adminTab === 'tempo' && (
        <div className="admin-main-grid" style={{ gridTemplateColumns: '1fr' }}>
          <main className="admin-form-panel" style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <div className="admin-form-header">
              <h2>⏱️ Controle de Tempo & Estação</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 4 }}>
                Defina o horário e a estação do ano exibidos no widget do menu. O horário do mundo é o mesmo para todas as localidades.
              </p>
            </div>

            <form onSubmit={handleSaveTimeConfig} className="admin-loc-form">

              {/* Horário do Bosque */}
              <div className="profile-form-group">
                <label className="profile-form-label">Horário do Bosque (HH:MM)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="time"
                    className="profile-form-input"
                    value={timeValue}
                    onChange={e => setTimeValue(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                  <button
                    type="button"
                    className="admin-tab-nav-btn"
                    onClick={handleSetCurrentRealTime}
                    title="Preenche com o horário atual do seu computador"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                  >
                    ⏰ Usar Hora Real Agora
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                  Defina a hora base. Se o relógio estiver em modo progressivo, ele continuará correndo naturalmente a partir deste horário!
                </small>
              </div>

              {/* Comportamento do Relógio */}
              <div className="profile-form-group">
                <label className="profile-form-label">Comportamento do Relógio</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`admin-tab-nav-btn ${timeMode === 'dynamic' ? 'active' : ''}`}
                    onClick={() => setTimeMode('dynamic')}
                  >
                    ⏩ Progressivo (Avança sozinho)
                  </button>
                  <button
                    type="button"
                    className={`admin-tab-nav-btn ${timeMode === 'manual' ? 'active' : ''}`}
                    onClick={() => setTimeMode('manual')}
                  >
                    🔒 Congelado (Hora fixa)
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                  {timeMode === 'dynamic'
                    ? 'O relógio avança progressivamente a cada segundo a partir da hora definida.'
                    : 'O relógio fica estático e não avança com o tempo.'}
                </small>
              </div>

              {/* Velocidade do Tempo (somente em modo progressivo) */}
              {timeMode === 'dynamic' && (
                <div className="profile-form-group">
                  <label className="profile-form-label">Velocidade da Passagem do Tempo</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { val: 1, label: '1× Tempo Real', desc: '1 min real = 1 min no Bosque' },
                      { val: 2, label: '2× Dinâmico RPG', desc: '12h reais = 1 dia no Bosque' },
                      { val: 4, label: '4× Acelerado', desc: '6h reais = 1 dia no Bosque' },
                    ].map(spd => (
                      <button
                        key={spd.val}
                        type="button"
                        className={`admin-tab-nav-btn ${timeSpeed === spd.val ? 'active' : ''}`}
                        onClick={() => setTimeSpeed(spd.val)}
                        style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}
                      >
                        <span style={{ fontWeight: 'bold' }}>{spd.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.75 }}>{spd.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estação do Ano */}
              <div className="profile-form-group">
                <label className="profile-form-label">Estação do Ano</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { id: 'spring', label: 'Primavera', icon: '🌸' },
                    { id: 'summer', label: 'Verão',    icon: '☀️' },
                    { id: 'autumn', label: 'Outono',   icon: '🍂' },
                    { id: 'winter', label: 'Inverno',  icon: '❄️' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`admin-tab-nav-btn ${timeSeason === s.id ? 'active' : ''}`}
                      style={{ flexDirection: 'column', gap: 4, padding: '10px 8px' }}
                      onClick={() => setTimeSeason(s.id)}
                    >
                      <span style={{ fontSize: 22 }}>{s.icon}</span>
                      <span style={{ fontSize: 11 }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fase da Lua */}
              <div className="profile-form-group">
                <label className="profile-form-label">Fase da Lua</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { id: 'new',             label: 'Nova',       icon: '🌑' },
                    { id: 'waxing_crescent', label: 'Crescente',  icon: '🌒' },
                    { id: 'first_quarter',   label: 'Qrt. Cresc.',icon: '🌓' },
                    { id: 'waxing_gibbous',  label: 'Gib. Cresc.',icon: '🌔' },
                    { id: 'full',            label: 'Cheia',      icon: '🌕' },
                    { id: 'waning_gibbous',  label: 'Gib. Ming.', icon: '🌖' },
                    { id: 'last_quarter',    label: 'Qrt. Ming.', icon: '🌗' },
                    { id: 'waning_crescent', label: 'Minguante',  icon: '🌘' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`admin-tab-nav-btn ${timeMoon === m.id ? 'active' : ''}`}
                      style={{ flexDirection: 'column', gap: 3, padding: '8px 4px' }}
                      onClick={() => setTimeMoon(m.id)}
                    >
                      <span style={{ fontSize: 20 }}>{m.icon}</span>
                      <span style={{ fontSize: 10, lineHeight: 1.2 }}>{m.label}</span>
                    </button>
                  ))}
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                  Selecione uma fase da lua para fixar no céu do Bosque.
                </small>
              </div>

              {saveTimeStatus && (
                <div className="admin-save-feedback">{saveTimeStatus}</div>
              )}

              <div className="admin-form-actions">
                <button type="submit" className="admin-save-btn">
                  💾 Salvar Configuração de Tempo
                </button>
              </div>
            </form>

            {/* Seção de Ferramentas do Mestre: Limpeza de Rolagens de Dados */}
            <div className="admin-form-header" style={{ marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
              <h2>🎲 Ferramentas & Histórico de Dados</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 4 }}>
                Limpe o registro público de rolagens de dados feitas pelos visitantes e pelo mestre no Bosque.
              </p>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="admin-delete-btn"
                onClick={handleClearDiceHistory}
                disabled={clearingDice}
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {clearingDice ? '⏳ Limpando Histórico...' : '🗑️ Limpar Todo o Histórico de Rolagens'}
              </button>

              {clearDiceStatus && (
                <div style={{ fontSize: 13, color: clearDiceStatus.startsWith('✅') ? '#86efac' : '#fca5a5', fontWeight: 500 }}>
                  {clearDiceStatus}
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          ABA 4: MESA & GERENCIAMENTO DE COMBATE
          ========================================================================= */}
      {adminTab === 'combate' && (
        <div className="admin-main-grid" style={{ gridTemplateColumns: '1fr' }}>
          <main className="admin-editor-main" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {/* Header da Mesa */}
            <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2>⚔️ Mesa & Gerenciamento de Combate</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 4 }}>
                  Inicie e configure combates em tempo real nas salas do Bosque com personagens e criaturas personalizadas.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <a
                  href="/combat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, borderRadius: 8 }}
                >
                  🛡️ Abrir Mesa Tática Completa (Ao Vivo) ↗
                </a>
              </div>
            </div>

            {/* Painel de Configuração da Cena */}
            <form onSubmit={handleStartOrUpdateCombatAdmin} className="admin-location-form" style={{ marginTop: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--accent-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📍</span>
                    <strong style={{ fontSize: 15, color: '#f3e8ff' }}>Local & Configurações do Confronto</strong>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="admin-save-btn" style={{ padding: '8px 18px', fontSize: 13 }}>
                      ⚔️ {activeCombatData?.active ? 'Atualizar Combate na Sala' : 'Iniciar Combate na Sala'}
                    </button>
                    {activeCombatData?.active && (
                      <button type="button" onClick={handleEndCombatAdmin} className="admin-delete-btn" style={{ padding: '8px 14px', fontSize: 13 }}>
                        ⏹ Encerrar
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label>Localidade / Domínio da Batalha</label>
                    <select
                      className="profile-form-input"
                      value={selectedCombatSlug}
                      onChange={e => setSelectedCombatSlug(e.target.value)}
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label>Título / Descrição Curta do Encontro</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder="Ex: Confronto nas Ruínas Ancestrais"
                      value={combatTitle}
                      onChange={e => setCombatTitle(e.target.value)}
                    />
                  </div>
                </div>

                {saveCombatStatus && (
                  <div style={{ marginTop: 12, fontSize: 13, color: saveCombatStatus.startsWith('✅') ? '#86efac' : '#fca5a5', fontWeight: 600 }}>
                    {saveCombatStatus}
                  </div>
                )}
              </div>

              {/* =========================================================
                  PAINEL DE DESCONTOS E CONTROLE EM TEMPO REAL (ADMIN)
                  ========================================================= */}
              <div style={{ marginTop: 20, background: 'linear-gradient(180deg, rgba(28, 12, 22, 0.85) 0%, rgba(16, 12, 24, 0.9) 100%)', padding: '20px', borderRadius: 14, border: '1px solid rgba(239, 68, 68, 0.45)', boxShadow: '0 8px 32px rgba(239,68,68,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="combat-badge-pulse">⚔️ CONTROLE DE DANO & VIGOR</span>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 700 }}>
                      Descontos em Tempo Real ({activeCombatData?.title || combatTitle})
                    </h3>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    As alterações feitas aqui sincronizam instantaneamente com o chat, ficha e tela de combate.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20 }}>
                  
                  {/* 1. CONTROLE DE JOGADORES / ALIADOS */}
                  <div style={{ background: 'rgba(22, 17, 31, 0.8)', padding: '16px', borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 13, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                        🛡️ Descontar Jogadores ({selectedCombatPlayers.length})
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
                      {selectedCombatPlayers.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                          Nenhum personagem selecionado para este combate.
                        </p>
                      ) : (
                        selectedCombatPlayers.map(uid => {
                          const pRecord = allPlayersList.find(p => p.uid === uid) || {}
                          const pData = activeCombatData?.participantsData?.[uid] || {}
                          const vit = pData.attributes?.vitalidade ?? pRecord.attributes?.vitalidade ?? 10
                          const maxHp = pData.hpMax || pRecord.hpMax || calculateMaxHp(vit)
                          const currentHp = pData.hpCurrent ?? pRecord.hpCurrent ?? maxHp
                          const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)))

                          const maxVigor = pData.vigorMax || pRecord.vigorMax || calculateMaxVigor(vit)
                          const currentVigor = pData.vigorCurrent ?? pRecord.vigorCurrent ?? maxVigor
                          const vigorPercent = Math.max(0, Math.min(100, Math.round((currentVigor / maxVigor) * 100)))
                          const name = pData.name || pRecord.chatName || pRecord.characterName || 'Viajante'
                          const customVal = adminDeltaInputs[uid] || ''
                          const statusList = pData.status || []

                          return (
                            <div
                              key={uid}
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--accent-border)',
                                borderRadius: 10,
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10
                              }}
                            >
                              {/* Cabeçalho do Card */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 18 }}>{pRecord.avatarUrl ? '👤' : '🧙'}</span>
                                  <strong style={{ fontSize: 13, color: '#fff' }}>{name}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: 10, fontSize: 12, fontWeight: 700 }}>
                                  <span style={{ color: currentHp <= 0 ? '#ef4444' : '#22c55e' }}>
                                    ❤️ {currentHp}/{maxHp} HP
                                  </span>
                                  <span style={{ color: '#38bdf8' }}>
                                    ⚡ {currentVigor}/{maxVigor} Vig
                                  </span>
                                </div>
                              </div>

                              {/* Campo de Comentário da Narração (Acima da Barra de Vida) */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(251, 191, 36, 0.05)', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(251, 191, 36, 0.22)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    💬 Comentário da Narração
                                  </label>
                                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Acima da barra de vida</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <input
                                    type="text"
                                    placeholder="Ex: Atordoado pelo feitiço, sangrando..."
                                    value={adminPlayerComments[uid] !== undefined ? adminPlayerComments[uid] : (pData.comment || activeCombatData?.participantComments?.[uid] || pRecord.narrationComment || '')}
                                    onChange={e => handleAdminChangePlayerComment(uid, e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdminSavePlayerComment(uid); } }}
                                    onBlur={() => handleAdminSavePlayerComment(uid)}
                                    style={{
                                      flex: 1,
                                      background: 'rgba(0, 0, 0, 0.55)',
                                      border: '1px solid rgba(251, 191, 36, 0.3)',
                                      color: '#fef08a',
                                      borderRadius: 4,
                                      padding: '4px 8px',
                                      fontSize: 11,
                                      fontStyle: 'italic'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAdminSavePlayerComment(uid)}
                                    style={{
                                      background: 'rgba(251, 191, 36, 0.2)',
                                      border: '1px solid rgba(251, 191, 36, 0.5)',
                                      color: '#fde047',
                                      borderRadius: 4,
                                      padding: '2px 8px',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>

                              {/* Barras de HP e Vigor */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${hpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #16a34a, #22c55e)', transition: 'width 0.3s' }} />
                                </div>
                                <div style={{ height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ width: `${vigorPercent}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', transition: 'width 0.3s' }} />
                                </div>
                              </div>

                              {/* Botões de Desconto / Cura de HP */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Dano:</span>
                                {[-1, -5, -10, -20].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaPlayerHp(uid, val)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.2)',
                                      border: '1px solid rgba(239, 68, 68, 0.5)',
                                      color: '#fca5a5',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {val}
                                  </button>
                                ))}

                                <span style={{ fontSize: 11, color: '#86efac', fontWeight: 600, marginLeft: 6 }}>Cura:</span>
                                {[1, 5, 10, 20].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaPlayerHp(uid, val)}
                                    style={{
                                      background: 'rgba(34, 197, 94, 0.2)',
                                      border: '1px solid rgba(34, 197, 94, 0.5)',
                                      color: '#86efac',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    +{val}
                                  </button>
                                ))}
                              </div>

                              {/* Botões de Vigor */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>Vigor:</span>
                                {[-1, -2, -5].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaPlayerVigor(uid, val)}
                                    style={{
                                      background: 'rgba(2, 132, 199, 0.2)',
                                      border: '1px solid rgba(56, 189, 248, 0.4)',
                                      color: '#7dd3fc',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {val}
                                  </button>
                                ))}
                                {[1, 2, 5].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaPlayerVigor(uid, val)}
                                    style={{
                                      background: 'rgba(14, 165, 233, 0.25)',
                                      border: '1px solid rgba(56, 189, 248, 0.6)',
                                      color: '#bae6fd',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    +{val}
                                  </button>
                                ))}

                                {/* Input Customizado */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                                  <input
                                    type="number"
                                    placeholder="Qtd"
                                    value={customVal}
                                    onChange={e => handleAdminSetDeltaInput(uid, e.target.value)}
                                    style={{ width: 52, padding: '2px 6px', fontSize: 11, textAlign: 'center', background: '#111', border: '1px solid #444', color: '#fff', borderRadius: 4 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const amt = Number(customVal)
                                      if (amt) {
                                        handleAdminDeltaPlayerHp(uid, -Math.abs(amt))
                                        handleAdminSetDeltaInput(uid, '')
                                      }
                                    }}
                                    style={{ background: '#b91c1c', border: 'none', color: '#fff', padding: '2px 6px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    - Dano
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const amt = Number(customVal)
                                      if (amt) {
                                        handleAdminDeltaPlayerHp(uid, Math.abs(amt))
                                        handleAdminSetDeltaInput(uid, '')
                                      }
                                    }}
                                    style={{ background: '#15803d', border: 'none', color: '#fff', padding: '2px 6px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    + Cura
                                  </button>
                                </div>
                              </div>

                              {/* Status / Condições */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingTop: 4, borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                                {COMBAT_STATUS_EFFECTS.map(st => {
                                  const isActive = statusList.includes(st.id)
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={() => handleAdminTogglePlayerStatus(uid, st.id)}
                                      style={{
                                        background: isActive ? `${st.color}33` : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${isActive ? st.color : 'rgba(255,255,255,0.1)'}`,
                                        color: isActive ? '#fff' : 'var(--text-muted)',
                                        borderRadius: 9999,
                                        padding: '2px 7px',
                                        fontSize: 10,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3
                                      }}
                                      title={st.desc}
                                    >
                                      <span>{st.icon}</span>
                                      <span>{st.label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* 2. CONTROLE DE INIMIGOS / NPCS */}
                  <div style={{ background: 'rgba(22, 17, 31, 0.8)', padding: '16px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 13, textTransform: 'uppercase', color: '#f87171', letterSpacing: '0.05em' }}>
                        👹 Descontar Inimigos ({combatEnemies.length})
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
                      {combatEnemies.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                          Nenhum inimigo cadastrado neste combate. Cadastre no formulário abaixo.
                        </p>
                      ) : (
                        combatEnemies.map(enemy => {
                          const maxHp = enemy.maxHp || 50
                          const currentHp = enemy.currentHp ?? maxHp
                          const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)))

                          const maxVigor = enemy.maxVigor || 10
                          const currentVigor = enemy.currentVigor ?? maxVigor
                          const vigorPercent = Math.max(0, Math.min(100, Math.round((currentVigor / maxVigor) * 100)))
                          const customVal = adminDeltaInputs[enemy.id] || ''
                          const statusList = enemy.status || []

                          return (
                            <div
                              key={enemy.id}
                              style={{
                                background: enemy.isBoss ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${enemy.isBoss ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.3)'}`,
                                borderRadius: 10,
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10
                              }}
                            >
                              {/* Cabeçalho do Card */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 18 }}>{enemy.icon || '👹'}</span>
                                  <strong style={{ fontSize: 13, color: '#fff' }}>
                                    {enemy.name} {enemy.isBoss && <span className="boss-badge">👑 BOSS</span>}
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', gap: 10, fontSize: 12, fontWeight: 700 }}>
                                  <span style={{ color: currentHp <= 0 ? '#ef4444' : '#f87171' }}>
                                    HP: {currentHp}/{maxHp}
                                  </span>
                                  <span style={{ color: '#38bdf8' }}>
                                    Vig: {currentVigor}/{maxVigor}
                                  </span>
                                </div>
                              </div>

                              {/* Campo de Comentário da Narração do Inimigo (Acima da Barra de Vida) */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(239, 68, 68, 0.05)', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.22)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    💬 Comentário da Narração
                                  </label>
                                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Acima da barra de vida</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <input
                                    type="text"
                                    placeholder="Ex: Rosnando com fúria, conjurando feitiço..."
                                    value={adminEnemyComments[enemy.id] !== undefined ? adminEnemyComments[enemy.id] : (enemy.turnComment || enemy.comment || '')}
                                    onChange={e => handleAdminChangeEnemyComment(enemy.id, e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdminSaveEnemyComment(enemy.id); } }}
                                    onBlur={() => handleAdminSaveEnemyComment(enemy.id)}
                                    style={{
                                      flex: 1,
                                      background: 'rgba(0, 0, 0, 0.55)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      color: '#fca5a5',
                                      borderRadius: 4,
                                      padding: '4px 8px',
                                      fontSize: 11,
                                      fontStyle: 'italic'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAdminSaveEnemyComment(enemy.id)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.2)',
                                      border: '1px solid rgba(239, 68, 68, 0.5)',
                                      color: '#fca5a5',
                                      borderRadius: 4,
                                      padding: '2px 8px',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>

                              {/* Barras de HP e Vigor */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${hpPercent}%`, height: '100%', background: enemy.isBoss ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #dc2626, #ef4444)', transition: 'width 0.3s' }} />
                                </div>
                                <div style={{ height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ width: `${vigorPercent}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', transition: 'width 0.3s' }} />
                                </div>
                              </div>

                              {/* Botões de Desconto / Cura de HP do Inimigo */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Dano:</span>
                                {[-1, -5, -10, -20].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaEnemyHp(enemy.id, val)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.25)',
                                      border: '1px solid rgba(239, 68, 68, 0.6)',
                                      color: '#fca5a5',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {val}
                                  </button>
                                ))}

                                <span style={{ fontSize: 11, color: '#86efac', fontWeight: 600, marginLeft: 6 }}>Cura:</span>
                                {[1, 5, 10, 20].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaEnemyHp(enemy.id, val)}
                                    style={{
                                      background: 'rgba(34, 197, 94, 0.2)',
                                      border: '1px solid rgba(34, 197, 94, 0.5)',
                                      color: '#86efac',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    +{val}
                                  </button>
                                ))}
                              </div>

                              {/* Botões de Vigor do Inimigo */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>Vigor:</span>
                                {[-1, -2, -5].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaEnemyVigor(enemy.id, val)}
                                    style={{
                                      background: 'rgba(2, 132, 199, 0.2)',
                                      border: '1px solid rgba(56, 189, 248, 0.4)',
                                      color: '#7dd3fc',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {val}
                                  </button>
                                ))}
                                {[1, 2, 5].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAdminDeltaEnemyVigor(enemy.id, val)}
                                    style={{
                                      background: 'rgba(14, 165, 233, 0.25)',
                                      border: '1px solid rgba(56, 189, 248, 0.6)',
                                      color: '#bae6fd',
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    +{val}
                                  </button>
                                ))}

                                {/* Input Customizado */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                                  <input
                                    type="number"
                                    placeholder="Qtd"
                                    value={customVal}
                                    onChange={e => handleAdminSetDeltaInput(enemy.id, e.target.value)}
                                    style={{ width: 52, padding: '2px 6px', fontSize: 11, textAlign: 'center', background: '#111', border: '1px solid #444', color: '#fff', borderRadius: 4 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const amt = Number(customVal)
                                      if (amt) {
                                        handleAdminDeltaEnemyHp(enemy.id, -Math.abs(amt))
                                        handleAdminSetDeltaInput(enemy.id, '')
                                      }
                                    }}
                                    style={{ background: '#b91c1c', border: 'none', color: '#fff', padding: '2px 6px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    - Dano
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const amt = Number(customVal)
                                      if (amt) {
                                        handleAdminDeltaEnemyHp(enemy.id, Math.abs(amt))
                                        handleAdminSetDeltaInput(enemy.id, '')
                                      }
                                    }}
                                    style={{ background: '#15803d', border: 'none', color: '#fff', padding: '2px 6px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    + Cura
                                  </button>
                                </div>
                              </div>

                              {/* Status / Condições */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingTop: 4, borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                                {COMBAT_STATUS_EFFECTS.map(st => {
                                  const isActive = statusList.includes(st.id)
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={() => handleAdminToggleEnemyStatus(enemy.id, st.id)}
                                      style={{
                                        background: isActive ? `${st.color}33` : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${isActive ? st.color : 'rgba(255,255,255,0.1)'}`,
                                        color: isActive ? '#fff' : 'var(--text-muted)',
                                        borderRadius: 9999,
                                        padding: '2px 7px',
                                        fontSize: 10,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3
                                      }}
                                      title={st.desc}
                                    >
                                      <span>{st.icon}</span>
                                      <span>{st.label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID DUPLO: SELEÇÃO DE JOGADORES | CRIAÇÃO DE INIMIGOS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, marginTop: 20 }}>
                
                {/* 1. SELEÇÃO DE JOGADORES NA CENA */}
                <div style={{ background: 'rgba(22, 17, 31, 0.7)', padding: '18px', borderRadius: 14, border: '1px solid rgba(56,189,248,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: '#38bdf8' }}>
                      🛡️ Personagens na Cena ({selectedCombatPlayers.length})
                    </h4>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Marque os participantes</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                    {allPlayersList.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                        Nenhum personagem registrado no banco.
                      </p>
                    ) : (
                      allPlayersList.map(p => {
                        const isSelected = selectedCombatPlayers.includes(p.uid)
                        const vit = p.attributes?.vitalidade ?? 10
                        const hpMax = p.hpMax || calculateMaxHp(vit)
                        const hpCurrent = p.hpCurrent ?? hpMax
                        const vigorMax = p.vigorMax || calculateMaxVigor(vit)
                        const vigorCurrent = p.vigorCurrent ?? vigorMax
                        const name = p.chatName || p.characterName || p.nick || 'Viajante'

                        return (
                          <label
                            key={p.uid}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: isSelected ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? 'rgba(56,189,248,0.45)' : 'var(--accent-border)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCombatPlayers(prev => [...prev, p.uid])
                                } else {
                                  setSelectedCombatPlayers(prev => prev.filter(id => id !== p.uid))
                                }
                              }}
                              style={{ width: 'auto' }}
                            />
                            <span style={{ fontSize: 20 }}>{p.avatarUrl ? '👤' : '🧙'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{name}</strong>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                VIT: {vit} · FOR: {p.attributes?.forca ?? 10} · POD: {p.attributes?.poder ?? 10}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: hpCurrent <= 20 ? '#ef4444' : '#22c55e' }}>
                                {hpCurrent}/{hpMax} HP
                              </div>
                              <div style={{ fontSize: 10, color: '#38bdf8' }}>
                                {vigorCurrent}/{vigorMax} Vig
                              </div>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* 2. CRIAÇÃO & CONTROLE DE INIMIGOS (SEM PRESETS PADRÕES) */}
                <div style={{ background: 'rgba(22, 17, 31, 0.7)', padding: '18px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: '#f87171' }}>
                      👹 Inimigos no Combate ({combatEnemies.length})
                    </h4>
                  </div>

                  {/* Lista de Inimigos Cadastrados na Cena */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', marginBottom: 16 }}>
                    {combatEnemies.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                        Nenhum inimigo adicionado ainda. Preencha o formulário abaixo para cadastrar.
                      </p>
                    ) : (
                      combatEnemies.map(enemy => (
                        <div
                          key={enemy.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: enemy.isBoss ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${enemy.isBoss ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.2)'}`,
                            borderRadius: 8
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {enemy.avatarUrl ? (
                              <img
                                src={enemy.avatarUrl}
                                alt={enemy.name}
                                style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(239,68,68,0.35)', flexShrink: 0 }}
                                onError={e => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <span style={{ fontSize: 18 }}>{enemy.icon || '👹'}</span>
                            )}
                            <div>
                              <strong style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                                {enemy.name} {enemy.isBoss && <span className="boss-badge">👑 BOSS</span>}
                              </strong>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {enemy.maxHp} HP · {enemy.maxVigor} Vig · VIT: {enemy.attributes?.vitalidade ?? 10}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveEnemyFromCombat(enemy.id)}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                          >
                            ✕ Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Formulário de Adicionar Inimigo Customizado */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 10, border: '1px dashed rgba(239,68,68,0.3)' }}>
                    <strong style={{ fontSize: 12, color: '#fca5a5', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
                      + Cadastrar Inimigo / Criatura
                    </strong>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px', gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="Nome (ex: Guardião Sombrio)"
                        value={newEnemyForm.name}
                        onChange={e => setNewEnemyForm(prev => ({ ...prev, name: e.target.value }))}
                        className="combat-dark-input"
                        style={{ padding: '6px 10px', fontSize: 12 }}
                      />
                      <input
                        type="text"
                        placeholder="Ícone"
                        value={newEnemyForm.icon}
                        onChange={e => setNewEnemyForm(prev => ({ ...prev, icon: e.target.value }))}
                        className="combat-dark-input"
                        style={{ textAlign: 'center', padding: '6px 4px', fontSize: 12 }}
                      />
                    </div>

                    {/* URL da Foto / Avatar do Inimigo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {newEnemyForm.avatarUrl && (
                        <img
                          src={newEnemyForm.avatarUrl}
                          alt="Preview"
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 6,
                            objectFit: 'cover',
                            border: '1px solid rgba(239,68,68,0.4)',
                            flexShrink: 0
                          }}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      )}
                      <input
                        type="url"
                        placeholder="URL da foto/avatar do inimigo (opcional)"
                        value={newEnemyForm.avatarUrl}
                        onChange={e => setNewEnemyForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                        className="combat-dark-input"
                        style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>HP Total</label>
                        <input
                          type="number"
                          value={newEnemyForm.maxHp}
                          onChange={e => setNewEnemyForm(prev => ({ ...prev, maxHp: e.target.value }))}
                          className="combat-dark-input"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Vigor Total</label>
                        <input
                          type="number"
                          value={newEnemyForm.maxVigor}
                          onChange={e => setNewEnemyForm(prev => ({ ...prev, maxVigor: e.target.value }))}
                          className="combat-dark-input"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        />
                      </div>
                    </div>

                    {/* Atributos */}
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Atributos (FOR, DES, POD, SAB, VIT)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 10 }}>
                      {Object.keys(ATTRIBUTE_ICONS).map(attr => (
                        <div key={attr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{ATTRIBUTE_ICONS[attr].label}</span>
                          <input
                            type="number"
                            value={newEnemyForm[attr] ?? 10}
                            onChange={e => setNewEnemyForm(prev => ({ ...prev, [attr]: Number(e.target.value) }))}
                            className="combat-dark-input"
                            style={{ textAlign: 'center', padding: '4px 2px', fontSize: 11 }}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#fbbf24', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={newEnemyForm.isBoss}
                          onChange={e => setNewEnemyForm(prev => ({ ...prev, isBoss: e.target.checked }))}
                          style={{ width: 'auto' }}
                        />
                        👑 Chefe (Boss)
                      </label>

                      <button
                        type="button"
                        onClick={handleAddCustomEnemyToCombat}
                        className="btn btn-sm btn-primary"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                      >
                        + Adicionar ao Combate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </main>
        </div>
      )}
    </div>
  )
}
