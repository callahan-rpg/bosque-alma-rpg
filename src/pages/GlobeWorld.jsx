import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import '../styles/globe-world.css'

// ══════════════════════════════════════════════════════════════════════════════
// NOISE — 3D Value Noise + FBM (Fractal Brownian Motion)
// Usando coordenadas esféricas (sx,sy,sz) para wrapping perfeito no equador
// ══════════════════════════════════════════════════════════════════════════════

const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/** Hash determinístico de coordenadas inteiras 3D → valor em [0,1] */
function hash3(ix, iy, iz) {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Value Noise trilinear interpolado (sem artefatos de gradiente) */
function vn3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi)
  return lerp(
    lerp(lerp(hash3(xi,   yi,   zi  ), hash3(xi+1, yi,   zi  ), xf),
         lerp(hash3(xi,   yi+1, zi  ), hash3(xi+1, yi+1, zi  ), xf), yf),
    lerp(lerp(hash3(xi,   yi,   zi+1), hash3(xi+1, yi,   zi+1), xf),
         lerp(hash3(xi,   yi+1, zi+1), hash3(xi+1, yi+1, zi+1), xf), yf),
    zf
  )
}

/** Fractal Brownian Motion em 3D */
function fbm(x, y, z, oct = 5, p = 0.50, l = 2.05) {
  let val = 0, amp = 1, freq = 1, max = 0
  for (let i = 0; i < oct; i++) {
    val += amp * vn3(x * freq, y * freq, z * freq)
    max += amp
    amp  *= p
    freq *= l
  }
  return val / max
}

// ══════════════════════════════════════════════════════════════════════════════
// PALETA DE BIOMAS — Fantasia com zonas arcanas, vulcânicas e cristalinas
// ══════════════════════════════════════════════════════════════════════════════

function biomeColor(h, absLat, moist, magic, volc) {
  // Temperatura estimada: decresce com latitude e altitude
  const temp = clamp(1 - absLat * 0.9 - Math.max(0, h - 0.52) * 1.3, 0, 1)

  // ── Oceano ───────────────────────────────────────────────
  if (h < 0.34)  return [4,  10,  42]   // Abismo oceânico
  if (h < 0.42)  return [8,  28,  92]   // Oceano profundo (azul escuro)
  if (h < 0.47)  return [14, 60, 134]   // Oceano médio
  if (h < 0.50)  return [24, 98, 164]   // Águas rasas
  if (h < 0.515) return [44, 142, 188]  // Lagoa / recife
  if (h < 0.525) return [192, 164, 102] // Praia de areia dourada

  // ── Altitudes elevadas ───────────────────────────────────
  if (h > 0.92)  return [248, 252, 255] // Picos nevados
  if (h > 0.85)  return [210, 218, 232] // Montanhas cobertas de neve
  if (h > 0.78)  return [152, 140, 130] // Montanhas rochosas (cinza ardósia)
  if (h > 0.72)  return [110, 94, 82]   // Planalto acidentado

  // ── Zona vulcânica (rocha incandescente) ─────────────────
  if (volc > 0.72 && h < 0.78 && temp > 0.2) {
    const t = clamp((volc - 0.72) * 4, 0, 1)
    return [
      Math.round(lerp(140, 225, t)),
      Math.round(lerp(38,  58,  t)),
      Math.round(lerp(10,  5,   t))
    ]
  }

  // ── Floresta arcana / zona mágica ────────────────────────
  if (magic > 0.70 && moist > 0.40 && h < 0.72) {
    const t = clamp((magic - 0.70) * 3.5, 0, 1)
    return [
      Math.round(lerp(40,  68, t)),
      Math.round(lerp(65,  18, t)),
      Math.round(lerp(55, 120, t))
    ] // Transição de verde musgo → roxo arcano
  }

  // ── Campos de cristal etéreo ─────────────────────────────
  if (magic > 0.79 && h > 0.55 && h < 0.72) {
    return [58, 178, 196] // Cyan cristalino
  }

  // ── Tundra / regiões polares ─────────────────────────────
  if (absLat > 0.72) {
    return moist > 0.40 ? [185, 198, 210] : [205, 218, 228]
  }

  // ── Biomas tropicais ─────────────────────────────────────
  if (temp > 0.68) {
    if (moist > 0.58) return [18,  84,  22]  // Floresta tropical densa
    if (moist > 0.40) return [44, 118,  38]  // Floresta tropical
    if (moist < 0.28) return [188, 150,  68] // Deserto quente
    if (moist < 0.38) return [152, 165,  54] // Savana
    return [80, 152, 44]                      // Floresta tropical rala
  }

  // ── Biomas temperados ─────────────────────────────────────
  if (moist > 0.60) return [22,  88,  32]  // Floresta densa
  if (moist > 0.46) return [42, 118,  44]  // Floresta temperada
  if (moist > 0.32) return [88, 148,  58]  // Planície / prado
  if (moist > 0.20) return [138, 155, 64]  // Estepe / savana fria
  return [185, 155, 90]                     // Estepe árida
}

