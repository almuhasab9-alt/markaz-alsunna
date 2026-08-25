// أدوات المصادقة — PBKDF2 (Web Crypto) متوافقة مع seed.sql
// seed.sql استخدم: pbkdf2_hmac('sha256', pw, bytes.fromhex('73756e6e6132303236'), 100000)
// أي أن الملح هو السلسلة النصية "sunna2026" بعد تحويلها لبايتات hex — هنا نستخدم نفس البايتات كنص

const encoder = new TextEncoder()

async function pbkdf2Hex(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 },
    key,
    256
  )
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return pbkdf2Hex(password, salt)
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computed = await pbkdf2Hex(password, salt)
  if (computed.length !== hash.length) return false
  // مقارنة زمنية-ثابتة (متوفرة في Workers runtime) — تمنع استنتاج كلمة المرور من زمن المقارنة
  const enc = new TextEncoder()
  return (crypto.subtle as any).timingSafeEqual(enc.encode(computed), enc.encode(hash))
}

export function randomToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomSalt(): string {
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}
