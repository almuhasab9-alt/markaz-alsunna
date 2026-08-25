/* تطبيق مركز السنة — SPA */
'use strict'

// ───────── الحالة العامة ─────────
const state = {
  user: null,
  settings: {},
  page: 'dashboard',
  pageParams: {},
  charts: {},
}

const SURAHS = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس']

const ATT_LABELS = { present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بإذن' }
const ATT_COLORS = { present: '#10b981', absent: '#ef4444', late: '#f59e0b', excused: '#818cf8' }
const EVAL_LABELS = { excellent: 'ممتاز', very_good: 'جيد جداً', good: 'جيد', needs_review: 'يحتاج مراجعة' }
const EVAL_COLORS = { excellent: 'bg-emerald-100 text-emerald-700', very_good: 'bg-teal-100 text-teal-700', good: 'bg-amber-100 text-amber-700', needs_review: 'bg-red-100 text-red-700' }

const $ = (sel) => document.querySelector(sel)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
// التوقيت المحلي (اليمن/السعودية UTC+3) — toISOString كان يرجع UTC فيؤرّخ ما بعد 9 مساءً باليوم التالي
const TZ = 'Asia/Aden'
const localDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const today = () => localDate()
const daysAgo = (n) => localDate(new Date(Date.now() - n * 864e5))

async function api(method, url, data) {
  try {
    const res = await axios({ method, url, data })
    return res.data
  } catch (err) {
    const msg = err.response?.data?.error || 'حدث خطأ في الاتصال'
    if (err.response?.status === 401 && state.user) { state.user = null; render() }
    throw new Error(msg)
  }
}

function toast(msg, ok = true) {
  const el = document.createElement('div')
  el.className = `fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[90] px-5 py-3 rounded-xl text-white font-bold shadow-2xl fade-in ${ok ? 'bg-primary-700' : 'bg-red-600'}`
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2600)
}

// ───────── شاشة تسجيل الدخول ─────────
function loginView() {
  return `
  <div class="min-h-screen flex items-center justify-center p-4 primary-gradient relative overflow-hidden">
    <div class="absolute inset-0 opacity-10" style="background-image:radial-gradient(circle at 20% 30%, #d4af37 2px, transparent 2px),radial-gradient(circle at 80% 70%, #d4af37 2px, transparent 2px);background-size:60px 60px"></div>
    <div class="card w-full max-w-md p-6 md:p-8 relative z-10 fade-in" style="border-top:5px solid #d4af37">
      <div class="text-center mb-6">
        <img src="/static/logo.png" alt="شعار مركز السنة" class="mx-auto" style="width:150px;max-width:60vw">
        <h1 class="text-lg md:text-2xl font-black text-primary-800 mt-4" id="login-center-name">${esc(state.settings.center_name || 'مركز السنة للعلوم الشرعية وتأهيل الدعاة')}</h1>
        <p class="text-gold-600 font-bold text-sm mt-1">${esc(state.settings.center_sub || '')}</p>
      </div>
      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-primary-800 mb-1"><i class="fas fa-envelope ml-1 text-gold-500"></i>البريد الإلكتروني</label>
          <input type="email" id="login-email" class="input" placeholder="admin@test.com" required dir="ltr" style="text-align:right">
        </div>
        <div>
          <label class="block text-sm font-bold text-primary-800 mb-1"><i class="fas fa-lock ml-1 text-gold-500"></i>كلمة المرور</label>
          <input type="password" id="login-password" class="input" placeholder="••••••" required dir="ltr" style="text-align:right">
        </div>
        <div id="login-error" class="hidden text-red-600 text-sm font-bold bg-red-50 rounded-lg p-2 text-center"></div>
        <button type="submit" class="btn btn-primary w-full text-lg" id="login-btn">
          <i class="fas fa-right-to-bracket"></i> تسجيل الدخول
        </button>
      </form>
      <div class="mt-6 bg-gold-50 border border-gold-200 rounded-xl p-3 text-xs text-gold-800 leading-6">
        <b><i class="fas fa-circle-info ml-1"></i>حسابات تجريبية</b> (غيّر كلمات المرور بعد الدخول):
        <div class="grid grid-cols-1 gap-1 mt-1" dir="ltr" style="text-align:left;font-size:11px">
          <div>admin@test.com / 123456 — مدير</div>
          <div>teacher1@test.com / 123456 — معلم</div>
          <div>parent1@test.com / 123456 — ولي أمر</div>
        </div>
      </div>
    </div>
  </div>`
}

function bindLogin() {
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = $('#login-btn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...'
    try {
      const data = await api('post', '/api/login', {
        email: $('#login-email').value,
        password: $('#login-password').value,
      })
      state.user = data.user
      state.page = 'dashboard'
      render()
    } catch (err) {
      const box = $('#login-error')
      box.textContent = err.message
      box.classList.remove('hidden')
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> تسجيل الدخول'
    }
  })
}

// ───────── الهيكل العام ─────────
const NAV_ITEMS = {
  admin: [
    ['dashboard', 'الرئيسية', 'fa-gauge-high'],
    ['students', 'الطلاب', 'fa-user-graduate'],
    ['teachers', 'المعلمون', 'fa-chalkboard-user'],
    ['circles', 'الحلقات', 'fa-mosque'],
    ['reports', 'التقارير', 'fa-file-lines'],
  ],
  teacher: [
    ['dashboard', 'الرئيسية', 'fa-gauge-high'],
    ['attendance', 'الحضور', 'fa-clipboard-check'],
    ['memorization', 'الحفظ', 'fa-book-open-reader'],
    ['students', 'طلابي', 'fa-user-graduate'],
  ],
  parent: [
    ['dashboard', 'متابعة الابن', 'fa-child-reaching'],
  ],
}

function shell(content) {
  const nav = NAV_ITEMS[state.user.role] || []
  return `
  <div class="min-h-screen pb-24 md:pb-6">
    <header class="primary-gradient text-white sticky top-0 z-40 shadow-lg no-print">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <img src="/static/logo.png" alt="الشعار" class="bg-white rounded-lg p-1" style="height:44px;width:auto">
        <div class="flex-1 min-w-0">
          <div class="font-black text-xs md:text-base truncate" style="line-height:1.4">${esc(state.settings.center_name || 'مركز السنة')}</div>
          <div class="text-gold-300 text-xs truncate">${esc(state.user.name)} — ${{ admin: 'المدير', teacher: 'معلم', parent: 'ولي أمر' }[state.user.role]}</div>
        </div>
        <button id="change-pw-btn" class="btn bg-white/15 hover:bg-white/25 text-white px-3 py-2 text-sm" title="تغيير كلمة المرور">
          <i class="fas fa-key"></i>
        </button>
        <button id="logout-btn" class="btn bg-white/15 hover:bg-white/25 text-white px-3 py-2 text-sm" title="تسجيل الخروج">
          <i class="fas fa-right-from-bracket"></i><span class="hidden md:inline">خروج</span>
        </button>
      </div>
      <nav class="hidden md:flex max-w-5xl mx-auto px-4 gap-1 pb-2">
        ${nav.map(([p, label, icon]) => `
          <button data-nav="${p}" class="btn text-sm px-4 py-1.5 ${state.page === p ? 'bg-gold-500 text-white' : 'bg-white/10 text-white/85 hover:bg-white/20'}">
            <i class="fas ${icon}"></i> ${label}
          </button>`).join('')}
      </nav>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-5" id="main-content">${content}</main>
    <nav class="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-primary-100 shadow-2xl z-40 flex justify-around py-2 no-print">
      ${nav.map(([p, label, icon]) => `
        <button data-nav="${p}" class="nav-item ${state.page === p ? 'active' : ''}">
          <i class="fas ${icon} text-lg"></i><span>${label}</span>
        </button>`).join('')}
    </nav>
  </div>`
}

function changePasswordForm() {
  openModal(`
    <h3 class="text-lg font-black text-primary-800 mb-4"><i class="fas fa-key text-gold-500 ml-2"></i>تغيير كلمة المرور</h3>
    <form id="pw-form" class="space-y-3">
      <div><label class="text-sm font-bold text-primary-800">كلمة المرور الحالية</label><input type="password" id="pw-current" class="input" required autocomplete="current-password"></div>
      <div><label class="text-sm font-bold text-primary-800">كلمة المرور الجديدة (6 أحرف فأكثر)</label><input type="password" id="pw-new" class="input" required minlength="6" autocomplete="new-password"></div>
      <div><label class="text-sm font-bold text-primary-800">تأكيد كلمة المرور الجديدة</label><input type="password" id="pw-confirm" class="input" required autocomplete="new-password"></div>
      <div id="pw-error" class="hidden text-red-600 text-sm font-bold bg-red-50 rounded-lg p-2 text-center"></div>
      <div class="flex gap-2 pt-1">
        <button type="submit" class="btn btn-primary flex-1"><i class="fas fa-save"></i> حفظ</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      </div>
    </form>`)
  $('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const err = $('#pw-error')
    err.classList.add('hidden')
    if ($('#pw-new').value !== $('#pw-confirm').value) {
      err.textContent = 'كلمتا المرور الجديدتان غير متطابقتين'
      err.classList.remove('hidden')
      return
    }
    try {
      await api('post', '/api/change-password', { current: $('#pw-current').value, new_password: $('#pw-new').value })
      closeModal()
      toast('تم تغيير كلمة المرور بنجاح')
    } catch (e2) {
      err.textContent = e2.message
      err.classList.remove('hidden')
    }
  })
}

