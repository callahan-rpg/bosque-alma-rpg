import { useEffect, useRef } from 'react'

/**
 * GalaxyBackground — Shader Cósmico Volumétrico (Raymarching WebGL / GLSL)
 * Renderiza em tempo real na GPU uma galáxia cósmica com:
 * - Estrelas perfeitamente redondas com anti-aliasing subpixel (sem quadriculados)
 * - 3 camadas de estrelas com paralaxe 3D e cintilação natural
 * - Vórtice espiral com nuvens de poeira cósmica volumétrica
 * - Núcleo estelar super-luminoso com halo dourado e braços magenta/azul
 */

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// Hash 2D -> 1D determinístico e uniforme
float hash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Hash 3D -> 1D para ruído volumétrico
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.1, 0.1));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// Ruído 3D suave baseado em gradientes
float noise(vec3 x) {
  vec3 p = floor(x);
  vec3 w = fract(x);
  vec3 u = w * w * (3.0 - 2.0 * w);

  float n000 = hash3(p + vec3(0.0, 0.0, 0.0));
  float n100 = hash3(p + vec3(1.0, 0.0, 0.0));
  float n010 = hash3(p + vec3(0.0, 1.0, 0.0));
  float n110 = hash3(p + vec3(1.0, 1.0, 0.0));
  float n001 = hash3(p + vec3(0.0, 0.0, 1.0));
  float n101 = hash3(p + vec3(1.0, 0.0, 1.0));
  float n011 = hash3(p + vec3(0.0, 1.0, 1.0));
  float n111 = hash3(p + vec3(1.0, 1.0, 1.0));

  float x00 = mix(n000, n100, u.x);
  float x10 = mix(n010, n110, u.x);
  float x01 = mix(n001, n101, u.x);
  float x11 = mix(n011, n111, u.x);

  float y0 = mix(x00, x10, u.y);
  float y1 = mix(x01, x11, u.y);

  return mix(y0, y1, u.z);
}

// Matriz de rotação 3D para o Fractal Brownian Motion (fBm)
const mat3 m3 = mat3(
   0.00,  0.80,  0.60,
  -0.80,  0.36, -0.48,
  -0.60, -0.48,  0.64
);

float fbm(vec3 p) {
  float f = 0.0;
  f += 0.5000 * noise(p); p = m3 * p * 2.02;
  f += 0.2500 * noise(p); p = m3 * p * 2.03;
  f += 0.1250 * noise(p); p = m3 * p * 2.01;
  f += 0.0625 * noise(p);
  return f;
}

// Mapeamento de densidade volumétrica da galáxia
float mapDensity(vec3 p, out vec3 outColor) {
  float r = length(p.xz);

  // Rotação em vórtice espiral
  float spinSpeed = u_time * 0.045;
  float angle = r * -0.55 + spinSpeed;
  float sa = sin(angle);
  float ca = cos(angle);

  vec3 q = p;
  q.xz = mat2(ca, -sa, sa, ca) * q.xz;

  // Achatamento no disco galáctico
  float disk = exp(-abs(q.y) * 2.2);

  // Braços espirais logarítmicos
  float theta = atan(q.z, q.x);
  float armVal = sin(theta * 2.0 - log(max(r, 0.08)) * 3.2);
  float arms = smoothstep(-0.35, 0.75, armVal);

  // Turbulência de poeira cósmica via fBm
  vec3 fbmCoord = q * 1.35 + vec3(0.0, u_time * 0.012, 0.0);
  float gasNoise = fbm(fbmCoord);

  // Densidade final da névoa
  float density = gasNoise * disk * (0.35 + 0.65 * arms);
  density *= smoothstep(3.8, 0.4, r);

  // Paleta de cores cósmicas
  vec3 colOuter = vec3(0.12, 0.03, 0.28);
  vec3 colArms1 = vec3(0.85, 0.18, 0.65);
  vec3 colArms2 = vec3(0.15, 0.55, 0.95);
  vec3 colCore  = vec3(1.00, 0.88, 0.65);

  vec3 armCol = mix(colArms1, colArms2, sin(r * 3.0 + u_time * 0.1) * 0.5 + 0.5);
  vec3 baseCol = mix(colOuter, armCol, smoothstep(0.15, 0.65, gasNoise));
  outColor = mix(baseCol, colCore, exp(-r * 1.8));

  return max(density, 0.0);
}

