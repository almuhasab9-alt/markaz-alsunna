-- مركز السنة لتحفيظ القرآن الكريم — المخطط الأولي

-- المستخدمون (المدير / المعلم / ولي الأمر)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('admin','teacher','parent')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- المعلمون
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- الحلقات
CREATE TABLE IF NOT EXISTS circles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teacher_id INTEGER,
  time TEXT,
  days TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- الطلاب
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER,
  parent_phone TEXT,
  parent_whatsapp TEXT,
  parent_user_id INTEGER,
  circle_id INTEGER,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_user_id) REFERENCES users(id),
  FOREIGN KEY (circle_id) REFERENCES circles(id)
);

-- الجلسات (رمز الجلسة)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- سجل الحضور
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  note TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- سجل الحفظ والمراجعة والتقييم
CREATE TABLE IF NOT EXISTS memorization (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'new' CHECK (type IN ('new','review')),
  surah_from TEXT,
  ayah_from INTEGER,
  surah_to TEXT,
  ayah_to INTEGER,
  parts_count REAL DEFAULT 0,
  evaluation TEXT CHECK (evaluation IN ('excellent','very_good','good','needs_review') OR evaluation IS NULL),
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- إنجازات (إتمام سورة / جزء) — لتوليد رسائل التهنئة
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'surah' CHECK (kind IN ('surah','juz')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- إعدادات المركز (اسم المركز، إلخ)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_students_circle ON students(circle_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_memorization_student ON memorization(student_id);
CREATE INDEX IF NOT EXISTS idx_memorization_date ON memorization(date);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