function bindShell() {
  $('#logout-btn').addEventListener('click', async () => {
    await api('post', '/api/logout')
    state.user = null
    render()
  })
  $('#change-pw-btn')?.addEventListener('click', changePasswordForm)
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => { state.page = b.dataset.nav; state.pageParams = {}; render() })
  })
}

// ───────── لوحة التحكم ─────────
async function dashboardView() {
  if (state.user.role === 'admin') return adminDashboard()
  if (state.user.role === 'teacher') return teacherDashboard()
  return parentDashboard()
}

async function adminDashboard() {
  const s = await api('get', '/api/stats')
  return `
  <div class="fade-in space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-black text-primary-800"><i class="fas fa-gauge-high text-gold-500 ml-2"></i>لوحة التحكم — بيانات لحظية</h2>
      <button id="refresh-dash" class="btn btn-outline text-sm"><i class="fas fa-rotate"></i> تحديث</button>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      ${statCard('fa-user-graduate', s.students, 'طالب', 'from-primary-500 to-primary-700')}
      ${statCard('fa-chalkboard-user', s.teachers, 'معلم', 'from-gold-400 to-gold-600')}
      ${statCard('fa-mosque', s.circles, 'حلقة', 'from-emerald-500 to-teal-700')}
      ${statCard('fa-chart-line', s.today_attendance_rate + '%', 'حضور اليوم', 'from-amber-400 to-amber-600')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="card p-4">
        <h3 class="font-black text-primary-800 mb-3"><i class="fas fa-chart-pie text-gold-500 ml-2"></i>حضور آخر 7 أيام</h3>
        <canvas id="chart-att" height="220"></canvas>
      </div>
      <div class="card p-4">
        <h3 class="font-black text-primary-800 mb-3"><i class="fas fa-chart-column text-gold-500 ml-2"></i>توزيع الطلاب على الحلقات</h3>
        <canvas id="chart-circles" height="220"></canvas>
      </div>
    </div>
    <div class="card p-4">
      <h3 class="font-black text-primary-800 mb-3"><i class="fas fa-book-open-reader text-gold-500 ml-2"></i>إجمالي الحفظ الجديد المسجّل: <span class="text-gold-600">${s.total_parts}</span> جزء تقريباً</h3>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, (s.total_parts / 30) * 100)}%"></div></div>
      <div class="text-xs text-slate-500 mt-2">من إجمالي 30 جزءاً — تقييمات آخر 30 يوماً: ${(s.evaluations || []).map(e => `${EVAL_LABELS[e.evaluation] || e.evaluation}: ${e.c}`).join('، ') || 'لا يوجد'}</div>
    </div>
  </div>`
}

function statCard(icon, value, label, gradient) {
  return `
  <div class="card p-4 flex items-center gap-3">
    <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xl shadow-lg"><i class="fas ${icon}"></i></div>
    <div><div class="text-2xl font-black text-primary-800">${value}</div><div class="text-xs text-slate-500 font-bold">${label}</div></div>
  </div>`
}

function bindAdminDashboard(s) {
  Object.values(state.charts).forEach((ch) => ch?.destroy())
  state.charts = {}
  const a7 = s.attendance_7days || []
  const ctx1 = $('#chart-att')
  if (ctx1) {
    state.charts.att = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: a7.map((d) => d.date.slice(5)),
        datasets: [
          { label: 'حاضر', data: a7.map((d) => d.present), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.15)', fill: true, tension: .35 },
          { label: 'غائب', data: a7.map((d) => d.absent), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.12)', fill: true, tension: .35 },
          { label: 'متأخر', data: a7.map((d) => d.late), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.1)', fill: true, tension: .35 },
        ],
      },
      options: { plugins: { legend: { labels: { font: { family: 'Cairo' } } } }, scales: { y: { beginAtZero: true } } },
    })
  }
  const ctx2 = $('#chart-circles')
  if (ctx2) {
    state.charts.circles = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: (s.per_circle || []).map((c) => c.name),
        datasets: [{ data: (s.per_circle || []).map((c) => c.students), backgroundColor: ['#0f766e', '#d4af37', '#0ea5e9', '#8b5cf6', '#ef4444'] }],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo' } } } } },
    })
  }
}

async function teacherDashboard() {
  const students = await api('get', '/api/students')
  const att = await api('get', '/api/attendance', null).catch(() => ({ rows: [] }))
  const done = att.rows.filter((r) => r.status).length
  return `
  <div class="fade-in space-y-5">
    <h2 class="text-xl font-black text-primary-800"><i class="fas fa-mosque text-gold-500 ml-2"></i>حلقتي — ${esc(students[0]?.circle_name || 'غير مرتبط بحلقة')}</h2>
    <div class="grid grid-cols-2 gap-3">
      ${statCard('fa-user-graduate', students.length, 'طالب في حلقتي', 'from-primary-500 to-primary-700')}
      ${statCard('fa-clipboard-check', `${done}/${students.length}`, 'سجّل حضور اليوم', 'from-gold-400 to-gold-600')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button data-nav="attendance" class="card p-5 text-right hover:shadow-xl transition">
        <i class="fas fa-clipboard-check text-3xl text-primary-600 mb-2"></i>
        <div class="font-black text-primary-800">تسجيل حضور اليوم</div>
        <div class="text-xs text-slate-500">حاضر / غائب / متأخر / بإذن</div>
      </button>
      <button data-nav="memorization" class="card p-5 text-right hover:shadow-xl transition">
        <i class="fas fa-book-open-reader text-3xl text-gold-500 mb-2"></i>
        <div class="font-black text-primary-800">توثيق الحفظ والمراجعة</div>
        <div class="text-xs text-slate-500">التسميع اليومي والتقييم</div>
      </button>
    </div>
    <div class="card p-4">
      <h3 class="font-black text-primary-800 mb-3"><i class="fas fa-users text-gold-500 ml-2"></i>طلاب حلقتي</h3>
      <div class="divide-y divide-slate-100">
        ${students.map((st) => `
          <button class="w-full flex items-center gap-3 py-2.5 hover:bg-primary-50 rounded-lg px-2 transition text-right" onclick="openStudent(${st.id})">
            <div class="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-black">${esc(st.name[0])}</div>
            <div class="flex-1"><div class="font-bold text-sm text-primary-900">${esc(st.name)}</div><div class="text-xs text-slate-500">${st.age ? st.age + ' سنة' : ''}</div></div>
            <i class="fas fa-chevron-left text-slate-300"></i>
          </button>`).join('') || '<div class="text-slate-400 text-center py-6">لا يوجد طلاب</div>'}
      </div>
    </div>
  </div>`
}

