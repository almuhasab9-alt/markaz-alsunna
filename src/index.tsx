import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { serveStatic } from 'hono/cloudflare-workers'
import { hashPassword, verifyPassword, randomToken, randomSalt } from './auth'

type Bindings = { DB: D1Database }

type UserRow = {
  id: number; name: string; email: string; password_hash: string; salt: string;
  role: 'admin' | 'teacher' | 'parent'; active: number
}

const app = new Hono<{ Bindings: Bindings; Variables: { user: UserRow } }>()

// ───────── ترويسات الأمان ─────────
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

// ───────── معالجة الأخطاء — لا نسرّب تفاصيل داخلية ─────────
app.onError((err, c) => {
  console.error(err)
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'حدث خطأ داخلي، حاول مجدداً' }, 500)
  return c.text('حدث خطأ غير متوقع', 500)
})

// ───────── تحديد معدل محاولات الدخول (حماية من التخمين) ─────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
function checkLoginRate(key: string): boolean {
  const now = Date.now()
  if (loginAttempts.size > 5000) loginAttempts.clear()
  const rec = loginAttempts.get(key)
  if (!rec || rec.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return true
  }
  rec.count += 1
  return rec.count <= 8
}

// ───────── أدوات التحقق من المدخلات ─────────
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
const isDate = (d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
const cleanPhone = (p: any): string | null => String(p ?? '').replace(/[^0-9+]/g, '').slice(0, 16) || null
const clampStr = (s: any, max = 120): string | null => String(s ?? '').trim().slice(0, max) || null
const clampNum = (v: any, min: number, max: number): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null
}

