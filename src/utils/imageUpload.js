/**
 * Utilitário para upload de imagens via Cloudinary (Unsigned Upload Preset).
 * Faz compressão inteligente no cliente antes do envio para economizar banda e acelerar o upload.
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'z3cr8lix'
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'zona_zero'

/**
 * Converte um File ou Blob para Base64 Data URL.
 */
function fileToDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (typeof fileOrBlob === 'string') return resolve(fileOrBlob)
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(fileOrBlob)
  })
}

/**
 * Redimensiona e otimiza imagens no cliente antes do envio.
 */
async function compressImageClientSide(fileOrBase64, maxWidth = 1920, maxHeight = 1080, quality = 0.85) {
  if (fileOrBase64 instanceof File && (fileOrBase64.type === 'image/svg+xml' || fileOrBase64.type === 'image/gif')) {
    return fileOrBase64
  }
  if (typeof fileOrBase64 === 'string' && (fileOrBase64.startsWith('data:image/svg') || fileOrBase64.startsWith('data:image/gif'))) {
    return fileOrBase64
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      let { width, height } = img

      if (width <= maxWidth && height <= maxHeight && (fileOrBase64.size && fileOrBase64.size < 400 * 1024)) {
        return resolve(fileOrBase64)
      }

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          resolve(fileOrBase64)
        }
      }, 'image/webp', quality)
    }

    img.onerror = () => resolve(fileOrBase64)

    if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
      img.src = URL.createObjectURL(fileOrBase64)
    } else {
      img.src = fileOrBase64
    }
  })
}

/**
 * Upload direto ao Cloudinary (Unsigned Upload Preset).
 */
async function uploadDirectToCloudinary(fileOrBase64) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Configuração do Cloudinary ausente.')
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

  if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
    const formData = new FormData()
    formData.append('file', fileOrBase64)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.secure_url) {
      throw new Error(data.error?.message || 'Falha no upload direto ao Cloudinary.')
    }
    return data.secure_url
  } else {
    const dataUrl = await fileToDataUrl(fileOrBase64)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: dataUrl,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.secure_url) {
      throw new Error(data.error?.message || 'Falha no upload direto ao Cloudinary.')
    }
    return data.secure_url
  }
}

/**
 * Envia imagem para hospedagem no Cloudinary.
 * @param {File|Blob|string} fileOrBase64
 * @param {number} maxRetries
 * @returns {Promise<string>} URL HTTPS da imagem hospedada
 */
export async function uploadImageFree(fileOrBase64, maxRetries = 2) {
  if (!fileOrBase64) throw new Error('Nenhum arquivo fornecido.')

  if (fileOrBase64 instanceof File && !fileOrBase64.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado deve ser uma imagem válida (PNG, JPG, WEBP, GIF, SVG).')
  }

  const payloadFile = await compressImageClientSide(fileOrBase64)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const directUrl = await uploadDirectToCloudinary(payloadFile)
      if (directUrl) return directUrl
    } catch (directErr) {
      console.warn(`[Upload Cloudinary] Tentativa ${attempt} falhou:`, directErr.message)
      if (attempt >= maxRetries) {
        throw new Error(`Erro no upload: ${directErr.message}`)
      }
      await new Promise((r) => setTimeout(r, 1200 * attempt))
    }
  }

  throw new Error('Falha ao processar upload da imagem.')
}

export async function uploadBase64ToCloudinary(base64String) {
  if (!base64String || typeof base64String !== 'string' || !base64String.startsWith('data:image')) {
    return base64String
  }
  return await uploadImageFree(base64String)
}