async function parentDashboard() {
  const students = await api('get', '/api/students')
  if (!students.length) {
    return `<div class="card p-8 text-center text-slate-500 fade-in"><i class="fas fa-child-reaching text-4xl mb-3 text-gold-400"></i><div class="font-bold">لم يتم ربط أي ابن بحسابك بعد — تواصل مع إدارة المركز</div></div>`
  }
  const blocks = []
  for (const st of students) {
    const d = await api('get', `/api/students/${st.id}`)
    const sum = Object.fromEntries((d.attendance_summary || []).map((r) => [r.status, r.c]))
    const total = (sum.present || 0) + (sum.absent || 0) + (sum.late || 0) + (sum.excused || 0)
    const rate = total ? Math.round((((sum.present || 0) + (sum.late || 0)) / total) * 100) : 0
    blocks.push(`
    <div class="card p-5 fade-in">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-black">${esc(st.name[0])}</div>
        <div><div class="font-black text-lg text-primary-900">${esc(st.name)}</div><div class="text-xs text-slate-500">${esc(st.circle_name || '')} — ${esc(st.teacher_name || '')}</div></div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-primary-50 rounded-xl p-3 text-center"><div class="text-2xl font-black text-primary-700">${rate}%</div><div class="text-xs text-slate-500 font-bold">نسبة الحضور</div></div>
        <div class="bg-gold-50 rounded-xl p-3 text-center"><div class="text-2xl font-black text-gold-600">${d.total_parts}</div><div class="text-xs text-slate-500 font-bold">أجزاء محفوظة</div></div>
      </div>
      <div class="progress-bar mb-1"><div class="progress-fill" style="width:${Math.min(100, (d.total_parts / 30) * 100)}%"></div></div>
      <div class="text-xs text-slate-400 mb-4">تقدم الحفظ من 30 جزءاً</div>
      ${(d.achievements || []).length ? `<div class="mb-4">${d.achievements.slice(0, 3).map((a) => `<span class="badge bg-gold-100 text-gold-700 ml-1 mb-1 inline-block"><i class="fas fa-trophy ml-1"></i>${esc(a.title)}</span>`).join('')}</div>` : ''}
      <h4 class="font-black text-primary-800 text-sm mb-2"><i class="fas fa-book-open text-gold-500 ml-1"></i>آخر التسميعات والتقييمات</h4>
      <div class="space-y-2">
        ${(d.memorization || []).slice(0, 5).map((m) => `
          <div class="bg-slate-50 rounded-lg p-2.5 text-sm flex items-center gap-2 flex-wrap">
            <span class="badge ${m.type === 'new' ? 'bg-primary-100 text-primary-700' : 'bg-sky-100 text-sky-700'}">${m.type === 'new' ? 'حفظ جديد' : 'مراجعة'}</span>
            <span class="font-bold">${esc(m.surah_from || '')}${m.ayah_from ? ` (${m.ayah_from}${m.ayah_to ? '–' + m.ayah_to : ''})` : ''}</span>
            ${m.evaluation ? `<span class="badge ${EVAL_COLORS[m.evaluation]}">${EVAL_LABELS[m.evaluation]}</span>` : ''}
            <span class="text-xs text-slate-400 mr-auto">${m.date}</span>
          </div>`).join('') || '<div class="text-slate-400 text-sm">لا توجد سجلات بعد</div>'}
      </div>
      ${(d.memorization || []).some((m) => m.notes) ? `
      <h4 class="font-black text-primary-800 text-sm mt-4 mb-2"><i class="fas fa-note-sticky text-gold-500 ml-1"></i>ملاحظات المعلم</h4>
      ${d.memorization.filter((m) => m.notes).slice(0, 3).map((m) => `<div class="text-sm bg-amber-50 border-r-4 border-gold-400 rounded p-2 mb-1">${esc(m.notes)}</div>`).join('')}` : ''}
    </div>`)
  }
  return `<div class="space-y-4">${blocks.join('')}</div>`
}

// ───────── إدارة الطلاب ─────────
async function studentsView() {
  const [students, circles] = await Promise.all([api('get', '/api/students'), api('get', '/api/circles')])
  const isAdmin = state.user.role === 'admin'
  return `
  <div class="fade-in space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="text-xl font-black text-primary-800"><i class="fas fa-user-graduate text-gold-500 ml-2"></i>${isAdmin ? 'إدارة الطلاب' : 'طلاب حلقتي'} <span class="badge bg-primary-100 text-primary-700">${students.length}</span></h2>
      ${isAdmin ? `<button id="add-student-btn" class="btn btn-gold text-sm"><i class="fas fa-plus"></i> إضافة طالب</button>` : ''}
    </div>
    <input id="student-search" class="input" placeholder="🔍 ابحث باسم الطالب...">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="students-list">
      ${students.map((st) => `
        <div class="card p-4 student-card" data-name="${esc(st.name)}">
          <div class="flex items-center gap-3">
            <button class="flex items-center gap-3 flex-1 text-right" onclick="openStudent(${st.id})">
              <div class="w-11 h-11 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-black shrink-0">${esc(st.name[0])}</div>
              <div class="min-w-0">
                <div class="font-black text-primary-900 truncate">${esc(st.name)}</div>
                <div class="text-xs text-slate-500">${st.age ? st.age + ' سنة • ' : ''}${esc(st.circle_name || 'بدون حلقة')}</div>
              </div>
            </button>
            ${isAdmin ? `
            <div class="flex gap-1 shrink-0">
              ${st.parent_phone ? `<a href="tel:${esc(st.parent_phone)}" class="btn bg-sky-100 text-sky-700 px-2.5 py-2 text-sm" title="اتصال بولي الأمر"><i class="fas fa-phone"></i></a>` : ''}
              ${st.parent_whatsapp ? `<button onclick="openWhatsApp(${st.id})" class="btn bg-emerald-100 text-emerald-700 px-2.5 py-2 text-sm" title="واتساب"><i class="fab fa-whatsapp"></i></button>` : ''}
              <button onclick="editStudent(${st.id})" class="btn bg-gold-100 text-gold-700 px-2.5 py-2 text-sm" title="تعديل"><i class="fas fa-pen"></i></button>
              <button onclick="deleteStudent(${st.id}, '${esc(st.name)}')" class="btn bg-red-100 text-red-600 px-2.5 py-2 text-sm" title="حذف"><i class="fas fa-trash"></i></button>
            </div>` : ''}
          </div>
        </div>`).join('') || '<div class="card p-8 text-center text-slate-400 col-span-2">لا يوجد طلاب — أضف أول طالب</div>'}
    </div>
  </div>`
}

function bindStudents(circles) {
  $('#student-search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim()
    document.querySelectorAll('.student-card').forEach((c) => {
      c.style.display = c.dataset.name.includes(q) ? '' : 'none'
    })
  })
  $('#add-student-btn')?.addEventListener('click', () => studentForm(null, circles))
}