// ───────── التوقيت المحلي ─────────
// toISOString() و date('now') يرجعان UTC — أي تسجيل بعد 9 مساءً (+3) كان يؤرَّخ باليوم التالي خطأً
const TZ = 'Asia/Aden' // اليمن/السعودية UTC+3 بلا توقيت صيفي — غيّرها هنا إن لزم
const localDate = (d: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const todayStr = () => localDate()
const daysAgoStr = (n: number) => localDate(new Date(Date.now() - n * 864e5))

// ───────── المصادقة ─────────
async function getSessionUser(c: any): Promise<UserRow | null> {
  const token = getCookie(c, 'session')
  if (!token) return null
  const db: D1Database = c.env.DB
  const row = await db.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ? AND u.active = 1`
  ).bind(token, Date.now()).first<UserRow>()
  return row || null
}

const requireAuth = async (c: any, next: any) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: 'غير مسجّل الدخول' }, 401)
  c.set('user', user)
  await next()
}

const requireRole = (...roles: string[]) => async (c: any, next: any) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: 'غير مسجّل الدخول' }, 401)
  if (!roles.includes(user.role)) return c.json({ error: 'لا تملك الصلاحية' }, 403)
  c.set('user', user)
  await next()
}

// مساعد: حلقة المعلم الحالي
async function teacherCircleId(db: D1Database, userId: number): Promise<number | null> {
  const t = await db.prepare('SELECT id FROM teachers WHERE user_id = ?').bind(userId).first<any>()
  if (!t) return null
  const circle = await db.prepare('SELECT id FROM circles WHERE teacher_id = ?').bind(t.id).first<any>()
  return circle ? circle.id : null
}

// مساعد: هل الطالب ضمن حلقة المعلم؟ (المدير يملك كل شيء)
async function teacherOwnsStudent(db: D1Database, user: UserRow, studentId: any): Promise<boolean> {
  if (user.role === 'admin') return true
  const cid = await teacherCircleId(db, user.id)
  if (cid == null || !studentId) return false
  const s = await db.prepare('SELECT circle_id FROM students WHERE id = ?').bind(studentId).first<any>()
  return !!s && s.circle_id === cid
}

// تسجيل الدخول
app.post('/api/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  if (!checkLoginRate(ip)) {
    return c.json({ error: 'محاولات كثيرة جداً — انتظر 10 دقائق ثم حاول مجدداً' }, 429)
  }
  const { email, password } = await c.req.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return c.json({ error: 'أدخل البريد وكلمة المرور' }, 400)
  }
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND active = 1')
    .bind(email.trim().toLowerCase().slice(0, 120)).first<UserRow>()
  if (!user || !(await verifyPassword(password, user.salt, user.password_hash))) {
    return c.json({ error: 'بيانات الدخول غير صحيحة' }, 401)
  }
  const token = randomToken()
  const ttl = 1000 * 60 * 60 * 24 * 14 // 14 يوم
  // تنظيف الجلسات المنتهية (كانت تتراكم في الجدول بلا حذف)
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
    c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)')
      .bind(token, user.id, Date.now() + ttl),
  ])
  setCookie(c, 'session', token, {
    httpOnly: true, path: '/', maxAge: ttl / 1000, sameSite: 'Lax',
    secure: c.req.url.startsWith('https'),
  })
  return c.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

app.post('/api/logout', async (c) => {
  const token = getCookie(c, 'session')
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/me', requireAuth, (c) => {
  const u = c.get('user')
  return c.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } })
})

// تغيير كلمة المرور (لأي مستخدم مسجّل)
app.post('/api/change-password', requireAuth, async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const u = c.get('user')
  if (!b.current || !b.new_password) return c.json({ error: 'أدخل كلمة المرور الحالية والجديدة' }, 400)
  if (String(b.new_password).length < 6) return c.json({ error: 'كلمة المرور الجديدة 6 أحرف على الأقل' }, 400)
  const ok = await verifyPassword(b.current, u.salt, u.password_hash)
  if (!ok) return c.json({ error: 'كلمة المرور الحالية غير صحيحة' }, 400)
  const salt = randomSalt()
  const hash = await hashPassword(b.new_password, salt)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, u.id).run()
  // إبطال كل الجلسات الأخرى عدا الحالية
  const token = getCookie(c, 'session')
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').bind(u.id, token).run()
  return c.json({ ok: true })
})

app.get('/api/settings', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare('SELECT key, value FROM settings').all<any>()
  const obj: Record<string, string> = {}
  for (const r of rows.results) obj[r.key] = r.value
  return c.json(obj)
})

app.put('/api/settings', requireRole('admin'), async (c) => {
  const body = await c.req.json()
  for (const [k, v] of Object.entries(body)) {
    await c.env.DB.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .bind(k, String(v)).run()
  }
  return c.json({ ok: true })
})

// ───────── لوحة التحكم (إحصائيات لحظية) ─────────
app.get('/api/stats', requireRole('admin'), async (c) => {
  const db = c.env.DB
  const [students, teachers, circles, todayAtt, memStats, last7, perCircle, evalDist] = await db.batch([
    db.prepare('SELECT COUNT(*) c FROM students WHERE active = 1'),
    db.prepare('SELECT COUNT(*) c FROM teachers'),
    db.prepare('SELECT COUNT(*) c FROM circles'),
    db.prepare(`SELECT status, COUNT(*) c FROM attendance WHERE date = ? GROUP BY status`).bind(todayStr()),
    db.prepare(`SELECT COALESCE(SUM(CASE WHEN type='new' THEN parts_count END),0) parts, COUNT(*) entries FROM memorization`),
    db.prepare(`SELECT date, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) present, SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) absent, SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) late, SUM(CASE WHEN status='excused' THEN 1 ELSE 0 END) excused, COUNT(*) total FROM attendance WHERE date >= ? GROUP BY date ORDER BY date`).bind(daysAgoStr(6)),
    db.prepare(`SELECT c.name, COUNT(s.id) students FROM circles c LEFT JOIN students s ON s.circle_id = c.id AND s.active = 1 GROUP BY c.id ORDER BY c.id`),
    db.prepare(`SELECT evaluation, COUNT(*) c FROM memorization WHERE evaluation IS NOT NULL AND date >= ? GROUP BY evaluation`).bind(daysAgoStr(30)),
  ])
  const todayRows = todayAtt.results as any[]
  const todayTotal = todayRows.reduce((a, r) => a + r.c, 0)
  const todayPresent = todayRows.filter(r => r.status === 'present' || r.status === 'late').reduce((a, r) => a + r.c, 0)
  return c.json({
    students: (students.results[0] as any).c,
    teachers: (teachers.results[0] as any).c,
    circles: (circles.results[0] as any).c,
    today_attendance_rate: todayTotal ? Math.round((todayPresent / todayTotal) * 100) : 0,
    today: { total: todayTotal, present: todayPresent },
    total_parts: Math.round(((memStats.results[0] as any).parts as number) * 100) / 100,
    attendance_7days: last7.results,
    per_circle: perCircle.results,
    evaluations: evalDist.results,
  })
})

// ───────── الطلاب ─────────
app.get('/api/students', requireAuth, async (c) => {
  const u = c.get('user')
  let sql = `SELECT s.*, c.name circle_name, t.name teacher_name
    FROM students s LEFT JOIN circles c ON c.id = s.circle_id
    LEFT JOIN teachers t ON t.id = c.teacher_id WHERE s.active = 1`
  const params: any[] = []
  if (u.role === 'teacher') {
    const cid = await teacherCircleId(c.env.DB, u.id)
    sql += ' AND s.circle_id = ?'
    params.push(cid ?? -1)
  } else if (u.role === 'parent') {
    sql += ' AND s.parent_user_id = ?'
    params.push(u.id)
  }
  sql += ' ORDER BY s.name'
  const rows = await c.env.DB.prepare(sql).bind(...params).all<any>()
  return c.json(rows.results)
})

app.post('/api/students', requireRole('admin'), async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const name = clampStr(b.name, 100)
  if (!name) return c.json({ error: 'الاسم مطلوب' }, 400)
  const age = b.age != null && b.age !== '' ? clampNum(b.age, 3, 40) : null
  const r = await c.env.DB.prepare(
    `INSERT INTO students (name, age, parent_phone, parent_whatsapp, circle_id, notes) VALUES (?,?,?,?,?,?)`
  ).bind(name, age, cleanPhone(b.parent_phone), cleanPhone(b.parent_whatsapp), b.circle_id ? +b.circle_id : null, clampStr(b.notes, 500)).run()
  return c.json({ id: r.meta.last_row_id })
})

app.put('/api/students/:id', requireRole('admin'), async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const name = clampStr(b.name, 100)
  if (!name) return c.json({ error: 'الاسم مطلوب' }, 400)
  const age = b.age != null && b.age !== '' ? clampNum(b.age, 3, 40) : null
  await c.env.DB.prepare(
    `UPDATE students SET name=?, age=?, parent_phone=?, parent_whatsapp=?, circle_id=?, notes=? WHERE id=?`
  ).bind(name, age, cleanPhone(b.parent_phone), cleanPhone(b.parent_whatsapp), b.circle_id ? +b.circle_id : null, clampStr(b.notes, 500), c.req.param('id')).run()
  return c.json({ ok: true })
})

app.delete('/api/students/:id', requireRole('admin'), async (c) => {
  await c.env.DB.prepare('UPDATE students SET active = 0 WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ملف الطالب الكامل
app.get('/api/students/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const s = await c.env.DB.prepare(
    `SELECT s.*, c.name circle_name, t.name teacher_name FROM students s
     LEFT JOIN circles c ON c.id = s.circle_id LEFT JOIN teachers t ON t.id = c.teacher_id WHERE s.id = ?`
  ).bind(id).first<any>()
  if (!s) return c.json({ error: 'غير موجود' }, 404)
  const u = c.get('user')
  if (u.role === 'parent' && s.parent_user_id !== u.id) return c.json({ error: 'لا تملك الصلاحية' }, 403)
  if (u.role === 'teacher') {
    const cid = await teacherCircleId(c.env.DB, u.id)
    // cid == null يمنع أيضاً حالة «معلم بلا حلقة + طالب بلا حلقة» (كلاهما null كان يمر!)
    if (cid == null || s.circle_id !== cid) return c.json({ error: 'لا تملك الصلاحية' }, 403)
  }
  const [attendance, memorization, achievements, attSummary, parts] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 60').bind(id),
    c.env.DB.prepare('SELECT * FROM memorization WHERE student_id = ? ORDER BY date DESC, id DESC LIMIT 60').bind(id),
    c.env.DB.prepare('SELECT * FROM achievements WHERE student_id = ? ORDER BY date DESC').bind(id),
    c.env.DB.prepare(`SELECT status, COUNT(*) c FROM attendance WHERE student_id = ? GROUP BY status`).bind(id),
    c.env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN type='new' THEN parts_count END),0) total FROM memorization WHERE student_id = ?`).bind(id),
  ])
  return c.json({
    student: s,
    attendance: attendance.results,
    memorization: memorization.results,
    achievements: achievements.results,
    attendance_summary: attSummary.results,
    total_parts: (parts.results[0] as any).total,
  })
})

