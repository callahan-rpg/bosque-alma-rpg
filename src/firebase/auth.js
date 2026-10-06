import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'
import app from './config'

export const auth = getAuth(app)

/**
 * Converte um nick em um email interno válido para o Firebase Auth.
 * O usuário nunca vê esse email — só vê o nick.
 */
function nickToEmail(nick) {
  // Normaliza: minúsculas, remove espaços, só alfanumérico + hífens
  const normalized = nick
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
  return `${normalized}@jardim.rpg`
}

/**
 * Registra um novo usuário com nick + senha.
 * O nick vira o displayName e o email é derivado automaticamente.
 */
export async function registerWithNick(nick, password) {
  if (!nick || nick.trim().length < 2) {
    throw new Error('O nick deve ter pelo menos 2 caracteres.')
  }
  if (nick.trim().length > 30) {
    throw new Error('O nick deve ter no máximo 30 caracteres.')
  }
  if (password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.')
  }

  const email = nickToEmail(nick)

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    // Salva o nick original como displayName
    await updateProfile(credential.user, { displayName: nick.trim() })
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
 */
export async function loginWithNick(nick, password) {
  if (!nick || !password) {
    throw new Error('Preencha o nick e a senha.')
  }

  const email = nickToEmail(nick)

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  } catch (err) {
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/invalid-credential'
    ) {
      throw new Error('Nick ou senha incorretos.')
    }
    if (err.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas. Aguarde um momento antes de tentar novamente.')
    }
    throw err
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