function studentForm(st, circles) {
  const isEdit = !!st
  st = st || {}
  const opts = circles.map((c) => `<option value="${c.id}" ${st.circle_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')
  openModal(`
    <h3 class="text-lg font-black text-primary-800 mb-4"><i class="fas fa-user-graduate text-gold-500 ml-2"></i>${isEdit ? 'تعديل طالب' : 'إضافة طالب جديد'}</h3>
    <form id="student-form" class="space-y-3">
      <div><label class="text-sm font-bold text-primary-800">اسم الطالب *</label><input id="sf-name" class="input" value="${esc(st.name || '')}" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm font-bold text-primary-800">العمر</label><input id="sf-age" type="number" min="4" max="30" class="input" value="${st.age ?? ''}"></div>
        <div><label class="text-sm font-bold text-primary-800">الحلقة</label><select id="sf-circle" class="input"><option value="">— بدون —</option>${opts}</select></div>
      </div>
      <div><label class="text-sm font-bold text-primary-800"><i class="fas fa-phone text-sky-500 ml-1"></i>جوال ولي الأمر (للاتصال)</label><input id="sf-phone" class="input" dir="ltr" value="${esc(st.parent_phone || '')}" placeholder="05xxxxxxxx"></div>
      <div><label class="text-sm font-bold text-primary-800"><i class="fab fa-whatsapp text-emerald-500 ml-1"></i>واتساب ولي الأمر (مع رمز الدولة)</label><input id="sf-wa" class="input" dir="ltr" value="${esc(st.parent_whatsapp || '')}" placeholder="9665xxxxxxxx"></div>
      <div><label class="text-sm font-bold text-primary-800">ملاحظات</label><textarea id="sf-notes" class="input" rows="2">${esc(st.notes || '')}</textarea></div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="btn btn-primary flex-1"><i class="fas fa-save"></i> حفظ</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      </div>
    </form>`)
  $('#student-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const body = {
      name: $('#sf-name').value.trim(),
      age: $('#sf-age').value ? +$('#sf-age').value : null,
      circle_id: $('#sf-circle').value ? +$('#sf-circle').value : null,
      parent_phone: $('#sf-phone').value.trim() || null,
      parent_whatsapp: $('#sf-wa').value.trim().replace(/[^0-9]/g, '') || null,
      notes: $('#sf-notes').value.trim() || null,
    }
    try {
      if (isEdit) await api('put', `/api/students/${st.id}`, body)
      else await api('post', '/api/students', body)
      closeModal()
      toast(isEdit ? 'تم تحديث بيانات الطالب' : 'تمت إضافة الطالب بنجاح')
      render()
    } catch (err) { toast(err.message, false) }
  })
}

async function editStudent(id) {
  const d = await api('get', `/api/students/${id}`)
  const circles = await api('get', '/api/circles')
  studentForm(d.student, circles)
}

async function deleteStudent(id, name) {
  openModal(`
    <div class="text-center">
      <i class="fas fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
      <h3 class="font-black text-lg text-primary-900 mb-2">حذف الطالب</h3>
      <p class="text-slate-600 mb-4">هل أنت متأكد من حذف <b>${esc(name)}</b>؟</p>
      <div class="flex gap-2">
        <button id="confirm-del" class="btn bg-red-600 text-white flex-1 px-4 py-2"><i class="fas fa-trash"></i> نعم، احذف</button>
        <button class="btn btn-outline flex-1" onclick="closeModal()">إلغاء</button>
      </div>
    </div>`)
  $('#confirm-del').addEventListener('click', async () => {
    try { await api('delete', `/api/students/${id}`); closeModal(); toast('تم حذف الطالب'); render() }
    catch (err) { toast(err.message, false) }
  })
}

// ───────── ملف الطالب ─────────
async function openStudent(id) {
  const d = await api('get', `/api/students/${id}`)
  const st = d.student
  const sum = Object.fromEntries((d.attendance_summary || []).map((r) => [r.status, r.c]))
  const total = (sum.present || 0) + (sum.absent || 0) + (sum.late || 0) + (sum.excused || 0)
  const rate = total ? Math.round((((sum.present || 0) + (sum.late || 0)) / total) * 100) : 0
  const canEdit = ['admin', 'teacher'].includes(state.user.role)
  openModal(`
    <div class="flex items-center gap-3 mb-4">
      <div class="w-14 h-14 rounded-full primary-gradient text-white flex items-center justify-center text-2xl font-black">${esc(st.name[0])}</div>
      <div class="flex-1">
        <div class="font-black text-lg text-primary-900">${esc(st.name)}</div>
        <div class="text-xs text-slate-500">${st.age ? st.age + ' سنة • ' : ''}${esc(st.circle_name || 'بدون حلقة')} ${st.teacher_name ? '• ' + esc(st.teacher_name) : ''}</div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 mb-4">
      <div class="bg-primary-50 rounded-xl p-3 text-center"><div class="text-xl font-black text-primary-700">${rate}%</div><div class="text-xs text-slate-500 font-bold">نسبة الحضور</div></div>
      <div class="bg-gold-50 rounded-xl p-3 text-center"><div class="text-xl font-black text-gold-600">${d.total_parts}</div><div class="text-xs text-slate-500 font-bold">أجزاء محفوظة</div></div>
    </div>
    <div class="progress-bar mb-1"><div class="progress-fill" style="width:${Math.min(100, (d.total_parts / 30) * 100)}%"></div></div>
    <div class="text-xs text-slate-400 mb-4">تقدم الحفظ من 30 جزءاً</div>
    <div class="flex gap-2 mb-4 flex-wrap">
      ${st.parent_phone ? `<a href="tel:${esc(st.parent_phone)}" class="btn bg-sky-600 text-white px-4 py-2 text-sm flex-1"><i class="fas fa-phone"></i> اتصال</a>` : ''}
      ${st.parent_whatsapp ? `<button onclick="openWhatsApp(${st.id})" class="btn bg-emerald-600 text-white px-4 py-2 text-sm flex-1"><i class="fab fa-whatsapp"></i> واتساب</button>` : ''}
      ${canEdit ? `<button onclick="closeModal();state.page='memorization';state.pageParams={student_id:${st.id}};render()" class="btn btn-gold px-4 py-2 text-sm flex-1"><i class="fas fa-book-open-reader"></i> تسجيل حفظ</button>` : ''}
      <button onclick="studentReport(${st.id})" class="btn btn-outline px-4 py-2 text-sm flex-1"><i class="fas fa-file-pdf"></i> تقرير PDF</button>
    </div>
    ${(d.achievements || []).length ? `<div class="mb-4">${d.achievements.map((a) => `<span class="badge bg-gold-100 text-gold-700 ml-1 mb-1 inline-block"><i class="fas fa-trophy ml-1"></i>${esc(a.title)} <span class="opacity-60">${a.date}</span></span>`).join('')}</div>` : ''}
    <h4 class="font-black text-primary-800 text-sm mb-2"><i class="fas fa-clipboard-list text-gold-500 ml-1"></i>سجل الحضور (آخر 15 يوماً)</h4>
    <div class="space-y-1 mb-4 max-h-40 overflow-y-auto">
      ${(d.attendance || []).slice(0, 15).map((a) => `
        <div class="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
          <span class="text-slate-500">${a.date}</span>
          <span class="badge" style="background:${ATT_COLORS[a.status]}22;color:${ATT_COLORS[a.status]}">${ATT_LABELS[a.status]}</span>
        </div>`).join('') || '<div class="text-slate-400 text-sm">لا يوجد سجل حضور</div>'}
    </div>
    <h4 class="font-black text-primary-800 text-sm mb-2"><i class="fas fa-book-open text-gold-500 ml-1"></i>سجل الحفظ والمراجعة</h4>
    <div class="space-y-2 max-h-52 overflow-y-auto">
      ${(d.memorization || []).map((m) => `
        <div class="bg-slate-50 rounded-lg p-2.5 text-sm flex items-center gap-2 flex-wrap">
          <span class="badge ${m.type === 'new' ? 'bg-primary-100 text-primary-700' : 'bg-sky-100 text-sky-700'}">${m.type === 'new' ? 'حفظ' : 'مراجعة'}</span>
          <span class="font-bold">${esc(m.surah_from || '')}${m.ayah_from ? ` ${m.ayah_from}${m.ayah_to ? '–' + m.ayah_to : ''}` : ''}</span>
          ${m.evaluation ? `<span class="badge ${EVAL_COLORS[m.evaluation]}">${EVAL_LABELS[m.evaluation]}</span>` : ''}
          <span class="text-xs text-slate-400 mr-auto">${m.date}</span>
          ${m.notes ? `<div class="w-full text-xs text-amber-700">${esc(m.notes)}</div>` : ''}
        </div>`).join('') || '<div class="text-slate-400 text-sm">لا توجد سجلات</div>'}
    </div>`)
}

// ───────── واتساب — قوالب جاهزة ─────────
async function openWhatsApp(id) {
  const d = await api('get', `/api/students/${id}`)
  const st = d.student
  const wa = (st.parent_whatsapp || '').replace(/[^0-9]/g, '')
  if (!wa) { toast('لا يوجد رقم واتساب لولي الأمر', false); return }
  const sum = Object.fromEntries((d.attendance_summary || []).map((r) => [r.status, r.c]))
  const weekMem = (d.memorization || []).filter((m) => m.date >= daysAgo(7))
  const weekNew = weekMem.filter((m) => m.type === 'new').map((m) => `${m.surah_from}${m.ayah_from ? ` (${m.ayah_from}${m.ayah_to ? '–' + m.ayah_to : ''})` : ''}`).join('، ') || '—'
  const lastEval = (d.memorization || []).find((m) => m.evaluation)
  const lastAch = (d.achievements || [])[0]
  const templates = [
    { icon: 'fa-user-xmark', color: 'text-red-600', title: 'تنبيه غياب', text: `السلام عليكم ورحمة الله وبركاته، نحيطكم علماً بأن ابنكم ${st.name} تغيّب اليوم عن الحلقة. نرجو الاطمئنان عليه، ونسأل الله له العافية.` },
    { icon: 'fa-calendar-week', color: 'text-sky-600', title: 'تقرير أسبوعي', text: `السلام عليكم ورحمة الله، تقرير ابنكم ${st.name} لهذا الأسبوع:\n• الحفظ الجديد: ${weekNew}\n• آخر تقييم: ${lastEval ? EVAL_LABELS[lastEval.evaluation] : '—'}\n• أيام الحضور: ${sum.present || 0} — الغياب: ${sum.absent || 0}\nبارك الله فيه وفي جهودكم.` },
    { icon: 'fa-trophy', color: 'text-gold-600', title: 'تهنئة إنجاز', text: `السلام عليكم ورحمة الله، نهنئكم ونهنئ ابنكم ${st.name} بمناسبة ${lastAch ? lastAch.title : 'تميّزه في الحفظ'} 🎉 نسأل الله أن يبارك له ويجعل القرآن حجةً له يوم القيامة.` },
    { icon: 'fa-message', color: 'text-primary-600', title: 'رسالة فارغة', text: `السلام عليكم ورحمة الله وبركاته، بخصوص ابنكم ${st.name}: ` },
  ]
  openModal(`
    <h3 class="text-lg font-black text-primary-800 mb-1"><i class="fab fa-whatsapp text-emerald-500 ml-2"></i>رسالة واتساب — ${esc(st.name)}</h3>
    <p class="text-xs text-slate-500 mb-3" dir="ltr">${wa}</p>
    <div class="grid grid-cols-2 gap-2 mb-3">
      ${templates.map((t, i) => `<button onclick="selectTemplate(${i})" class="btn bg-slate-50 border border-slate-200 p-2.5 text-sm font-bold ${t.color}"><i class="fas ${t.icon}"></i> ${t.title}</button>`).join('')}
    </div>
    <textarea id="wa-text" class="input" rows="6">${esc(templates[0].text)}</textarea>
    <div class="flex gap-2 mt-3">
      <a id="wa-send" href="https://wa.me/${wa}?text=${encodeURIComponent(templates[0].text)}" target="_blank" rel="noopener" class="btn bg-emerald-600 text-white flex-1 px-4 py-2.5"><i class="fab fa-whatsapp"></i> فتح واتساب وإرسال</a>
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
    </div>`)
  window.__waTemplates = templates
  $('#wa-text').addEventListener('input', (e) => {
    $('#wa-send').href = `https://wa.me/${wa}?text=${encodeURIComponent(e.target.value)}`
  })
}