// ───────── المعلمون ─────────
app.get('/api/teachers', requireRole('admin'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT t.*, u.email, COUNT(s.id) students_count, c.name circle_name
     FROM teachers t LEFT JOIN users u ON u.id = t.user_id
     LEFT JOIN circles c ON c.teacher_id = t.id
     LEFT JOIN students s ON s.circle_id = c.id AND s.active = 1
     GROUP BY t.id ORDER BY t.name`
  ).all<any>()
  return c.json(rows.results)
})

app.post('/api/teachers', requireRole('admin'), async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (!b.name || !b.email || !b.password) return c.json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, 400)
  const email = String(b.email).trim().toLowerCase().slice(0, 120)
  if (!isEmail(email)) return c.json({ error: 'صيغة البريد الإلكتروني غير صحيحة' }, 400)
  if (String(b.password).length < 6) return c.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, 400)
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (exists) return c.json({ error: 'البريد مسجّل مسبقاً' }, 400)
  const salt = randomSalt()
  const hash = await hashPassword(b.password, salt)
  const ur = await c.env.DB.prepare('INSERT INTO users (name, email, password_hash, salt, role) VALUES (?,?,?,?,?)')
    .bind(clampStr(b.name, 100), email, hash, salt, 'teacher').run()
  const tr = await c.env.DB.prepare('INSERT INTO teachers (user_id, name, phone) VALUES (?,?,?)')
    .bind(ur.meta.last_row_id, b.name, b.phone ?? null).run()
  return c.json({ id: tr.meta.last_row_id, user_id: ur.meta.last_row_id })
})

app.put('/api/teachers/:id', requireRole('admin'), async (c) => {
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE teachers SET name = ?, phone = ? WHERE id = ?')
    .bind(b.name, b.phone ?? null, c.req.param('id')).run()
  if (b.password) {
    if (String(b.password).length < 6) return c.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, 400)
    const t = await c.env.DB.prepare('SELECT user_id FROM teachers WHERE id = ?').bind(c.req.param('id')).first<any>()
    if (t?.user_id) {
      const salt = randomSalt()
      const hash = await hashPassword(b.password, salt)
      await c.env.DB.prepare('UPDATE users SET password_hash = ?, salt = ?, name = ? WHERE id = ?')
        .bind(hash, salt, b.name, t.user_id).run()
    }
  }
  return c.json({ ok: true })
})

app.delete('/api/teachers/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id')
  const t = await c.env.DB.prepare('SELECT user_id FROM teachers WHERE id = ?').bind(id).first<any>()
  await c.env.DB.prepare('UPDATE circles SET teacher_id = NULL WHERE teacher_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM teachers WHERE id = ?').bind(id).run()
  if (t?.user_id) await c.env.DB.prepare('UPDATE users SET active = 0 WHERE id = ?').bind(t.user_id).run()
  return c.json({ ok: true })
})

// ───────── أولياء الأمور (إنشاء حساب وربطه بطالب) ─────────
app.post('/api/parents', requireRole('admin'), async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (!b.name || !b.email || !b.password || !b.student_id) return c.json({ error: 'كل الحقول مطلوبة' }, 400)
  const email = String(b.email).trim().toLowerCase().slice(0, 120)
  if (!isEmail(email)) return c.json({ error: 'صيغة البريد الإلكتروني غير صحيحة' }, 400)
  if (String(b.password).length < 6) return c.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, 400)
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (exists) return c.json({ error: 'البريد مسجّل مسبقاً' }, 400)
  const salt = randomSalt()
  const hash = await hashPassword(b.password, salt)
  const ur = await c.env.DB.prepare('INSERT INTO users (name, email, password_hash, salt, role) VALUES (?,?,?,?,?)')
    .bind(b.name, email, hash, salt, 'parent').run()
  await c.env.DB.prepare('UPDATE students SET parent_user_id = ? WHERE id = ?')
    .bind(ur.meta.last_row_id, b.student_id).run()
  return c.json({ id: ur.meta.last_row_id })
})

// ───────── الحلقات ─────────
app.get('/api/circles', requireAuth, async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT c.*, t.name teacher_name, COUNT(s.id) students_count
     FROM circles c LEFT JOIN teachers t ON t.id = c.teacher_id
     LEFT JOIN students s ON s.circle_id = c.id AND s.active = 1
     GROUP BY c.id ORDER BY c.id`
  ).all<any>()
  return c.json(rows.results)
})

