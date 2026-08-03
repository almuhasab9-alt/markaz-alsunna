-- بيانات تجريبية — مركز السنة لتحفيظ القرآن الكريم
-- كلمة المرور لجميع الحسابات التجريبية: 123456
-- (pbkdf2-sha256, 100000 iterations, salt="sunna2026")

-- المستخدمون
INSERT OR IGNORE INTO users (id, name, email, password_hash, salt, role) VALUES
  (1, 'مدير المركز', 'admin@test.com', 'b5199f965d09fcefa4fd3d25c3dec2bc7a89f70b4833d0b589ba4960769244d5', 'sunna2026', 'admin'),
  (2, 'الشيخ أحمد الحربي', 'teacher1@test.com', 'b5199f965d09fcefa4fd3d25c3dec2bc7a89f70b4833d0b589ba4960769244d5', 'sunna2026', 'teacher'),
  (3, 'الشيخ خالد العتيبي', 'teacher2@test.com', 'b5199f965d09fcefa4fd3d25c3dec2bc7a89f70b4833d0b589ba4960769244d5', 'sunna2026', 'teacher'),
  (4, 'الشيخ سالم القحطاني', 'teacher3@test.com', 'b5199f965d09fcefa4fd3d25c3dec2bc7a89f70b4833d0b589ba4960769244d5', 'sunna2026', 'teacher'),
  (5, 'ولي أمر: محمد الغامدي', 'parent1@test.com', 'b5199f965d09fcefa4fd3d25c3dec2bc7a89f70b4833d0b589ba4960769244d5', 'sunna2026', 'parent'),
  (6, 'ولي أمر: عبدالله الشمري', 'parent2@test.com', 'b5199f965d09fcefa4fd3d25c3dec2bc7a89f70b4833d0b589ba4960769244d5', 'sunna2026', 'parent');

-- المعلمون
INSERT OR IGNORE INTO teachers (id, user_id, name, phone) VALUES
  (1, 2, 'الشيخ أحمد الحربي', '0501111111'),
  (2, 3, 'الشيخ خالد العتيبي', '0502222222'),
  (3, 4, 'الشيخ سالم القحطاني', '0503333333');

-- الحلقات
INSERT OR IGNORE INTO circles (id, name, teacher_id, time, days) VALUES
  (1, 'حلقة الفجر', 1, 'بعد الفجر', 'السبت - الخميس'),
  (2, 'حلقة العصر', 2, 'بعد العصر', 'السبت - الخميس'),
  (3, 'حلقة المغرب', 3, 'بعد المغرب', 'الأحد - الخميس');

-- الطلاب (20 طالباً)
INSERT OR IGNORE INTO students (id, name, age, parent_phone, parent_whatsapp, parent_user_id, circle_id) VALUES
  (1, 'يوسف محمد الغامدي', 9, '0551234567', '966551234567', 5, 1),
  (2, 'عمر عبدالله الشمري', 10, '0552345678', '966552345678', 6, 1),
  (3, 'زياد سعد المطيري', 8, '0553456789', '966553456789', NULL, 1),
  (4, 'حمزة فهد الدوسري', 11, '0554567890', '966554567890', NULL, 1),
  (5, 'بلال تركي الزهراني', 9, '0555678901', '966555678901', NULL, 1),
  (6, 'أنس بدر العنزي', 12, '0556789012', '966556789012', NULL, 1),
  (7, 'معاذ ناصر القرني', 10, '0557890123', '966557890123', NULL, 1),
  (8, 'إبراهيم علي الحارثي', 8, '0558901234', '966558901234', NULL, 2),
  (9, 'طه ماجد السبيعي', 9, '0559012345', '966559012345', NULL, 2),
  (10, 'يحيى رائد الشهري', 11, '0560123456', '966560123456', NULL, 2),
  (11, 'داوود هاني المالكي', 10, '0561234567', '966561234567', NULL, 2),
  (12, 'سلمان وليد الجهني', 12, '0562345678', '966562345678', NULL, 2),
  (13, 'ريان خالد الثبيتي', 9, '0563456789', '966563456789', NULL, 2),
  (14, 'أسامة ريان العمري', 13, '0564567890', '966564567890', NULL, 3),
  (15, 'كنان صالح البقمي', 8, '0565678901', '966565678901', NULL, 3),
  (16, 'مروان عادل الرشيدي', 10, '0566789012', '966566789012', NULL, 3),
  (17, 'آدم ياسر الفيفي', 9, '0567890123', '966567890123', NULL, 3),
  (18, 'جاد سلطان الشهراني', 11, '0568901234', '966568901234', NULL, 3),
  (19, 'ليث مشعل الخثعمي', 10, '0569012345', '966569012345', NULL, 3),
  (20, 'ساري بندر الحكمي', 12, '0570123456', '966570123456', NULL, 3);