function selectTemplate(i) {
  const t = window.__waTemplates[i]
  $('#wa-text').value = t.text
  $('#wa-text').dispatchEvent(new Event('input'))
}

// ───────── إدارة المعلمين ─────────
async function teachersView() {
  const teachers = await api('get', '/api/teachers')
  return `
  <div class="fade-in space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-black text-primary-800"><i class="fas fa-chalkboard-user text-gold-500 ml-2"></i>إدارة المعلمين <span class="badge bg-primary-100 text-primary-700">${teachers.length}</span></h2>
      <button id="add-teacher-btn" class="btn btn-gold text-sm"><i class="fas fa-plus"></i> إضافة معلم</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${teachers.map((t) => `
        <div class="card p-4 flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-gold-500 text-white flex items-center justify-center text-lg font-black shrink-0">${esc(t.name.replace('الشيخ ', '')[0] || 'م')}</div>
          <div class="flex-1 min-w-0">
            <div class="font-black text-primary-900 truncate">${esc(t.name)}</div>
            <div class="text-xs text-slate-500">${esc(t.circle_name || 'بدون حلقة')} • ${t.students_count} طالب</div>
            <div class="text-xs text-slate-400" dir="ltr">${esc(t.email || '')} ${t.phone ? '• ' + esc(t.phone) : ''}</div>
          </div>
          <div class="flex gap-1 shrink-0">
            <button onclick='editTeacher(${JSON.stringify(t)})' class="btn bg-gold-100 text-gold-700 px-2.5 py-2 text-sm"><i class="fas fa-pen"></i></button>
            <button onclick="deleteTeacher(${t.id}, '${esc(t.name)}')" class="btn bg-red-100 text-red-600 px-2.5 py-2 text-sm"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('') || '<div class="card p-8 text-center text-slate-400 col-span-2">لا يوجد معلمون</div>'}
    </div>
  </div>`
}

function teacherForm(t) {
  const isEdit = !!t
  t = t || {}
  openModal(`
    <h3 class="text-lg font-black text-primary-800 mb-4"><i class="fas fa-chalkboard-user text-gold-500 ml-2"></i>${isEdit ? 'تعديل معلم' : 'إضافة معلم جديد'}</h3>
    <form id="teacher-form" class="space-y-3">
      <div><label class="text-sm font-bold text-primary-800">اسم المعلم *</label><input id="tf-name" class="input" value="${esc(t.name || '')}" required></div>
      <div><label class="text-sm font-bold text-primary-800">رقم الجوال</label><input id="tf-phone" class="input" dir="ltr" value="${esc(t.phone || '')}"></div>
      ${!isEdit ? `<div><label class="text-sm font-bold text-primary-800">البريد الإلكتروني (لتسجيل الدخول) *</label><input id="tf-email" type="email" class="input" dir="ltr" required></div>` : ''}
      <div><label class="text-sm font-bold text-primary-800">كلمة المرور ${isEdit ? '(اتركها فارغة لعدم التغيير)' : '*'}</label><input id="tf-password" type="password" class="input" dir="ltr" ${isEdit ? '' : 'required'}></div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="btn btn-primary flex-1"><i class="fas fa-save"></i> حفظ</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      </div>
    </form>`)
  $('#teacher-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const body = { name: $('#tf-name').value.trim(), phone: $('#tf-phone').value.trim() || null, password: $('#tf-password').value || undefined }
    if (!isEdit) body.email = $('#tf-email').value.trim()
    try {
      if (isEdit) await api('put', `/api/teachers/${t.id}`, body)
      else await api('post', '/api/teachers', body)
      closeModal(); toast(isEdit ? 'تم التحديث' : 'تمت إضافة المعلم — سلّمه بريده وكلمة مروره'); render()
    } catch (err) { toast(err.message, false) }
  })
}

function editTeacher(t) { teacherForm(t) }

async function deleteTeacher(id, name) {
  openModal(`
    <div class="text-center">
      <i class="fas fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
      <h3 class="font-black text-lg mb-2">حذف المعلم</h3>
      <p class="text-slate-600 mb-4">حذف <b>${esc(name)}</b>؟ ستبقى حلقته بدون معلم.</p>
      <div class="flex gap-2">
        <button id="confirm-del" class="btn bg-red-600 text-white flex-1 px-4 py-2"><i class="fas fa-trash"></i> نعم، احذف</button>
        <button class="btn btn-outline flex-1" onclick="closeModal()">إلغاء</button>
      </div>
    </div>`)
  $('#confirm-del').addEventListener('click', async () => {
    try { await api('delete', `/api/teachers/${id}`); closeModal(); toast('تم حذف المعلم'); render() }
    catch (err) { toast(err.message, false) }
  })
}

// ───────── إدارة الحلقات ─────────
async function circlesView() {
  const [circles, teachers] = await Promise.all([api('get', '/api/circles'), api('get', '/api/teachers')])
  return `
  <div class="fade-in space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-black text-primary-800"><i class="fas fa-mosque text-gold-500 ml-2"></i>إدارة الحلقات <span class="badge bg-primary-100 text-primary-700">${circles.length}</span></h2>
      <button id="add-circle-btn" class="btn btn-gold text-sm"><i class="fas fa-plus"></i> إنشاء حلقة</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${circles.map((c) => `
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl primary-gradient text-white flex items-center justify-center text-lg shrink-0"><i class="fas fa-mosque"></i></div>
            <div class="flex-1 min-w-0">
              <div class="font-black text-primary-900">${esc(c.name)}</div>
              <div class="text-xs text-slate-500">${esc(c.teacher_name || 'بدون معلم')} • ${c.students_count} طالب</div>
              <div class="text-xs text-slate-400">${esc(c.time || '')} ${c.days ? '• ' + esc(c.days) : ''}</div>
            </div>
            <div class="flex gap-1 shrink-0">
              <button onclick='editCircle(${JSON.stringify(c)}, ${JSON.stringify(teachers.map((t) => ({ id: t.id, name: t.name })))})' class="btn bg-gold-100 text-gold-700 px-2.5 py-2 text-sm"><i class="fas fa-pen"></i></button>
              <button onclick="deleteCircle(${c.id}, '${esc(c.name)}')" class="btn bg-red-100 text-red-600 px-2.5 py-2 text-sm"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>`).join('') || '<div class="card p-8 text-center text-slate-400 col-span-2">لا توجد حلقات</div>'}
    </div>
  </div>`
}

function circleForm(c, teachers) {
  const isEdit = !!c
  c = c || {}
  const opts = (teachers || []).map((t) => `<option value="${t.id}" ${c.teacher_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')
  openModal(`
    <h3 class="text-lg font-black text-primary-800 mb-4"><i class="fas fa-mosque text-gold-500 ml-2"></i>${isEdit ? 'تعديل حلقة' : 'إنشاء حلقة جديدة'}</h3>
    <form id="circle-form" class="space-y-3">
      <div><label class="text-sm font-bold text-primary-800">اسم الحلقة *</label><input id="cf-name" class="input" value="${esc(c.name || '')}" required placeholder="مثال: حلقة الفجر"></div>
      <div><label class="text-sm font-bold text-primary-800">المعلم المسؤول</label><select id="cf-teacher" class="input"><option value="">— بدون —</option>${opts}</select></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm font-bold text-primary-800">الوقت</label><input id="cf-time" class="input" value="${esc(c.time || '')}" placeholder="بعد الفجر"></div>
        <div><label class="text-sm font-bold text-primary-800">الأيام</label><input id="cf-days" class="input" value="${esc(c.days || '')}" placeholder="السبت - الخميس"></div>
      </div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="btn btn-primary flex-1"><i class="fas fa-save"></i> حفظ</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      </div>
    </form>`)
  $('#circle-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const body = {
      name: $('#cf-name').value.trim(),
      teacher_id: $('#cf-teacher').value ? +$('#cf-teacher').value : null,
      time: $('#cf-time').value.trim() || null,
      days: $('#cf-days').value.trim() || null,
    }
    try {
      if (isEdit) await api('put', `/api/circles/${c.id}`, body)
      else await api('post', '/api/circles', body)
      closeModal(); toast(isEdit ? 'تم التحديث' : 'تم إنشاء الحلقة'); render()
    } catch (err) { toast(err.message, false) }
  })
}