app.post('/api/circles', requireRole('admin'), async (c) => {
  const b = await c.req.json()
  if (!b.name) return c.json({ error: 'اسم الحلقة مطلوب' }, 400)
  const r = await c.env.DB.prepare('INSERT INTO circles (name, teacher_id, time, days) VALUES (?,?,?,?)')
    .bind(b.name, b.teacher_id ?? null, b.time ?? null, b.days ?? null).run()
  return c.json({ id: r.meta.last_row_id })
})

app.put('/api/circles/:id', requireRole('admin'), async (c) => {
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE circles SET name=?, teacher_id=?, time=?, days=? WHERE id=?')
    .bind(b.name, b.teacher_id ?? null, b.time ?? null, b.days ?? null, c.req.param('id')).run()
  return c.json({ ok: true })
})

app.delete('/api/circles/:id', requireRole('admin'), async (c) => {
  await c.env.DB.prepare('UPDATE students SET circle_id = NULL WHERE circle_id = ?').bind(c.req.param('id')).run()
  await c.env.DB.prepare('DELETE FROM circles WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ───────── الحضور ─────────
// جلب حضور يوم معيّن (المعلم: حلقته فقط)
app.get('/api/attendance', requireAuth, async (c) => {
  const date = c.req.query('date') || todayStr()
  const u = c.get('user')
  let circleId = c.req.query('circle_id')
  if (u.role === 'teacher') {
    const cid = await teacherCircleId(c.env.DB, u.id)
    circleId = String(cid ?? -1)
  }
  let sql = `SELECT s.id student_id, s.name, s.circle_id, a.status, a.note
    FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
    WHERE s.active = 1`
  const params: any[] = [date]
  if (circleId) { sql += ' AND s.circle_id = ?'; params.push(circleId) }
  sql += ' ORDER BY s.name'
  const rows = await c.env.DB.prepare(sql).bind(...params).all<any>()
  return c.json({ date, rows: rows.results })
})

// حفظ حضور جماعي ليوم واحد
app.post('/api/attendance', requireRole('admin', 'teacher'), async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const date = isDate(b.date) ? b.date : todayStr()
  const items: any[] = Array.isArray(b.items) ? b.items.slice(0, 500) : []
  const u = c.get('user')
  if (!items.length) return c.json({ error: 'لا توجد بيانات' }, 400)
  // المعلم لا يسجّل حضور طلاب خارج حلقته
  if (u.role === 'teacher') {
    const cid = await teacherCircleId(c.env.DB, u.id)
    if (cid == null) return c.json({ error: 'حسابك غير مرتبط بحلقة' }, 403)
    const ids = [...new Set(items.map((i) => +i.student_id).filter(Boolean))]
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',')
      const res = await c.env.DB.prepare(
        `SELECT COUNT(*) c FROM students WHERE id IN (${placeholders}) AND circle_id = ?`
      ).bind(...ids, cid).first<any>()
      if (!res || res.c !== ids.length) return c.json({ error: 'لا يمكنك تسجيل حضور طلاب خارج حلقتك' }, 403)
    }
  }
  const stmts = items
    .filter((i) => ['present', 'absent', 'late', 'excused'].includes(i.status))
    .map((i) => c.env.DB.prepare(
      `INSERT INTO attendance (student_id, date, status, note, created_by) VALUES (?,?,?,?,?)
       ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status, note=excluded.note`
    ).bind(i.student_id, date, i.status, i.note ?? null, u.id))
  await c.env.DB.batch(stmts)
  return c.json({ ok: true, count: stmts.length })
})