// ══════════════════════════════════════════════════════════════════════════════
// GERAÇÃO DE TEXTURAS PROCEDURAIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Gera textura do mundo fictício (512×256) via noise 3D em coordenadas esféricas.
 * Wrapping perfeito sem costuras no equador ou nos meridianos.
 * Tempo estimado: ~150ms num CPU moderno.
 */
function generateFantasyTexture(W = 512, H = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  const d = img.data

  for (let py = 0; py < H; py++) {
    const lat   = (0.5 - py / (H - 1)) * Math.PI // +π/2 (norte) → -π/2 (sul)
    const absLat = Math.abs(lat) / (Math.PI / 2)
    const cosLat = Math.cos(lat)
    const sinLat = Math.sin(lat)

    for (let px = 0; px < W; px++) {
      const lon = (px / (W - 1)) * Math.PI * 2 - Math.PI

      // Ponto na esfera unitária (eliminim costuras)
      const sx = cosLat * Math.cos(lon)
      const sy = sinLat
      const sz = cosLat * Math.sin(lon)

      // Camadas de ruído com seeds diferentes
      const h  = fbm(sx * 2.2,        sy * 2.2,        sz * 2.2,        5, 0.50, 2.05)
      const mo = fbm(sx * 3.0 + 10.0, sy * 3.0 + 10.0, sz * 3.0 + 10.0, 3, 0.55, 2.0 )
      const mg = fbm(sx * 4.5 + 30.0, sy * 4.5 - 20.0, sz * 4.5 + 15.0, 3, 0.50, 2.0 )
      const vl = fbm(sx * 5.0 - 40.0, sy * 5.0 + 25.0, sz * 5.0 - 10.0, 3, 0.60, 2.2 )

      const [r, g, b] = biomeColor(h, absLat, mo, mg, vl)
      const idx = (py * W + px) * 4
      d[idx    ] = clamp(r, 0, 255)
      d[idx + 1] = clamp(g, 0, 255)
      d[idx + 2] = clamp(b, 0, 255)
      d[idx + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

/** Gera textura de nuvens semi-transparentes para a camada de atmosfera */
function generateCloudTexture(W = 1024, H = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  for (let i = 0; i < 140; i++) {
    const cx = Math.random() * W
    const cy = Math.random() * H
    const rx = 18 + Math.random() * 60
    const ry = 9  + Math.random() * 24
    const alpha = 0.12 + Math.random() * 0.28
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry))
    grd.addColorStop(0,   `rgba(255,255,255,${alpha})`)
    grd.addColorStop(0.4, `rgba(255,255,255,${alpha * 0.5})`)
    grd.addColorStop(1,   'rgba(255,255,255,0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  return new THREE.CanvasTexture(canvas)
}

// ══════════════════════════════════════════════════════════════════════════════
// MARCADORES DOS MUNDOS RPG NO MUNDO FICTÍCIO
// ══════════════════════════════════════════════════════════════════════════════

const FANTASY_MARKERS = [
  {
    id: 'jardim',
    name: 'Jardim do Crepúsculo',
    realm: 'Bosque de Alma',
    regionName: '🌿 Floresta Etérea do Ocidente',
    lat: 18, lon: -55,
    color: '#10b981', glowColor: '#6ee7b7',
    emoji: '🌿',
    route: '/location/jardim-do-crepusculo',
    isExternal: false,
    description: 'O coração mágico do bosque de Alma Koskovic',
  },
  {
    id: 'cyberpunk',
    name: 'Sentinela 1',
    realm: 'Cidadela Orbital',
    regionName: '🪐 Arquipélago das Torres de Cristal',
    lat: -5, lon: 20,
    color: '#00f0ff', glowColor: '#7ffeff',
    emoji: '🪐',
    route: '/cyberpunk',
    isExternal: false,
    description: 'Cidadela espacial suspensa no éter intergaláctico',
  },
  {
    id: 'gottlich',
    name: 'Santuário Göttlich',
    realm: 'Áustria Mágica',
    regionName: '🏔️ Montanhas Sagradas do Leste',
    lat: 42, lon: 38,
    color: '#d97706', glowColor: '#fcd34d',
    emoji: '🏛️',
    url: 'https://acgottlich.wixsite.com/acg-rpg/santuario',
    isExternal: true,
    description: 'O Santuário da Magia, oculto nas montanhas sagradas',
  },
  {
    id: 'zona-zero',
    name: 'Zona-Zero',
    realm: 'Oriente Médio Pós-Apocalíptico',
    regionName: '☣️ Deserto das Cinzas Malditas',
    lat: -18, lon: 62,
    color: '#ef4444', glowColor: '#fca5a5',
    emoji: '☣️',
    url: 'https://zona-zero-three.vercel.app/',
    isExternal: true,
    description: 'Terra devastada e consagrada ao caos',
  },
  {
    id: 'legrand',
    name: 'Instituto Legrand',
    realm: 'França Nobre',
    regionName: '🏰 Costa dos Castelos Dourados',
    lat: 38, lon: -12,
    color: '#6366f1', glowColor: '#a5b4fc',
    emoji: '🏰',
    url: 'https://institutolegrandrp.wixsite.com/instituto-legrand',
    isExternal: true,
    description: 'Academia encantada na costa nobre do velho mundo',
  },
  {
    id: 'pokemon',
    name: 'Mundo Pokémon',
    realm: 'Região Elemental',
    regionName: '🏝️ Ilhas Elementais do Leste',
    lat: -32, lon: 110,
    color: '#6b7280', glowColor: '#9ca3af',
    emoji: '🚧',
    isUnderConstruction: true,
    description: 'Arquipélago elemental — em exploração',
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS THREE.JS
// ══════════════════════════════════════════════════════════════════════════════

function latLonToXYZ(lat, lon, r) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

function createMarkerSprite(world) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Halo externo
  const grd = ctx.createRadialGradient(size/2, size/2, 2, size/2, size/2, size/2)
  grd.addColorStop(0,    world.glowColor + 'ff')
  grd.addColorStop(0.35, world.color     + 'cc')
  grd.addColorStop(0.7,  world.color     + '44')
  grd.addColorStop(1,    'transparent')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)

  // Núcleo branco
  ctx.beginPath()
  ctx.arc(size/2, size/2, 10, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.33, 0.33, 1)
  sprite.userData = { world }
  return sprite
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

const GLOBE_RADIUS = 1.8

export default function GlobeWorld() {
  const mountRef = useRef(null)
  const navigate = useNavigate()

  const [hoveredWorld,  setHoveredWorld]  = useState(null)
  const [selectedWorld, setSelectedWorld] = useState(null)
  const [tooltipPos,    setTooltipPos]    = useState({ x: 0, y: 0 })
  const [isLoaded,      setIsLoaded]      = useState(false)
  const [genStatus,     setGenStatus]     = useState('Inicializando cena...')

  const isDragging  = useRef(false)
  const prevMouse   = useRef({ x: 0, y: 0 })
  const autoRotate  = useRef(true)
  const autoTimeout = useRef(null)
  const globeGroup  = useRef(null)
  const cloudMesh   = useRef(null)
  const raycaster   = useRef(new THREE.Raycaster())
  const mouse       = useRef(new THREE.Vector2())
  const markerList  = useRef([])
  const rendererRef = useRef(null)
  const cameraRef   = useRef(null)
  const frameRef    = useRef(null)

  const handleWorldClick = useCallback((world) => {
    if (!world) return
    if (world.isUnderConstruction) { setSelectedWorld(world); return }
    if (world.isExternal && world.url) {
      window.open(world.url, '_blank', 'noopener,noreferrer')
    } else if (world.route) {
      navigate(world.route)
    }
  }, [navigate])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    // Campo de estrelas (6k pontos)
    const starsGeo = new THREE.BufferGeometry()
    const sPos = new Float32Array(6000 * 3)
    for (let i = 0; i < sPos.length; i++) sPos[i] = (Math.random() - 0.5) * 400
    starsGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.22, transparent: true, opacity: 0.82
    })))

    // Nébula de fundo com canvas gradiente
    const nebulaCanvas = document.createElement('canvas')
    nebulaCanvas.width = nebulaCanvas.height = 512
    const nc = nebulaCanvas.getContext('2d')
    const ng = nc.createRadialGradient(256, 256, 10, 256, 256, 256)
    ng.addColorStop(0, 'rgba(60,20,180,0.22)')
    ng.addColorStop(0.4, 'rgba(15,60,160,0.12)')
    ng.addColorStop(1, 'rgba(0,0,0,0)')
    nc.fillStyle = ng; nc.fillRect(0, 0, 512, 512)
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(180, 32, 32),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(nebulaCanvas),
        side: THREE.BackSide, transparent: true, opacity: 0.7, depthWrite: false
      })
    ))

    // ── Iluminação ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x112233, 0.8))
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.2)
    sunLight.position.set(5, 3, 5)
    scene.add(sunLight)
    // Luz de preenchimento azul (lado noturno)
    const fillLight = new THREE.DirectionalLight(0x0033aa, 0.4)
    fillLight.position.set(-5, -2, -3)
    scene.add(fillLight)

    // ── Câmera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.z = 5
    cameraRef.current = camera

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Globo: placeholder cinza enquanto a textura gera ──────────────────
    const geoGlobe = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64)
    const matGlobe = new THREE.MeshPhongMaterial({
      color: 0x223355,
      shininess: 18,
    })
    const earthMesh = new THREE.Mesh(geoGlobe, matGlobe)

    const group = new THREE.Group()
    group.add(earthMesh)
    globeGroup.current = group
    scene.add(group)

    // ── Atmosfera (shader de fresnel) ──────────────────────────────────────
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0,0,1)), 3.0);
          vec3 glow = mix(vec3(0.2, 0.6, 1.0), vec3(0.5, 0.2, 0.8), intensity * 0.5);
          gl_FragColor = vec4(glow, 1.0) * intensity;
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.028, 64, 32),
      atmoMat
    ))

    // ── Marcadores de mundos ───────────────────────────────────────────────
    const sprites = []
    FANTASY_MARKERS.forEach((world) => {
      const pos = latLonToXYZ(world.lat, world.lon, GLOBE_RADIUS + 0.05)
      const sprite = createMarkerSprite(world)
      sprite.position.copy(pos)
      group.add(sprite)
      sprites.push(sprite)
    })
    markerList.current = sprites

    // ── Animação ───────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const dt = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      if (autoRotate.current) group.rotation.y += dt * 0.06

      // Nuvens giram independente
      if (cloudMesh.current) cloudMesh.current.rotation.y += dt * 0.02

      // Pulsação dos marcadores
      sprites.forEach((s, i) => {
        const pulse = 0.85 + 0.18 * Math.sin(elapsed * 2.1 + i * 1.15)
        s.scale.set(0.33 * pulse, 0.33 * pulse, 1)
      })

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Interação (drag e hover) ───────────────────────────────────────────
    const onPointerDown = (e) => {
      isDragging.current = true
      const p = e.touches ? e.touches[0] : e
      prevMouse.current = { x: p.clientX, y: p.clientY }
      autoRotate.current = false
      clearTimeout(autoTimeout.current)
    }

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect()
      const p = e.touches ? e.touches[0] : e
      mouse.current.x = ((p.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.current.y = -((p.clientY - rect.top)  / rect.height) * 2 + 1

      if (!isDragging.current) {
        raycaster.current.setFromCamera(mouse.current, camera)
        const hits = raycaster.current.intersectObjects(sprites, false)
        if (hits.length > 0) {
          setHoveredWorld(hits[0].object.userData.world)
          setTooltipPos({ x: p.clientX, y: p.clientY })
          container.style.cursor = 'pointer'
        } else {
          setHoveredWorld(null)
          container.style.cursor = 'grab'
        }
        return
      }

      const dx = p.clientX - prevMouse.current.x
      const dy = p.clientY - prevMouse.current.y
      prevMouse.current = { x: p.clientX, y: p.clientY }
      group.rotation.y += dx * 0.006
      group.rotation.x  = clamp(group.rotation.x + dy * 0.006, -Math.PI / 3, Math.PI / 3)
    }

    const onPointerUp = (e) => {
      if (!isDragging.current) return
      isDragging.current = false
      container.style.cursor = 'grab'
      autoTimeout.current = setTimeout(() => { autoRotate.current = true }, 4000)

      raycaster.current.setFromCamera(mouse.current, camera)
      const hits = raycaster.current.intersectObjects(sprites, false)
      if (hits.length > 0) handleWorldClick(hits[0].object.userData.world)
    }

    container.addEventListener('mousedown',  onPointerDown)
    container.addEventListener('mousemove',  onPointerMove)
    container.addEventListener('mouseup',    onPointerUp)
    container.addEventListener('touchstart', onPointerDown, { passive: true })
    container.addEventListener('touchmove',  onPointerMove, { passive: true })
    container.addEventListener('touchend',   onPointerUp)
    container.addEventListener('contextmenu', (e) => e.preventDefault())

    // ── Gera textura procedural do mundo fictício (assíncrono) ─────────────
    // Delay de 120ms para que o React renderize o estado de loading antes
    setGenStatus('Mapeando continentes arcanos...')
    const genTimeout = setTimeout(() => {
      setGenStatus('Calculando biomas e fluxos de magia...')
      const fantasyTex = generateFantasyTexture(512, 256)
      matGlobe.map     = fantasyTex
      matGlobe.color   = new THREE.Color(0xffffff)
      matGlobe.needsUpdate = true

      setGenStatus('Gerando camada de nuvens...')
      const cloudTex = generateCloudTexture(1024, 512)
      const cloudMat = new THREE.MeshPhongMaterial({
        map:         cloudTex,
        transparent: true,
        opacity:     0.42,
        depthWrite:  false,
        blending:    THREE.NormalBlending,
      })
      const cm = new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS * 1.012, 64, 32),
        cloudMat
      )
      group.add(cm)
      cloudMesh.current = cm

      setIsLoaded(true)
    }, 120)

    return () => {
      clearTimeout(genTimeout)
      clearTimeout(autoTimeout.current)
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      container.removeEventListener('mousedown',   onPointerDown)
      container.removeEventListener('mousemove',   onPointerMove)
      container.removeEventListener('mouseup',     onPointerUp)
      container.removeEventListener('touchstart',  onPointerDown)
      container.removeEventListener('touchmove',   onPointerMove)
      container.removeEventListener('touchend',    onPointerUp)
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [handleWorldClick])

  return (
    <div className="globe-page">
      {/* Header */}
      <header className="globe-header">
        <button type="button" className="globe-back-btn" onClick={() => navigate('/mundos')}>
          ‹ Portais
        </button>

        <div className="globe-title-group">
          <span className="globe-title-icon">🗺️</span>
          <div>
            <h1 className="globe-title">Arcanum Mundi</h1>
            <p className="globe-subtitle">O Mundo Fictício do Multiverso RPG — gire e explore</p>
          </div>
        </div>

        <div className="globe-hint">
          🖱️ Arraste para girar · 📍 Clique para viajar
        </div>
      </header>

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="globe-loading">
          <div className="globe-loading-orb" />
          <span className="globe-loading-text">{genStatus}</span>
          <div className="globe-loading-bar">
            <div className="globe-loading-fill" />
          </div>
        </div>
      )}

      {/* Three.js canvas */}
      <div
        ref={mountRef}
        className={`globe-canvas-wrap ${isLoaded ? 'loaded' : ''}`}
        style={{ cursor: 'grab' }}
      />

      {/* Tooltip ao hover */}
      {hoveredWorld && (
        <div
          className="globe-tooltip"
          style={{ left: tooltipPos.x + 20, top: tooltipPos.y - 12, '--world-color': hoveredWorld.color }}
        >
          <span className="globe-tooltip-emoji">{hoveredWorld.emoji}</span>
          <div>
            <div className="globe-tooltip-name">{hoveredWorld.name}</div>
            <div className="globe-tooltip-realm">{hoveredWorld.regionName}</div>
            <div className="globe-tooltip-action">
              {hoveredWorld.isUnderConstruction
                ? '🚧 Em desenvolvimento'
                : hoveredWorld.isExternal
                  ? '↗ Abrir mundo externo'
                  : '→ Entrar no domínio'}
            </div>
          </div>
        </div>
      )}

      {/* Modal de mundo em construção */}
      {selectedWorld?.isUnderConstruction && (
        <div className="globe-modal-backdrop" onClick={() => setSelectedWorld(null)}>
          <div className="globe-modal" onClick={(e) => e.stopPropagation()}>
            <span className="globe-modal-emoji">🚧</span>
            <h2>{selectedWorld.name}</h2>
            <p>{selectedWorld.description}</p>
            <p className="globe-modal-soon">Este domínio ainda está sendo moldado pelos mestres do multiverso.</p>
            <button className="globe-modal-close" onClick={() => setSelectedWorld(null)}>Fechar</button>
          </div>
        </div>
      )}

      {/* Legenda inferior */}
      <div className="globe-legend">
        {FANTASY_MARKERS.map((w) => (
          <button
            key={w.id}
            className="globe-legend-item"
            style={{ '--wc': w.color }}
            onClick={() => handleWorldClick(w)}
            title={w.name}
          >
            <span className="globe-legend-dot" />
            <span className="globe-legend-emoji">{w.emoji}</span>
            <span className="globe-legend-name">{w.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
