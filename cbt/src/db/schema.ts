import { pgTable, text, integer, boolean, timestamp, serial, jsonb } from 'drizzle-orm/pg-core';

// Users table (Admin, Guru, Siswa)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase UID or local ID
  username: text('username').notNull(),
  password: text('password'),
  role: text('role').notNull(), // 'admin' | 'guru' | 'siswa'
  name: text('name').notNull(),
  nip: text('nip'),
  nis: text('nis'),
  nisn: text('nisn'),
  kelasId: text('kelas_id'),
  kelasName: text('kelas_name'),
  jabatan: text('jabatan'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Ruang Kelas
export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tingkat: integer('tingkat').notNull(), // 7 | 8 | 9
  waliKelas: text('wali_kelas').notNull(),
  themeColor: jsonb('theme_color'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Mata Pelajaran
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kode: text('kode').notNull(),
  tingkat: integer('tingkat').notNull(),
  guruId: text('guru_id'),
  guruName: text('guru_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Paket Soal Ujian (Exam Packages)
export const examPackages = pgTable('exam_packages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subjectId: text('subject_id').notNull(),
  subjectName: text('subject_name').notNull(),
  tingkat: integer('tingkat').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  totalPoints: integer('total_points').notNull(),
  kkm: integer('kkm').notNull(),
  questions: jsonb('questions').notNull(), // Array of Question objects
  createdByGuruId: text('created_by_guru_id').notNull(),
  createdByName: text('created_by_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabel Soal (Specifically requested for CBT items)
export const soal = pgTable('soal', {
  id: text('id').primaryKey(),
  packageId: text('package_id'),
  subjectId: text('subject_id'),
  number: integer('number'),
  type: text('type').notNull(), // 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'benar_salah' | 'menjodohkan' | 'isian_singkat'
  text: text('text').notNull(),
  image: text('image'),
  points: integer('points').default(10).notNull(),
  options: jsonb('options'), // array of { id, label, text, image }
  correctAnswers: jsonb('correct_answers'), // array of strings
  boolStatements: jsonb('bool_statements'),
  matchPairs: jsonb('match_pairs'),
  shortAnswerKeys: jsonb('short_answer_keys'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Sesi Ujian Kelas
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  kelasId: text('kelas_id').notNull(),
  packageId: text('package_id').notNull(),
  subjectId: text('subject_id').notNull(),
  token: text('token').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  releaseScores: boolean('release_scores').default(false).notNull(),
  attendanceRequired: boolean('attendance_required').default(true).notNull(),
  activatedAt: timestamp('activated_at'),
});

// Hasil Ujian Siswa (Specifically requested: tabel hasil_ujian)
export const hasilUjian = pgTable('hasil_ujian', {
  id: text('id').primaryKey(),
  examSessionId: text('exam_session_id').notNull(),
  packageId: text('package_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  studentNis: text('student_nis').notNull(),
  kelasId: text('kelas_id').notNull(),
  answers: jsonb('answers').notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  percentage: integer('percentage').notNull(),
  passed: boolean('passed').notNull(),
  violationsCount: integer('violations_count').default(0).notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  submittedAt: timestamp('submitted_at').defaultNow(),
});

// Pelanggaran Proctoring Real-time
export const violations = pgTable('violations', {
  id: text('id').primaryKey(),
  examSessionId: text('exam_session_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  studentNis: text('student_nis').notNull(),
  kelasId: text('kelas_id').notNull(),
  type: text('type').notNull(), // 'tab_switch' | 'exit_fullscreen' | 'split_screen' | 'screenshot_blocked' | 'blur_window'
  message: text('message').notNull(),
  snapshot: text('snapshot'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Presensi / Kehadiran Siswa
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  kelasId: text('kelas_id').notNull(),
  subjectId: text('subject_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  nis: text('nis').notNull(),
  status: text('status').notNull(), // 'Hadir' | 'Sakit' | 'Izin' | 'Alpha'
  deviceInfo: text('device_info'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Profil Sekolah & Konfigurasi Sistem
export const schoolProfile = pgTable('school_profile', {
  id: serial('id').primaryKey(),
  schoolName: text('school_name').notNull(),
  subtitle: text('subtitle'),
  npsn: text('npsn'),
  headmaster: text('headmaster'),
  headmasterNip: text('headmaster_nip'),
  academicYear: text('academic_year'),
  semester: text('semester'),
  adminUsername: text('admin_username'),
  adminPasswordHash: text('admin_password_hash'),
  address: text('address'),
  googleReferenceStatus: text('google_reference_status'),
});