// ───────── الحفظ والمراجعة ─────────
app.get('/api/memorization', requireAuth, async (c) => {
  const u = c.get('user')
  const date = c.req.query('date')
  let circleId = c.req.query('circle_id')
  if (u.role === 'teacher') {
    const cid = await teacherCircleId(c.env.DB, u.id)
    circleId = String(cid ?? -1)
  }
  let sql = `SELECT m.*, s.name student_name FROM memorization m JOIN students s ON s.id = m.student_id WHERE 1=1`
  const params: any[] = []
  if (date) { sql += ' AND m.date = ?'; params.push(date) }
  if (circleId) { sql += ' AND s.circle_id = ?'; params.push(circleId) }
  if (u.role === 'parent') { sql += ' AND s.parent_user_id = ?'; params.push(u.id) }
  sql += ' ORDER BY m.date DESC, m.id DESC LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all<any>()
  return c.json(rows.results)
})

app.post('/api/memorization', requireRole('admin', 'teacher'), async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (!b.student_id) return c.json({ error: 'الطالب مطلوب' }, 400)
  const u = c.get('user')
  if (!(await teacherOwnsStudent(c.env.DB, u, b.student_id))) {
    return c.json({ error: 'هذا الطالب ليس ضمن حلقتك' }, 403)
  }
  const date = isDate(b.date) ? b.date : todayStr()
  const parts = clampNum(b.parts_count ?? 0, 0, 1) ?? 0
  const evaluation = ['excellent', 'very_good', 'good', 'needs_review'].includes(b.evaluation) ? b.evaluation : null
  const r = await c.env.DB.prepare(
    `INSERT INTO memorization (student_id, date, type, surah_from, ayah_from, surah_to, ayah_to, parts_count, evaluation, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(+b.student_id, date, b.type === 'review' ? 'review' : 'new',
    clampStr(b.surah_from, 40), clampNum(b.ayah_from, 1, 286), clampStr(b.surah_to, 40), clampNum(b.ayah_to, 1, 286),
    parts, evaluation, clampStr(b.notes, 500), u.id).run()
  // إنجاز: إتمام سورة
  if (b.completed_surah) {
    await c.env.DB.prepare('INSERT INTO achievements (student_id, date, title, kind) VALUES (?,?,?,?)')
      .bind(+b.student_id, date, `أتم سورة ${clampStr(b.completed_surah, 40)}`, 'surah').run()
  }
  return c.json({ id: r.meta.last_row_id })
})

app.delete('/api/memorization/:id', requireRole('admin', 'teacher'), async (c) => {
  const row = await c.env.DB.prepare('SELECT student_id FROM memorization WHERE id = ?').bind(c.req.param('id')).first<any>()
  if (!row) return c.json({ error: 'السجل غير موجود' }, 404)
  const u = c.get('user')
  if (!(await teacherOwnsStudent(c.env.DB, u, row.student_id))) {
    return c.json({ error: 'لا تملك الصلاحية على هذا السجل' }, 403)
  }
  await c.env.DB.prepare('DELETE FROM memorization WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ───────── التقارير ─────────
app.get('/api/reports/center', requireRole('admin'), async (c) => {
  const from = c.req.query('from') || daysAgoStr(30)
  const to = c.req.query('to') || todayStr()
  const [att, mem, circles] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT date, status, COUNT(*) c FROM attendance WHERE date BETWEEN ? AND ? GROUP BY date, status ORDER BY date`).bind(from, to),
    c.env.DB.prepare(`SELECT m.date, s.name student_name, m.type, m.surah_from, m.surah_to, m.evaluation, m.parts_count FROM memorization m JOIN students s ON s.id = m.student_id WHERE m.date BETWEEN ? AND ? ORDER BY m.date DESC LIMIT 300`).bind(from, to),
    c.env.DB.prepare(`SELECT c.name, COUNT(DISTINCT s.id) students,
        SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) present,
        SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) absent
      FROM circles c LEFT JOIN students s ON s.circle_id = c.id AND s.active = 1
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date BETWEEN ? AND ?
      GROUP BY c.id`).bind(from, to),
  ])
  return c.json({ from, to, attendance: att.results, memorization: mem.results, circles: circles.results })
})