function editCircle(c, teachers) { circleForm(c, teachers) }

async function deleteCircle(id, name) {
  openModal(`
    <div class="text-center">
      <i class="fas fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
      <h3 class="font-black text-lg mb-2">حذف الحلقة</h3>
      <p class="text-slate-600 mb-4">حذف <b>${esc(name)}</b>؟ سيبقى طلابها بدون حلقة.</p>
      <div class="flex gap-2">
        <button id="confirm-del" class="btn bg-red-600 text-white flex-1 px-4 py-2"><i class="fas fa-trash"></i> نعم، احذف</button>
        <button class="btn btn-outline flex-1" onclick="closeModal()">إلغاء</button>
      </div>
    </div>`)
  $('#confirm-del').addEventListener('click', async () => {
    try { await api('delete', `/api/circles/${id}`); closeModal(); toast('تم حذف الحلقة'); render() }
    catch (err) { toast(err.message, false) }
  })
}

// ───────── شاشة الحضور السريعة ─────────
async function attendanceView() {
  const date = state.pageParams.date || today()
  const data = await api('get', `/api/attendance?date=${date}`)
  const circles = state.user.role === 'admin' ? await api('get', '/api/circles') : []
  return `
  <div class="fade-in space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="text-xl font-black text-primary-800"><i class="fas fa-clipboard-check text-gold-500 ml-2"></i>تسجيل الحضور</h2>
      <input type="date" id="att-date" class="input" style="width:auto" value="${date}" max="${today()}">
    </div>
    <div class="card p-4 space-y-3">
      ${data.rows.map((r) => `
        <div class="att-row border-b border-slate-100 pb-3" data-student="${r.student_id}">
          <div class="font-bold text-primary-900 mb-2 text-sm">${esc(r.name)}</div>
          <div class="flex gap-1.5">
            ${['present', 'absent', 'late', 'excused'].map((s) => `
              <button class="att-btn ${r.status === s ? 'active-' + s : ''}" data-status="${s}" onclick="setAtt(this)">${ATT_LABELS[s]}</button>`).join('')}
          </div>
        </div>`).join('') || '<div class="text-slate-400 text-center py-6">لا يوجد طلاب</div>'}
      <button id="save-att" class="btn btn-primary w-full text-lg mt-2"><i class="fas fa-save"></i> حفظ حضور ${date}</button>
    </div>
  </div>`
}

function setAtt(btn) {
  const row = btn.closest('.att-row')
  row.querySelectorAll('.att-btn').forEach((b) => b.className = 'att-btn')
  btn.classList.add('active-' + btn.dataset.status)
  row.dataset.status = btn.dataset.status
}

function bindAttendance(date) {
  $('#att-date').addEventListener('change', (e) => { state.pageParams.date = e.target.value; render() })
  $('#save-att').addEventListener('click', async () => {
    const items = []
    document.querySelectorAll('.att-row').forEach((r) => {
      if (r.dataset.status) items.push({ student_id: +r.dataset.student, status: r.dataset.status })
    })
    if (!items.length) { toast('حدد حالة طالب واحد على الأقل', false); return }
    const btn = $('#save-att')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'
    try {
      const res = await api('post', '/api/attendance', { date, items })
      toast(`تم حفظ حضور ${res.count} طالب — يظهر الآن في لوحة المدير`)
      btn.disabled = false
      btn.innerHTML = `<i class="fas fa-save"></i> حفظ حضور ${date}`
    } catch (err) { toast(err.message, false); btn.disabled = false }
  })
}