-- سجلات حضور (آخر 5 أيام) — تنوع الحالات
INSERT OR IGNORE INTO attendance (student_id, date, status, created_by) VALUES
  -- اليوم 1 (قبل 4 أيام)
  (1, date('now','-4 days'), 'present', 2), (2, date('now','-4 days'), 'present', 2),
  (3, date('now','-4 days'), 'present', 2), (4, date('now','-4 days'), 'late', 2),
  (5, date('now','-4 days'), 'present', 2), (6, date('now','-4 days'), 'absent', 2),
  (7, date('now','-4 days'), 'present', 2),
  (8, date('now','-4 days'), 'present', 3), (9, date('now','-4 days'), 'present', 3),
  (10, date('now','-4 days'), 'excused', 3), (11, date('now','-4 days'), 'present', 3),
  (12, date('now','-4 days'), 'present', 3), (13, date('now','-4 days'), 'present', 3),
  (14, date('now','-4 days'), 'present', 4), (15, date('now','-4 days'), 'absent', 4),
  (16, date('now','-4 days'), 'present', 4), (17, date('now','-4 days'), 'present', 4),
  (18, date('now','-4 days'), 'present', 4), (19, date('now','-4 days'), 'late', 4),
  (20, date('now','-4 days'), 'present', 4),
  -- اليوم 2 (قبل 3 أيام)
  (1, date('now','-3 days'), 'present', 2), (2, date('now','-3 days'), 'absent', 2),
  (3, date('now','-3 days'), 'present', 2), (4, date('now','-3 days'), 'present', 2),
  (5, date('now','-3 days'), 'present', 2), (6, date('now','-3 days'), 'present', 2),
  (7, date('now','-3 days'), 'excused', 2),
  (8, date('now','-3 days'), 'present', 3), (9, date('now','-3 days'), 'late', 3),
  (10, date('now','-3 days'), 'present', 3), (11, date('now','-3 days'), 'present', 3),
  (12, date('now','-3 days'), 'absent', 3), (13, date('now','-3 days'), 'present', 3),
  (14, date('now','-3 days'), 'present', 4), (15, date('now','-3 days'), 'present', 4),
  (16, date('now','-3 days'), 'present', 4), (17, date('now','-3 days'), 'absent', 4),
  (18, date('now','-3 days'), 'present', 4), (19, date('now','-3 days'), 'present', 4),
  (20, date('now','-3 days'), 'present', 4),
  -- اليوم 3 (قبل يومين)
  (1, date('now','-2 days'), 'present', 2), (2, date('now','-2 days'), 'present', 2),
  (3, date('now','-2 days'), 'late', 2), (4, date('now','-2 days'), 'present', 2),
  (5, date('now','-2 days'), 'absent', 2), (6, date('now','-2 days'), 'present', 2),
  (7, date('now','-2 days'), 'present', 2),
  (8, date('now','-2 days'), 'present', 3), (9, date('now','-2 days'), 'present', 3),
  (10, date('now','-2 days'), 'present', 3), (11, date('now','-2 days'), 'present', 3),
  (12, date('now','-2 days'), 'present', 3), (13, date('now','-2 days'), 'absent', 3),
  (14, date('now','-2 days'), 'present', 4), (15, date('now','-2 days'), 'present', 4),
  (16, date('now','-2 days'), 'late', 4), (17, date('now','-2 days'), 'present', 4),
  (18, date('now','-2 days'), 'present', 4), (19, date('now','-2 days'), 'present', 4),
  (20, date('now','-2 days'), 'present', 4),
  -- اليوم 4 (أمس)
  (1, date('now','-1 day'), 'present', 2), (2, date('now','-1 day'), 'present', 2),
  (3, date('now','-1 day'), 'present', 2), (4, date('now','-1 day'), 'present', 2),
  (5, date('now','-1 day'), 'present', 2), (6, date('now','-1 day'), 'present', 2),
  (7, date('now','-1 day'), 'present', 2),
  (8, date('now','-1 day'), 'absent', 3), (9, date('now','-1 day'), 'present', 3),
  (10, date('now','-1 day'), 'present', 3), (11, date('now','-1 day'), 'late', 3),
  (12, date('now','-1 day'), 'present', 3), (13, date('now','-1 day'), 'present', 3),
  (14, date('now','-1 day'), 'present', 4), (15, date('now','-1 day'), 'present', 4),
  (16, date('now','-1 day'), 'present', 4), (17, date('now','-1 day'), 'present', 4),
  (18, date('now','-1 day'), 'excused', 4), (19, date('now','-1 day'), 'present', 4),
  (20, date('now','-1 day'), 'present', 4),
  -- اليوم (اليوم الحالي)
  (1, date('now'), 'present', 2), (2, date('now'), 'present', 2),
  (3, date('now'), 'present', 2), (4, date('now'), 'present', 2),
  (5, date('now'), 'absent', 2), (6, date('now'), 'present', 2),
  (7, date('now'), 'present', 2),
  (8, date('now'), 'present', 3), (9, date('now'), 'present', 3),
  (10, date('now'), 'present', 3), (11, date('now'), 'present', 3),
  (12, date('now'), 'present', 3), (13, date('now'), 'late', 3),
  (14, date('now'), 'present', 4), (15, date('now'), 'present', 4),
  (16, date('now'), 'present', 4), (17, date('now'), 'present', 4),
  (18, date('now'), 'present', 4), (19, date('now'), 'present', 4),
  (20, date('now'), 'present', 4);