app.get('/api/reports/student/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const from = c.req.query('from') || daysAgoStr(30)
  const to = c.req.query('to') || todayStr()
  const s = await c.env.DB.prepare(
    `SELECT s.*, c.name circle_name, t.name teacher_name FROM students s
     LEFT JOIN circles c ON c.id = s.circle_id LEFT JOIN teachers t ON t.id = c.teacher_id WHERE s.id = ?`
  ).bind(id).first<any>()
  if (!s) return c.json({ error: 'غير موجود' }, 404)
  const u = c.get('user')
  if (u.role === 'parent' && s.parent_user_id !== u.id) return c.json({ error: 'لا تملك الصلاحية' }, 403)
  const [att, attSum, mem, ach] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM attendance WHERE student_id = ? AND date BETWEEN ? AND ? ORDER BY date').bind(id, from, to),
    c.env.DB.prepare('SELECT status, COUNT(*) c FROM attendance WHERE student_id = ? AND date BETWEEN ? AND ? GROUP BY status').bind(id, from, to),
    c.env.DB.prepare('SELECT * FROM memorization WHERE student_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').bind(id, from, to),
    c.env.DB.prepare('SELECT * FROM achievements WHERE student_id = ? ORDER BY date DESC').bind(id),
  ])
  return c.json({ from, to, student: s, attendance: att.results, attendance_summary: attSum.results, memorization: mem.results, achievements: ach.results })
})

