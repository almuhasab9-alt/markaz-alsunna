#!/usr/bin/env node
// إنشاء (أو تحديث) حساب المدير في قاعدة D1 — بدون بيانات تجريبية
//
// الاستخدام:
//   node scripts/create-admin.mjs "اسم المدير" admin@نطاقك.com "كلمة مرور قوية"
//   node scripts/create-admin.mjs "اسم المدير" admin@test.com "123456" --local   ← على قاعدة التطوير المحلية
//
// التشفير مطابق تماماً لـ src/auth.ts (PBKDF2-SHA256، 100000 تكرار، ملح 8 بايتات hex)
// إن كان البريد موجوداً مسبقاً يحدّث كلمة المرور بدل إنشاء حساب مكرر.

import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const local = args.includes('--local')
const [name, email, password] = args.filter((a) => a !== '--local')

if (!name || !email || !password) {
  console.error('الاستخدام: node scripts/create-admin.mjs "اسم المدير" admin@نطاقك.com "كلمة مرور قوية" [--local]')
  process.exit(1)
}
if (password.length < 8) {
  console.error('❌ كلمة المرور يجب أن تكون 8 أحرف على الأقل (أقوى من الحد الأدنى في التطبيق لأنها حساب المدير)')
  process.exit(1)
}

const salt = randomBytes(8).toString('hex') // 16 حرفاً hex — مثل randomSalt()
const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
const q = (s) => `'` + String(s).replace(/'/g, `''`) + `'` // تهريب علامات الاقتباس في SQL

const sql = `INSERT INTO users (name, email, password_hash, salt, role) VALUES (${q(name)}, ${q(email.toLowerCase())}, ${q(hash)}, ${q(salt)}, 'admin') ON CONFLICT(email) DO UPDATE SET name=excluded.name, password_hash=excluded.password_hash, salt=excluded.salt, active=1;`

const target = local ? '--local' : '--remote'
console.log(local ? '📦 التطبيق على قاعدة التطوير المحلية...' : '☁️ التطبيق على قاعدة الإنتاج (webapp-production)...')

// تمرير SQL عبر ملف مؤقت — يتفادى مشاكل الاقتباس عبر الأنظمة كلها
const dir = mkdtempSync(path.join(tmpdir(), 'admin-'))
const file = path.join(dir, 'admin.sql')
writeFileSync(file, sql)
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'webapp-production', target, '--file', file], {
    stdio: 'inherit',
    cwd: root,
    shell: process.platform === 'win32', // npx على ويندوز يحتاج shell
  })
  console.log(`\n✅ تم! سجّل الدخول الآن بالبريد ${email.toLowerCase()} — ثم غيّر كلمة المرور من داخل التطبيق (زر ⚙️).`)
} catch {
  console.error('\n❌ فشل التنفيذ — تأكد أنك طبّقت migrations أولاً: npx wrangler d1 migrations apply webapp-production --remote')
  process.exitCode = 1
} finally {
  rmSync(dir, { recursive: true, force: true }) // حذف الملف المؤقت فوراً (يحتوي الهاش)
}