// ───────── توثيق الحفظ والمراجعة ─────────
async function memorizationView() {
  const students = await api('get', '/api/students')
  const selId = state.pageParams.student_id || students[0]?.id
  const opts = students.map((s) => `<option value="${s.id}" ${s.id === selId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')
  const surahOpts = SURAHS.map((s) => `<option value="${s}">${s}</option>`).join('')
  return `
  <div class="fade-in space-y-4">
    <h2 class="text-xl font-black text-primary-800"><i class="fas fa-book-open-reader text-gold-500 ml-2"></i>توثيق الحفظ والمراجعة والتقييم</h2>
    <div class="card p-4 space-y-3">
      <div>
        <label class="text-sm font-bold text-primary-800">الطالب</label>
        <select id="mem-student" class="input">${opts}</select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-bold text-primary-800">النوع</label>
          <select id="mem-type" class="input">
            <option value="new">حفظ جديد</option>
            <option value="review">مراجعة</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-bold text-primary-800">التاريخ</label>
          <input type="date" id="mem-date" class="input" value="${today()}" max="${today()}">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-bold text-primary-800">من سورة</label>
          <select id="mem-surah-from" class="input">${surahOpts}</select>
        </div>
        <div>
          <label class="text-sm font-bold text-primary-800">إلى سورة</label>
          <select id="mem-surah-to" class="input">${surahOpts}</select>
        </div>
      </div>
      <div id="surah-order-error" class="hidden text-red-600 text-xs font-bold bg-red-50 rounded-lg p-2">⚠️ «إلى سورة» يجب أن تكون نفس السورة أو بعدها في ترتيب المصحف</div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-sm font-bold text-primary-800">من آية</label>
          <input type="number" id="mem-ayah-from" class="input" min="1" placeholder="1">
        </div>
        <div>
          <label class="text-sm font-bold text-primary-800">إلى آية</label>
          <input type="number" id="mem-ayah-to" class="input" min="1" placeholder="20">
        </div>
        <div>
          <label class="text-sm font-bold text-primary-800">مقدار (جزء)</label>
          <input type="number" id="mem-parts" class="input" min="0" step="0.01" value="0.02">
        </div>
      </div>
      <div>
        <label class="text-sm font-bold text-primary-800 block mb-1">التقييم</label>
        <div class="grid grid-cols-4 gap-1.5">
          ${Object.entries(EVAL_LABELS).map(([k, v], i) => `
            <label class="att-btn text-center cursor-pointer eval-opt" data-eval="${k}">
              <input type="radio" name="eval" value="${k}" class="hidden" ${i === 0 ? 'checked' : ''}>${v}
            </label>`).join('')}
        </div>
      </div>
      <div>
        <label class="text-sm font-bold text-primary-800">ملاحظات لولي الأمر</label>
        <textarea id="mem-notes" class="input" rows="2" placeholder="مثال: يحتاج تثبيت سورة النبأ"></textarea>
      </div>
      <label class="flex items-center gap-2 text-sm font-bold text-gold-700 bg-gold-50 rounded-lg p-2.5 cursor-pointer">
        <input type="checkbox" id="mem-completed" class="w-4 h-4 accent-gold-600">
        <i class="fas fa-trophy"></i> أتمّ الطالب هذه السورة كاملة (يُسجَّل كإنجاز)
      </label>
      <button id="save-mem" class="btn btn-primary w-full text-lg"><i class="fas fa-save"></i> حفظ التسميع</button>
    </div>
    <div class="card p-4">
      <h3 class="font-black text-primary-800 mb-2"><i class="fas fa-clock-rotate-left text-gold-500 ml-2"></i>آخر السجلات</h3>
      <div id="recent-mem" class="space-y-2"></div>
    </div>
  </div>`
}

function bindMemorization() {
  document.querySelectorAll('.eval-opt').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.eval-opt').forEach((x) => { x.className = 'att-btn text-center cursor-pointer eval-opt' })
      el.classList.add('active-present')
    })
  })
  document.querySelector('.eval-opt')?.classList.add('active-present')
  const loadRecent = async () => {
    const sid = $('#mem-student').value
    if (!sid) return
    const rows = await api('get', '/api/memorization')
    const mine = rows.filter((r) => String(r.student_id) === String(sid)).slice(0, 8)
    $('#recent-mem').innerHTML = mine.map((m) => `
      <div class="bg-slate-50 rounded-lg p-2.5 text-sm flex items-center gap-2 flex-wrap">
        <span class="badge ${m.type === 'new' ? 'bg-primary-100 text-primary-700' : 'bg-sky-100 text-sky-700'}">${m.type === 'new' ? 'حفظ' : 'مراجعة'}</span>
        <span class="font-bold">${esc(m.surah_from || '')}${m.ayah_from ? ` ${m.ayah_from}${m.ayah_to ? '–' + m.ayah_to : ''}` : ''}</span>
        ${m.evaluation ? `<span class="badge ${EVAL_COLORS[m.evaluation]}">${EVAL_LABELS[m.evaluation]}</span>` : ''}
        <span class="text-xs text-slate-400 mr-auto">${m.date}</span>
        <button onclick="deleteMem(${m.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash text-xs"></i></button>
      </div>`).join('') || '<div class="text-slate-400 text-sm">لا توجد سجلات لهذا الطالب</div>'
  }
  $('#mem-student').addEventListener('change', loadRecent)
  loadRecent()
  // مزامنة «إلى سورة» مع «من سورة» تلقائياً + تحقق من الترتيب
  const syncSurahs = () => {
    const fi = $('#mem-surah-from').selectedIndex
    const ti = $('#mem-surah-to').selectedIndex
    const errEl = $('#surah-order-error')
    if (ti < fi) {
      errEl.classList.remove('hidden')
      return false
    }
    errEl.classList.add('hidden')
    return true
  }
  $('#mem-surah-from').addEventListener('change', () => {
    if ($('#mem-surah-to').selectedIndex < $('#mem-surah-from').selectedIndex) {
      $('#mem-surah-to').selectedIndex = $('#mem-surah-from').selectedIndex
    }
    syncSurahs()
  })
  $('#mem-surah-to').addEventListener('change', syncSurahs)
  $('#save-mem').addEventListener('click', async () => {
    const sid = $('#mem-student').value
    if (!sid) { toast('اختر الطالب', false); return }
    if (!syncSurahs()) { toast('راجع ترتيب السور: «إلى سورة» قبل «من سورة»', false); return }
    const body = {
      student_id: +sid,
      date: $('#mem-date').value,
      type: $('#mem-type').value,
      surah_from: $('#mem-surah-from').value,
      surah_to: $('#mem-surah-to').value,
      ayah_from: $('#mem-ayah-from').value ? +$('#mem-ayah-from').value : null,
      ayah_to: $('#mem-ayah-to').value ? +$('#mem-ayah-to').value : null,
      parts_count: $('#mem-parts').value ? +$('#mem-parts').value : 0,
      evaluation: document.querySelector('input[name="eval"]:checked')?.value || null,
      notes: $('#mem-notes').value.trim() || null,
      completed_surah: $('#mem-completed').checked ? $('#mem-surah-from').value : null,
    }
    try {
      await api('post', '/api/memorization', body)
      toast(body.completed_surah ? 'تم الحفظ وسُجّل الإنجاز 🎉' : 'تم حفظ التسميع بنجاح')
      $('#mem-notes').value = ''
      $('#mem-completed').checked = false
      loadRecent()
    } catch (err) { toast(err.message, false) }
  })
}

async function deleteMem(id) {
  try { await api('delete', `/api/memorization/${id}`); toast('تم الحذف'); render() }
  catch (err) { toast(err.message, false) }
}

// ───────── التقارير ─────────
async function reportsView() {
  const [students, circles] = await Promise.all([api('get', '/api/students'), api('get', '/api/circles')])
  const from = daysAgo(30)
  return `
  <div class="fade-in space-y-4">
    <h2 class="text-xl font-black text-primary-800"><i class="fas fa-file-lines text-gold-500 ml-2"></i>التقارير والإحصائيات</h2>
    <div class="card p-4 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm font-bold text-primary-800">من تاريخ</label><input type="date" id="rep-from" class="input" value="${from}"></div>
        <div><label class="text-sm font-bold text-primary-800">إلى تاريخ</label><input type="date" id="rep-to" class="input" value="${today()}"></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button onclick="quickRange(7)" class="btn btn-outline text-sm">آخر أسبوع</button>
        <button onclick="quickRange(30)" class="btn btn-outline text-sm">آخر شهر</button>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="card p-4 text-center">
        <i class="fas fa-building text-3xl text-primary-600 mb-2"></i>
        <div class="font-black text-primary-800 mb-2">تقرير المركز العام</div>
        <button onclick="centerReport()" class="btn btn-primary text-sm w-full"><i class="fas fa-file-pdf"></i> تصدير PDF</button>
      </div>
      <div class="card p-4 text-center">
        <i class="fas fa-user-graduate text-3xl text-gold-500 mb-2"></i>
        <div class="font-black text-primary-800 mb-2">تقرير طالب</div>
        <select id="rep-student" class="input mb-2 text-sm">${students.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
        <button onclick="studentReport(+$('#rep-student').value)" class="btn btn-primary text-sm w-full"><i class="fas fa-file-pdf"></i> تصدير PDF</button>
      </div>
      <div class="card p-4 text-center">
        <i class="fas fa-mosque text-3xl text-emerald-600 mb-2"></i>
        <div class="font-black text-primary-800 mb-2">تقرير حلقة</div>
        <select id="rep-circle" class="input mb-2 text-sm">${circles.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        <button onclick="circleReport(+$('#rep-circle').value)" class="btn btn-primary text-sm w-full"><i class="fas fa-file-pdf"></i> تصدير PDF</button>
      </div>
    </div>
  </div>`
}

function quickRange(days) {
  $('#rep-from').value = daysAgo(days)
  $('#rep-to').value = today()
}

// توليد صفحة PDF للطباعة مع شعار المركز
function printReport(title, bodyHtml) {
  const w = window.open('', '_blank')
  if (!w) { toast('اسمح بالنوافذ المنبثقة لتصدير PDF', false); return }
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Cairo', sans-serif; }
    body { padding: 24px; color: #1e293b; }
    .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #0d5c4d; padding-bottom: 12px; margin-bottom: 20px; }
    .header img { height: 80px; }
    .header .name { font-size: 20px; font-weight: 900; color: #0d5c4d; }
    .header .sub { font-size: 12px; color: #b8942a; font-weight: 700; }
    h1 { font-size: 18px; color: #0d5c4d; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th { background: #0d5c4d; color: white; padding: 8px 6px; }
    td { border: 1px solid #d7ece8; padding: 6px; text-align: center; }
    tr:nth-child(even) td { background: #f4f9f8; }
    .stat-grid { display: flex; gap: 10px; margin: 12px 0; flex-wrap: wrap; }
    .stat { flex: 1; min-width: 110px; background: #eef7f5; border: 1px solid #b0d9d1; border-radius: 10px; padding: 10px; text-align: center; }
    .stat .v { font-size: 22px; font-weight: 900; color: #0d5c4d; }
    .stat .l { font-size: 11px; color: #64748b; font-weight: 700; }
    .badge { padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <div class="header">
    <img src="/static/logo.png" alt="شعار المركز">
    <div>
      <div class="name">${esc(state.settings.center_name || 'مركز السنة للعلوم الشرعية وتأهيل الدعاة')}</div>
      <div class="sub">${esc(state.settings.center_sub || '')}</div>
      <div class="sub">${title}</div>
    </div>
  </div>
  ${bodyHtml}
  <div class="footer">أُصدر بواسطة نظام إدارة ${esc(state.settings.center_name || 'مركز السنة')} — ${new Date().toLocaleDateString('ar-SA')}</div>
  <script>window.onload = () => setTimeout(() => window.print(), 400)<\/script>
  </body></html>`)
  w.document.close()
}

async function centerReport() {
  const from = $('#rep-from')?.value, to = $('#rep-to')?.value
  const q = from && to ? `?from=${from}&to=${to}` : ''
  const d = await api('get', `/api/reports/center${q}`)
  const attByDate = {}
  d.attendance.forEach((a) => { attByDate[a.date] = attByDate[a.date] || {}; attByDate[a.date][a.status] = a.c })
  const dates = Object.keys(attByDate).sort()
  const totPresent = d.attendance.filter(a => a.status === 'present' || a.status === 'late').reduce((s, a) => s + a.c, 0)
  const totAll = d.attendance.reduce((s, a) => s + a.c, 0)
  const body = `
    <h1>تقرير عام للمركز (${d.from} — ${d.to})</h1>
    <div class="stat-grid">
      <div class="stat"><div class="v">${totAll ? Math.round((totPresent / totAll) * 100) : 0}%</div><div class="l">نسبة الحضور العامة</div></div>
      <div class="stat"><div class="v">${d.memorization.length}</div><div class="l">سجلات حفظ ومراجعة</div></div>
      <div class="stat"><div class="v">${d.memorization.reduce((s, m) => s + (m.type === 'new' ? (m.parts_count || 0) : 0), 0).toFixed(2)}</div><div class="l">أجزاء محفوظة بالفترة</div></div>
    </div>
    <h1>الحضور اليومي</h1>
    <table><tr><th>التاريخ</th><th>حاضر</th><th>غائب</th><th>متأخر</th><th>بإذن</th></tr>
    ${dates.map((dt) => `<tr><td>${dt}</td><td>${attByDate[dt].present || 0}</td><td>${attByDate[dt].absent || 0}</td><td>${attByDate[dt].late || 0}</td><td>${attByDate[dt].excused || 0}</td></tr>`).join('')}</table>
    <h1>ملخص الحلقات</h1>
    <table><tr><th>الحلقة</th><th>الطلاب</th><th>أيام حضور</th><th>أيام غياب</th></tr>
    ${d.circles.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.students}</td><td>${c.present || 0}</td><td>${c.absent || 0}</td></tr>`).join('')}</table>
    <h1>إنجازات الحفظ (آخر 30 سجلاً)</h1>
    <table><tr><th>التاريخ</th><th>الطالب</th><th>النوع</th><th>المقطع</th><th>التقييم</th></tr>
    ${d.memorization.slice(0, 30).map((m) => `<tr><td>${m.date}</td><td>${esc(m.student_name)}</td><td>${m.type === 'new' ? 'حفظ' : 'مراجعة'}</td><td>${esc(m.surah_from || '')}${m.surah_to && m.surah_to !== m.surah_from ? ' — ' + esc(m.surah_to) : ''}</td><td>${EVAL_LABELS[m.evaluation] || '—'}</td></tr>`).join('')}</table>`
  printReport('تقرير المركز العام', body)
}

async function studentReport(id) {
  const from = $('#rep-from')?.value, to = $('#rep-to')?.value
  const q = from && to ? `?from=${from}&to=${to}` : ''
  const d = await api('get', `/api/reports/student/${id}${q}`)
  const st = d.student
  const sum = Object.fromEntries((d.attendance_summary || []).map((r) => [r.status, r.c]))
  const total = (sum.present || 0) + (sum.absent || 0) + (sum.late || 0) + (sum.excused || 0)
  const rate = total ? Math.round((((sum.present || 0) + (sum.late || 0)) / total) * 100) : 0
  const body = `
    <h1>تقرير الطالب: ${esc(st.name)} (${d.from} — ${d.to})</h1>
    <div class="stat-grid">
      <div class="stat"><div class="v">${rate}%</div><div class="l">نسبة الحضور</div></div>
      <div class="stat"><div class="v">${sum.present || 0}</div><div class="l">حاضر</div></div>
      <div class="stat"><div class="v">${sum.absent || 0}</div><div class="l">غائب</div></div>
      <div class="stat"><div class="v">${d.memorization.reduce((s, m) => s + (m.type === 'new' ? (m.parts_count || 0) : 0), 0).toFixed(2)}</div><div class="l">أجزاء بالفترة</div></div>
    </div>
    <p><b>الحلقة:</b> ${esc(st.circle_name || '—')} &nbsp;|&nbsp; <b>المعلم:</b> ${esc(st.teacher_name || '—')} &nbsp;|&nbsp; <b>العمر:</b> ${st.age || '—'} سنة</p>
    ${(d.achievements || []).length ? `<h1>الإنجازات</h1><p>${d.achievements.map((a) => `🏆 ${esc(a.title)} (${a.date})`).join(' — ')}</p>` : ''}
    <h1>سجل الحفظ والمراجعة</h1>
    <table><tr><th>التاريخ</th><th>النوع</th><th>المقطع</th><th>التقييم</th><th>ملاحظات</th></tr>
    ${d.memorization.map((m) => `<tr><td>${m.date}</td><td>${m.type === 'new' ? 'حفظ جديد' : 'مراجعة'}</td><td>${esc(m.surah_from || '')}${m.ayah_from ? ` (${m.ayah_from}${m.ayah_to ? '–' + m.ayah_to : ''})` : ''}</td><td>${EVAL_LABELS[m.evaluation] || '—'}</td><td>${esc(m.notes || '')}</td></tr>`).join('')}</table>
    <h1>سجل الحضور</h1>
    <table><tr><th>التاريخ</th><th>الحالة</th></tr>
    ${d.attendance.map((a) => `<tr><td>${a.date}</td><td><span class="badge" style="background:${ATT_COLORS[a.status]}22;color:${ATT_COLORS[a.status]}">${ATT_LABELS[a.status]}</span></td></tr>`).join('')}</table>`
  printReport(`تقرير الطالب — ${st.name}`, body)
}

async function circleReport(id) {
  const from = $('#rep-from')?.value, to = $('#rep-to')?.value
  const q = from && to ? `?from=${from}&to=${to}` : ''
  const d = await api('get', `/api/reports/circle/${id}${q}`)
  const c = d.circle
  const totPresent = d.students.reduce((s, r) => s + (r.present || 0) + (r.late || 0), 0)
  const totAll = d.students.reduce((s, r) => s + (r.present || 0) + (r.absent || 0) + (r.late || 0) + (r.excused || 0), 0)
  const body = `
    <h1>تقرير ${esc(c.name)} (${d.from} — ${d.to})</h1>
    <p><b>المعلم:</b> ${esc(c.teacher_name || '—')} &nbsp;|&nbsp; <b>الوقت:</b> ${esc(c.time || '—')} &nbsp;|&nbsp; <b>عدد الطلاب:</b> ${d.students.length} &nbsp;|&nbsp; <b>نسبة الحضور:</b> ${totAll ? Math.round((totPresent / totAll) * 100) : 0}%</p>
    <table><tr><th>الطالب</th><th>حاضر</th><th>غائب</th><th>متأخر</th><th>بإذن</th><th>أجزاء محفوظة</th></tr>
    ${d.students.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.present || 0}</td><td>${s.absent || 0}</td><td>${s.late || 0}</td><td>${s.excused || 0}</td><td>${(+s.parts || 0).toFixed(2)}</td></tr>`).join('')}</table>`
  printReport(`تقرير ${c.name}`, body)
}