app.get('/api/reports/circle/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id')
  const from = c.req.query('from') || daysAgoStr(30)
  const to = c.req.query('to') || todayStr()
  const circle = await c.env.DB.prepare(
    'SELECT c.*, t.name teacher_name FROM circles c LEFT JOIN teachers t ON t.id = c.teacher_id WHERE c.id = ?'
  ).bind(id).first<any>()
  if (!circle) return c.json({ error: 'غير موجودة' }, 404)
  const students = await c.env.DB.prepare(
    `SELECT s.id, s.name,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) present,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) absent,
      SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) late,
      SUM(CASE WHEN a.status='excused' THEN 1 ELSE 0 END) excused,
      (SELECT COALESCE(SUM(parts_count),0) FROM memorization m WHERE m.student_id = s.id AND m.type='new' AND m.date BETWEEN ? AND ?) parts
     FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.date BETWEEN ? AND ?
     WHERE s.circle_id = ? AND s.active = 1 GROUP BY s.id ORDER BY s.name`
  ).bind(from, to, from, to, id).all<any>()
  return c.json({ from, to, circle, students: students.results })
})

// ───────── مسارات API غير المعروفة — 404 JSON ─────────
app.all('/api/*', (c) => c.json({ error: 'المسار غير موجود' }, 404))

// ───────── الملفات الثابتة ─────────
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/manifest.webmanifest', serveStatic({ path: './public/manifest.webmanifest' }))
app.use('/sw.js', serveStatic({ path: './public/sw.js' }))
app.use('/favicon.ico', serveStatic({ path: './public/static/icon-192.png' }))

