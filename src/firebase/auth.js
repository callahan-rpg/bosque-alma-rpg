import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  onAuthStateChanged,
} from 'firebase/auth'
import { ref, get, set, update } from 'firebase/database'
import app, { rtdb } from './config'

export const auth = getAuth(app)

/**
 * Normaliza o nick: minúsculas, remove espaços, apenas alfanuméricos e hífens.
 */
export function normalizeNick(nick) {
  if (!nick) return ''
  return nick
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
}

/**
 * Converte um nick em um email interno válido para o Firebase Auth.
 * O usuário nunca vê esse email — só vê o nick.
 */
export function nickToEmail(nick) {
  const normalized = normalizeNick(nick)
  return `${normalized}@jardim.rpg`
}

/**
 * Gera uma senha interna e determinística para a conta do Firebase Auth.
 * Isso permite gerenciar a autenticação internamente sem depender de 2FA ou e-mails externos.
 */
function getInternalAuthPassword(nick) {
  const norm = normalizeNick(nick)
  return `ArcanaJardim_${norm}_!2026Key`
}

/**
 * Gera um hash SHA-256 seguro da senha usando a Web Crypto API nativa.
 */
export async function hashPassword(password) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + '_jardim_alma_salt_2026')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback se crypto.subtle não estiver disponível
  let hash = 0
  const str = password + '_jardim_salt_fallback'
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return String(hash)
}

/**
 * Registra um novo usuário com nick + senha.
 * Cria a conta no Firebase Auth e salva as credenciais no nó auth_users do RTDB.
 */
export async function registerWithNick(nick, password) {
  if (!nick || nick.trim().length < 2) {
    throw new Error('O nick deve ter pelo menos 2 caracteres.')
  }
  if (nick.trim().length > 30) {
    throw new Error('O nick deve ter no máximo 30 caracteres.')
  }
  if (!password || password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.')
  }

  const norm = normalizeNick(nick)
  if (!norm) {
    throw new Error('Nick inválido. Use letras e números.')
  }

  // Verifica se o nick já está registrado no RTDB
  if (rtdb) {
    try {
      const credSnap = await get(ref(rtdb, `auth_users/${norm}`))
      if (credSnap.exists()) {
        throw new Error('Este nick já está em uso. Escolha outro.')
      }
    } catch (err) {
      if (err.message && err.message.includes('em uso')) throw err
      // Continua se for erro transitório de rede
    }
  }

  const email = nickToEmail(nick)
  const internalPass = getInternalAuthPassword(nick)
  const passHash = await hashPassword(password)

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, internalPass)
    // Salva o nick original como displayName
    await updateProfile(credential.user, { displayName: nick.trim() })

    // Salva as credenciais no RTDB para controle de senha e redefinição simples
    if (rtdb) {
      await set(ref(rtdb, `auth_users/${norm}`), {
        nick: nick.trim(),
        normalized: norm,
        passwordHash: passHash,
        uid: credential.user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    return credential.user
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('Este nick já está em uso. Escolha outro.')
    }
    if (err.code === 'auth/invalid-email') {
      throw new Error('Nick inválido. Use apenas letras, números e hífens.')
    }
    throw err
  }
}

/**
 * Faz login com nick + senha.
 * Valida a senha contra o hash registrado e autentica no Firebase Auth.
 */