// ───────── المودال ─────────
function openModal(html) {
  closeModal()
  const el = document.createElement('div')
  el.className = 'modal-backdrop fade-in'
  el.id = 'modal'
  el.innerHTML = `<div class="card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">${html}</div>`
  el.addEventListener('click', closeModal)
  document.body.appendChild(el)
}

function closeModal() { $('#modal')?.remove() }

// ───────── العرض الرئيسي ─────────
async function render() {
  const appEl = $('#app')
  if (!state.user) {
    appEl.innerHTML = loginView()
    bindLogin()
    return
  }
  let content = '<div class="text-center py-16"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>'
  appEl.innerHTML = shell(content)
  bindShell()
  try {
    if (state.page === 'dashboard') {
      content = await dashboardView()
      $('#main-content').innerHTML = content
      if (state.user.role === 'admin') {
        const s = await api('get', '/api/stats')
        bindAdminDashboard(s)
        $('#refresh-dash')?.addEventListener('click', render)
      } else {
        document.querySelectorAll('#main-content [data-nav]').forEach((b) => {
          b.addEventListener('click', () => { state.page = b.dataset.nav; render() })
        })
      }
    } else if (state.page === 'students') {
      const circles = await api('get', '/api/circles')
      content = await studentsView()
      $('#main-content').innerHTML = content
      bindStudents(circles)
    } else if (state.page === 'teachers') {
      content = await teachersView()
      $('#main-content').innerHTML = content
      $('#add-teacher-btn')?.addEventListener('click', () => teacherForm(null))
    } else if (state.page === 'circles') {
      content = await circlesView()
      $('#main-content').innerHTML = content
      const teachers = await api('get', '/api/teachers')
      $('#add-circle-btn')?.addEventListener('click', () => circleForm(null, teachers))
    } else if (state.page === 'attendance') {
      content = await attendanceView()
      $('#main-content').innerHTML = content
      bindAttendance(state.pageParams.date || today())
    } else if (state.page === 'memorization') {
      content = await memorizationView()
      $('#main-content').innerHTML = content
      bindMemorization()
    } else if (state.page === 'reports') {
      content = await reportsView()
      $('#main-content').innerHTML = content
    }
  } catch (err) {
    $('#main-content').innerHTML = `<div class="card p-8 text-center text-red-500 font-bold fade-in"><i class="fas fa-triangle-exclamation text-3xl mb-2"></i><div>${esc(err.message)}</div></div>`
  }
}

// ───────── التشغيل ─────────
async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
  try {
    const me = await api('get', '/api/me')
    state.user = me.user
  } catch (e) { /* غير مسجل */ }
  try { state.settings = await api('get', '/api/settings') } catch (e) { state.settings = {} }
  await render()
  setTimeout(() => {
    const splash = $('#splash')
    if (splash) {
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 650)
    }
  }, 1400)
}

window.openStudent = openStudent
window.editStudent = editStudent
window.deleteStudent = deleteStudent
window.openWhatsApp = openWhatsApp
window.selectTemplate = selectTemplate
window.editTeacher = editTeacher
window.deleteTeacher = deleteTeacher
window.editCircle = editCircle
window.deleteCircle = deleteCircle
window.setAtt = setAtt
window.deleteMem = deleteMem
window.quickRange = quickRange
window.centerReport = centerReport
window.studentReport = studentReport
window.circleReport = circleReport
window.closeModal = closeModal

init()