// ─── GERADOR DE ESTRELAS PURAMENTE CIRCULARES (SEM QUADRICULADOS) ────
// Usa grid Voronoi 3x3 de vizinhança contínua e decaimento Gaussiano perfeito
vec3 renderStars(vec2 uvCoord, vec2 mouseOffset) {
  vec3 total = vec3(0.0);

  // CAMADA 1: Microestrelas densas de fundo (milhares de pontos finos redondos)
  {
    vec2 st = (uvCoord + mouseOffset * 0.06) * 110.0;
    vec2 cell = floor(st);
    vec2 f = fract(st);

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 c = cell + g;
        float h = hash2(c);
        if (h > 0.68) {
          vec2 pos = g + vec2(hash2(c + 1.3), hash2(c + 5.7)) * 0.7 + 0.15;
          float d = length(f - pos);
          float flicker = sin(u_time * (2.0 + h * 3.0) + h * 30.0) * 0.35 + 0.65;
          // Decaimento Gaussiano puro e pontual: sem cantos quadrados
          float star = exp(-d * d * 900.0);
          vec3 col = mix(vec3(0.85, 0.95, 1.0), vec3(1.0, 0.95, 0.85), fract(h * 13.0));
          total += col * star * flicker * 0.9;
        }
      }
    }
  }

  // CAMADA 2: Estrelas médias cintilantes com halos redondos e cores espectrais
  {
    vec2 st = (uvCoord + mouseOffset * 0.14) * 45.0;
    vec2 cell = floor(st);
    vec2 f = fract(st);

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 c = cell + g;
        float h = hash2(c);
        if (h > 0.82) {
          vec2 pos = g + vec2(hash2(c + 2.1), hash2(c + 8.9)) * 0.7 + 0.15;
          vec2 delta = f - pos;
          float d = length(delta);
          float flicker = sin(u_time * (2.5 + h * 2.0) + h * 50.0) * 0.4 + 0.6;
          float star = exp(-d * d * 400.0) * 1.6;
          float halo = exp(-d * 16.0) * 0.25;
          vec3 col = mix(vec3(0.65, 0.85, 1.0), vec3(1.0, 0.88, 0.65), fract(h * 17.0));
          if (fract(h * 31.0) > 0.75) col = vec3(1.0, 0.75, 0.95);
          total += col * (star + halo) * flicker * 1.25;
        }
      }
    }
  }

  // CAMADA 3: Grandes estrelas luminosas com halo circular difuso
  {
    vec2 st = (uvCoord + mouseOffset * 0.24) * 18.0;
    vec2 cell = floor(st);
    vec2 f = fract(st);

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 c = cell + g;
        float h = hash2(c);
        if (h > 0.90) {
          vec2 pos = g + vec2(hash2(c + 3.4), hash2(c + 9.2)) * 0.6 + 0.2;
          vec2 delta = f - pos;
          float d = length(delta);
          float flicker = sin(u_time * 1.8 + h * 40.0) * 0.3 + 0.7;
          float core = exp(-d * d * 220.0) * 2.4;
          float halo = exp(-d * 8.0) * 0.45;
          vec3 col = mix(vec3(0.8, 0.95, 1.0), vec3(1.0, 0.9, 0.7), fract(h * 11.0));
          total += col * (core + halo) * flicker * 1.6;
        }
      }
    }
  }

  return total;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

  // Câmera 3D com inclinação e reação suave ao mouse (paralaxe)
  vec2 mouseNorm = (u_mouse - 0.5) * 0.8;
  vec3 ro = vec3(mouseNorm.x * 0.8, 1.45 + mouseNorm.y * 0.5, 3.2);
  vec3 ta = vec3(0.0, 0.0, 0.0);

  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);

  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.25 * ww);

  // Fundo cósmico profundo
  vec3 col = vec3(0.015, 0.012, 0.035);

  // Campo de estrelas perfeitamente circulares de fundo
  vec3 stars = renderStars(uv, mouseNorm);
  col += stars * 0.9;

  // ─── RAYMARCHING VOLUMÉTRICO DA GALÁXIA ────────────────────────────
  const int STEPS = 36;
  float tmin = 0.8;
  float tmax = 5.6;
  float dt = (tmax - tmin) / float(STEPS);

  float dither = hash3(vec3(gl_FragCoord.xy, u_time)) * dt;
  float t = tmin + dither;

  vec3 accumColor = vec3(0.0);
  float transmittance = 1.0;

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;

    vec3 sampleCol;
    float density = mapDensity(p, sampleCol);

    if (density > 0.01) {
      float stepExtinction = density * dt * 2.8;
      float stepTrans = exp(-stepExtinction);

      accumColor += sampleCol * density * transmittance * dt * 3.4;
      transmittance *= stepTrans;

      if (transmittance < 0.02) break;
    }

    t += dt;
  }

  col += accumColor;

  // Estrelas frontais nítidas brilhando através e na frente dos gases
  col += stars * 1.1;

  // ─── BRILHO DO NÚCLEO GALÁCTICO ────────────────────────────────────
  float b = dot(ro, rd);
  float c = dot(ro, ro);
  float dClosest = sqrt(max(c - b * b, 0.0));

  float coreGlow = exp(-dClosest * 2.8) * 1.1;
  vec3 coreGlowCol = vec3(1.0, 0.85, 0.62) * coreGlow;

  float diffuseGlow = exp(-dClosest * 1.2) * 0.48;
  vec3 diffuseGlowCol = vec3(0.55, 0.25, 0.85) * diffuseGlow;

  col += coreGlowCol + diffuseGlowCol;

  // ─── TONEMAPPING E VINHETA ─────────────────────────────────────────
  col = col / (1.0 + col);
  col = pow(col, vec3(0.92));

  float vignette = 1.0 - length(uv) * 0.45;
  col *= max(vignette, 0.0);

  gl_FragColor = vec4(col, 1.0);
}
`

export default function GalaxyBackground() {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const mouseRef  = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl =
      canvas.getContext('webgl', { antialias: true, powerPreference: 'high-performance' }) ||
      canvas.getContext('experimental-webgl')

    if (!gl) {
      console.warn('WebGL não suportado no navegador.')
      return
    }

    function createShader(gl, type, source) {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Erro de compilação no Shader:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE)

    if (!vertShader || !fragShader) return

    const program = gl.createProgram()
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Erro de linkage do programa WebGL:', gl.getProgramInfoLog(program))
      return
    }

    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    )

    const aPosition = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uTime       = gl.getUniformLocation(program, 'u_time')
    const uMouse      = gl.getUniformLocation(program, 'u_mouse')

    // Resolução nítida para telas de alta densidade (Retina/FullHD/4K)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0)
      const w = Math.floor(window.innerWidth * dpr)
      const h = Math.floor(window.innerHeight * dpr)

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w
        canvas.height = h
        canvas.style.width  = window.innerWidth + 'px'
        canvas.style.height = window.innerHeight + 'px'
        gl.viewport(0, 0, w, h)
      }
    }

    window.addEventListener('resize', resize)
    resize()

    const handleMouseMove = (e) => {
      mouseRef.current.tx = e.clientX / window.innerWidth
      mouseRef.current.ty = 1.0 - e.clientY / window.innerHeight
    }
    window.addEventListener('mousemove', handleMouseMove)

    const startTime = performance.now()

    const render = () => {
      const m = mouseRef.current
      m.x += (m.tx - m.x) * 0.04
      m.y += (m.ty - m.y) * 0.04

      const currentTime = (performance.now() - startTime) * 0.001

      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, currentTime)
      gl.uniform2f(uMouse, m.x, m.y)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      if (gl) {
        gl.deleteProgram(program)
        gl.deleteShader(vertShader)
        gl.deleteShader(fragShader)
        gl.deleteBuffer(positionBuffer)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        display: 'block',
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
      }}
      aria-hidden="true"
    />
  )
}