export async function loginWithNick(nick, password) {
  if (!nick || !password) {
    throw new Error('Preencha o nick e a senha.')
  }

  const norm = normalizeNick(nick)
  const email = nickToEmail(nick)
  const internalPass = getInternalAuthPassword(nick)
  const passHash = await hashPassword(password)

  // 1. Verifica se temos as credenciais salvas no RTDB
  let credData = null
  if (rtdb) {
    try {
      const snap = await get(ref(rtdb, `auth_users/${norm}`))
      if (snap.exists()) {
        credData = snap.val()
      }
    } catch (err) {
      console.warn('[auth] Aviso ao consultar credenciais no RTDB:', err)
    }
  }

  // Se existe no RTDB, valida a senha informada
  if (credData && credData.passwordHash) {
    if (credData.passwordHash !== passHash) {
      throw new Error('Nick ou senha incorretos.')
    }

    // Senha confere! Tenta logar no Firebase Auth com a senha interna padronizada
    try {
      const credential = await signInWithEmailAndPassword(auth, email, internalPass)
      return credential.user
    } catch (fbErr) {
      // Se falhar por senha errada no Firebase (ex: conta antiga criada com a senha digitada pelo usuário)
      if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
        try {
          const fallbackCred = await signInWithEmailAndPassword(auth, email, password)
          // Atualiza a senha no Firebase Auth para a senha interna padronizada
          await updatePassword(fallbackCred.user, internalPass).catch(() => {})
          return fallbackCred.user
        } catch {
          throw new Error('Nick ou senha incorretos.')
        }
      }
      throw fbErr
    }
  }

  // 2. Fallback para contas legadas criadas antes da tabela de credenciais
  try {
    // Tenta primeiro com a senha interna (caso já estivesse no novo padrão)
    const credential = await signInWithEmailAndPassword(auth, email, internalPass)
    // Registra no RTDB para futuras consultas
    if (rtdb) {
      await set(ref(rtdb, `auth_users/${norm}`), {
        nick: nick.trim(),
        normalized: norm,
        passwordHash: passHash,
        uid: credential.user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }).catch(() => {})
    }
    return credential.user
  } catch (err) {
    // Se falhar, tenta com a senha digitada diretamente
    try {
      const legacyCred = await signInWithEmailAndPassword(auth, email, password)
      // Migra para a senha interna padronizada
      await updatePassword(legacyCred.user, internalPass).catch(() => {})
      if (rtdb) {
        await set(ref(rtdb, `auth_users/${norm}`), {
          nick: nick.trim(),
          normalized: norm,
          passwordHash: passHash,
          uid: legacyCred.user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }).catch(() => {})
      }
      return legacyCred.user
    } catch (finalErr) {
      if (
        finalErr.code === 'auth/user-not-found' ||
        finalErr.code === 'auth/wrong-password' ||
        finalErr.code === 'auth/invalid-credential'
      ) {
        throw new Error('Nick ou senha incorretos.')
      }
      if (finalErr.code === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas. Aguarde um momento antes de tentar novamente.')
      }
      throw finalErr
    }
  }
}

/**
 * Redefine a senha de um viajante informando apenas o Nick e a Nova Senha.
 * Atualiza o hash no nó auth_users do RTDB e conecta automaticamente o usuário ao portal.
 */
export async function resetPasswordWithNick(nick, newPassword) {
  if (!nick || nick.trim().length < 2) {
    throw new Error('Informe o nick do viajante.')
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('A nova senha deve ter pelo menos 6 caracteres.')
  }

  const norm = normalizeNick(nick)
  if (!norm) {
    throw new Error('Nick inválido.')
  }

  const email = nickToEmail(nick)
  const internalPass = getInternalAuthPassword(nick)
  const newPassHash = await hashPassword(newPassword)

  // 1. Procura o usuário no RTDB
  let existingCred = null
  if (rtdb) {
    try {
      const snap = await get(ref(rtdb, `auth_users/${norm}`))
      if (snap.exists()) {
        existingCred = snap.val()
      }
    } catch (err) {
      console.warn('[auth] Erro ao buscar usuário para reset:', err)
    }
  }

  // 2. Se não encontrou no RTDB, tenta verificar se o usuário existe no Firebase Auth
  if (!existingCred) {
    // Tenta autenticar com a internalPass
    try {
      const testCred = await signInWithEmailAndPassword(auth, email, internalPass)
      existingCred = {
        nick: nick.trim(),
        normalized: norm,
        uid: testCred.user.uid,
      }
    } catch (testErr) {
      // Se deu usuário não encontrado, avisa
      if (testErr.code === 'auth/user-not-found') {
        throw new Error('Nick não encontrado. Verifique se digitou corretamente ou crie uma conta.')
      }
      // Se deu wrong-password, o usuário existe no Firebase Auth com senha legada
      if (testErr.code === 'auth/wrong-password' || testErr.code === 'auth/invalid-credential') {
        existingCred = {
          nick: nick.trim(),
          normalized: norm,
        }
      }
    }
  }

  if (!existingCred && !rtdb) {
    throw new Error('Não foi possível conectar ao banco para redefinir a senha.')
  }

  // 3. Atualiza ou cria a entrada de credencial com o novo hash de senha no RTDB
  if (rtdb) {
    await update(ref(rtdb, `auth_users/${norm}`), {
      nick: existingCred?.nick || nick.trim(),
      normalized: norm,
      passwordHash: newPassHash,
      updatedAt: Date.now(),
    })
  }

  // 4. Conecta o usuário no Firebase Auth
  try {
    const cred = await signInWithEmailAndPassword(auth, email, internalPass)
    return cred.user
  } catch (loginErr) {
    // Se a conta no Firebase Auth ainda estiver com a senha antiga legada e não sabemos a senha antiga
    // O hash já foi atualizado com sucesso no RTDB para a nova senha!
    console.info('[auth] Senha redefinida no registro do viajante.')
    return null
  }
}

/**
 * Desloga o usuário atual.
 */
export async function logout() {
  await signOut(auth)
}

/**
 * Observa mudanças no estado de autenticação.
 * Retorna função de unsubscribe.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}