-- سجلات الحفظ والمراجعة والتقييم
INSERT OR IGNORE INTO memorization (student_id, date, type, surah_from, ayah_from, surah_to, ayah_to, parts_count, evaluation, notes, created_by) VALUES
  (1, date('now','-4 days'), 'new', 'النبأ', 1, 'النبأ', 20, 0.02, 'excellent', 'تسميع ممتاز', 2),
  (1, date('now','-3 days'), 'new', 'النبأ', 21, 'النبأ', 40, 0.02, 'very_good', NULL, 2),
  (1, date('now','-2 days'), 'review', 'عمّ', NULL, 'النبأ', 40, 0.03, 'excellent', NULL, 2),
  (1, date('now','-1 day'), 'new', 'النازعات', 1, 'النازعات', 20, 0.02, 'good', NULL, 2),
  (2, date('now','-3 days'), 'new', 'العلق', 1, 'العلق', 19, 0.02, 'very_good', NULL, 2),
  (2, date('now','-1 day'), 'new', 'القدر', 1, 'القدر', 5, 0.01, 'excellent', NULL, 2),
  (3, date('now','-2 days'), 'new', 'الضحى', 1, 'الضحى', 11, 0.01, 'good', NULL, 2),
  (4, date('now','-2 days'), 'review', 'الفاتحة', NULL, 'الناس', NULL, 0.02, 'very_good', NULL, 2),
  (6, date('now','-3 days'), 'new', 'الملك', 1, 'الملك', 15, 0.04, 'excellent', 'أداء رائع', 2),
  (6, date('now','-1 day'), 'new', 'الملك', 16, 'الملك', 30, 0.03, 'very_good', NULL, 2),
  (8, date('now','-2 days'), 'new', 'الفجر', 1, 'الفجر', 15, 0.02, 'good', NULL, 3),
  (9, date('now','-3 days'), 'new', 'الغاشية', 1, 'الغاشية', 26, 0.02, 'very_good', NULL, 3),
  (10, date('now','-2 days'), 'new', 'الأعلى', 1, 'الأعلى', 19, 0.02, 'excellent', NULL, 3),
  (11, date('now','-1 day'), 'review', 'البروج', NULL, 'الأعلى', NULL, 0.03, 'good', NULL, 3),
  (12, date('now','-2 days'), 'new', 'الطارق', 1, 'الطارق', 17, 0.02, 'needs_review', 'يحتاج تثبيت', 3),
  (14, date('now','-3 days'), 'new', 'الحاقة', 1, 'الحاقة', 20, 0.04, 'very_good', NULL, 4),
  (14, date('now','-1 day'), 'new', 'الحاقة', 21, 'الحاقة', 40, 0.04, 'excellent', NULL, 4),
  (15, date('now','-2 days'), 'new', 'الشمس', 1, 'الشمس', 15, 0.02, 'good', NULL, 4),
  (16, date('now','-3 days'), 'new', 'الليل', 1, 'الليل', 21, 0.02, 'very_good', NULL, 4),
  (17, date('now','-1 day'), 'review', 'البلد', NULL, 'الليل', NULL, 0.03, 'excellent', NULL, 4),
  (18, date('now','-2 days'), 'new', 'القمر', 1, 'القمر', 20, 0.04, 'good', NULL, 4),
  (20, date('now','-3 days'), 'new', 'الرحمن', 1, 'الرحمن', 30, 0.05, 'excellent', 'متميز', 4);

-- إنجازات
INSERT OR IGNORE INTO achievements (student_id, date, title, kind) VALUES
  (1, date('now','-3 days'), 'أتم سورة النبأ', 'surah'),
  (6, date('now','-1 day'), 'أتم سورة الملك', 'surah'),
  (14, date('now','-1 day'), 'أتم سورة الحاقة', 'surah'),
  (2, date('now','-1 day'), 'أتم سورة القدر', 'surah'),
  (10, date('now','-2 days'), 'أتم سورة الأعلى', 'surah');

-- إعدادات
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('center_name', 'مركز السنة لتحفيظ القرآن الكريم'),
  ('center_sub', 'فرع النسيم — الرياض');