// الصفحة الرئيسية (SPA)
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0d5c4d">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>مركز السنة للعلوم الشرعية وتأهيل الدعاة</title>
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" type="image/png" href="/static/icon-192.png">
  <link rel="apple-touch-icon" href="/static/icon-192.png">
  <link rel="stylesheet" href="/static/tailwind.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <style>
    * { font-family: 'Cairo', sans-serif; -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body { background: #f4f7f6; }
    img { max-width: 100%; height: auto; }
    button, a { touch-action: manipulation; }
    input, select, textarea { font-size: 16px; } /* منع التكبير التلقائي في iOS */
    .islamic-pattern { background-image: radial-gradient(circle at 50% 50%, rgba(13,92,77,.06) 1px, transparent 1px); background-size: 22px 22px; }
    .gold-gradient { background: linear-gradient(135deg, #d4af37, #b8942a); }
    .primary-gradient { background: linear-gradient(135deg, #0f766e, #0a4a3f); }
    .card { background: white; border-radius: 1rem; box-shadow: 0 2px 12px rgba(13,92,77,.08); border: 1px solid #e5efed; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .75rem; font-weight: 700; transition: all .2s; cursor: pointer; border: none; }
    .btn:active { transform: scale(.96); }
    .btn-primary { background: linear-gradient(135deg, #0f766e, #0a4a3f); color: white; padding: .65rem 1.25rem; box-shadow: 0 4px 12px rgba(13,92,77,.25); }
    .btn-gold { background: linear-gradient(135deg, #d4af37, #b8942a); color: white; padding: .65rem 1.25rem; box-shadow: 0 4px 12px rgba(212,175,55,.3); }
    .btn-outline { border: 2px solid #0f766e; color: #0f766e; padding: .6rem 1.1rem; background: white; }
    .input { width: 100%; border: 2px solid #dbe8e5; border-radius: .75rem; padding: .65rem .9rem; outline: none; transition: border .2s; background: white; }
    .input:focus { border-color: #0f766e; }
    .badge { padding: .2rem .65rem; border-radius: 999px; font-size: .75rem; font-weight: 700; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(6,44,38,.5); backdrop-filter: blur(3px); z-index: 60; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .fade-in { animation: fadeIn .25s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    #splash { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(160deg, #0f766e 0%, #0a4a3f 60%, #062c26 100%); transition: opacity .6s; }
    .splash-logo { animation: splashPulse 1.6s ease-in-out infinite; }
    @keyframes splashPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .progress-bar { height: .6rem; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #d4af37, #0f766e); transition: width .6s; }
    .att-btn { flex: 1; padding: .5rem .2rem; border-radius: .6rem; font-size: .72rem; font-weight: 700; border: 2px solid transparent; cursor: pointer; transition: all .15s; background: #f1f5f4; color: #64748b; }
    .att-btn.active-present { background: #d1fae5; color: #047857; border-color: #10b981; }
    .att-btn.active-absent { background: #fee2e2; color: #b91c1c; border-color: #ef4444; }
    .att-btn.active-late { background: #fef3c7; color: #b45309; border-color: #f59e0b; }
    .att-btn.active-excused { background: #e0e7ff; color: #4338ca; border-color: #818cf8; }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: .65rem; color: #94a3b8; padding: .4rem .6rem; border-radius: .75rem; transition: all .2s; cursor: pointer; }
    .nav-item.active { color: #0d5c4d; background: #d7ece8; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #b0d9d1; border-radius: 999px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body class="islamic-pattern">
  <div id="splash">
    <img src="/static/logo.png" alt="مركز السنة" class="splash-logo" style="width:220px;max-width:70vw;background:white;border-radius:1.5rem;padding:1rem;box-shadow:0 20px 60px rgba(0,0,0,.35)">
    <div class="text-white mt-6 font-black text-xl text-center px-4">مركز السنة للعلوم الشرعية وتأهيل الدعاة</div>
    <div class="text-gold-300 mt-2 text-sm text-center px-4">﴿ خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ ﴾</div>
    <noscript><div class="text-white mt-4 font-bold">فعّل JavaScript لاستخدام التطبيق</div></noscript>
  </div>
  <div id="app"></div>
  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
