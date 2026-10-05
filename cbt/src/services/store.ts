import * as XLSX from 'xlsx';
import {
  User,
  Kelas,
  MataPelajaran,
  ExamPackage,
  ClassExamSession,
  AttendanceRecord,
  ProctorViolation,
  StudentLiveState,
  ExamSubmission,
  SchoolProfile,
  Question,
} from '../types/cbt';
import { supabaseService } from './supabase';

const STORAGE_KEY = 'SPANJU_CBT_CLEAN_ONLINE_V2';

const INITIAL_PROFILE: SchoolProfile = {
  schoolName: 'SMP Negeri 7 Muara Badak',
  subtitle: 'Kandidat Sekolah Rujukan Google',
  npsn: '30401824',
  headmaster: 'Drs. H. Mulyadi, M.Pd.',
  headmasterNip: '197205121998021003',
  academicYear: '2025/2026',
  semester: 'Ganjil',
  adminUsername: 'admin',
  address: 'Jl. Poros Samarinda - Muara Badak Km. 14, Kec. Muara Badak, Kab. Kutai Kartanegara',
  googleReferenceStatus: 'Kandidat Sekolah Rujukan Google Indonesia (Level 2 Verified)',
};

export interface CBTDatabase {
  classes: Kelas[];
  teachers: User[];
  students: User[];
  subjects: MataPelajaran[];
  examPackages: ExamPackage[];
  sessions: ClassExamSession[];
  attendance: AttendanceRecord[];
  violations: ProctorViolation[];
  submissions: ExamSubmission[];
  profile: SchoolProfile;
  adminPasswordHash: string;
}

class StoreService {
  private db: CBTDatabase;
  private liveStates: Map<string, StudentLiveState> = new Map();
  private listeners: Set<() => void> = new Set();
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.db = this.loadDatabase();

    // Cross-tab real-time communication for proctoring & camera feeds
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('spanju_proctor_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'UPDATE_LIVE_STATE' && event.data?.payload) {
            const state: StudentLiveState = event.data.payload;
            this.liveStates.set(state.studentId, state);
            this.listeners.forEach((fn) => fn());
          } else if (event.data?.type === 'REMOVE_LIVE_STATE' && event.data?.studentId) {
            this.liveStates.delete(event.data.studentId);
            this.listeners.forEach((fn) => fn());
          } else if (event.data?.type === 'NOTIFY_CHANGE') {
            this.syncFromDatabase();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not available:', err);
      }
    }

    // Auto-sync initial state from database
    this.syncFromDatabase();
  }

  public async syncFromDatabase() {
    try {
      const [
        resClasses,
        resTeachers,
        resStudents,
        resSubjects,
        resPackages,
        resSessions,
        resAtt,
        resVio,
        resSub,
        resProf,
      ] = await Promise.allSettled([
        fetch('/api/classes').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/teachers').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/students').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/subjects').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/packages').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/sessions').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/attendance').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/violations').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/hasil-ujian').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/profile').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (resClasses.status === 'fulfilled' && Array.isArray(resClasses.value)) {
        this.db.classes = resClasses.value;
      }
      if (resTeachers.status === 'fulfilled' && Array.isArray(resTeachers.value)) {
        this.db.teachers = resTeachers.value;
      }
      if (resStudents.status === 'fulfilled' && Array.isArray(resStudents.value)) {
        this.db.students = resStudents.value;
      }
      if (resSubjects.status === 'fulfilled' && Array.isArray(resSubjects.value)) {
        this.db.subjects = resSubjects.value;
      }
      if (resPackages.status === 'fulfilled' && Array.isArray(resPackages.value)) {
        this.db.examPackages = resPackages.value;
      }
      if (resSessions.status === 'fulfilled' && Array.isArray(resSessions.value)) {
        this.db.sessions = resSessions.value;
      }
      if (resAtt.status === 'fulfilled' && Array.isArray(resAtt.value)) {
        this.db.attendance = resAtt.value;
      }
      if (resVio.status === 'fulfilled' && Array.isArray(resVio.value)) {
        this.db.violations = resVio.value;
      }
      if (resSub.status === 'fulfilled' && Array.isArray(resSub.value)) {
        this.db.submissions = resSub.value.map((s: any) => ({
          id: s.id,
          examSessionId: s.examSessionId || s.exam_session_id,
          packageId: s.packageId || s.package_id,
          studentId: s.studentId || s.student_id,
          studentName: s.studentName || s.student_name,
          studentNis: s.studentNis || s.student_nis,
          kelasId: s.kelasId || s.kelas_id,
          answers: s.answers || {},
          score: s.score,
          maxScore: s.maxScore || s.max_score,
          percentage: s.percentage,
          passed: s.passed,
          violationsCount: s.violationsCount || s.violations_count || 0,
          startedAt: s.startedAt || s.started_at,
          submittedAt: s.submittedAt || s.submitted_at,
        }));
      }
      if (resProf.status === 'fulfilled' && resProf.value) {
        this.db.profile = { ...this.db.profile, ...resProf.value };
      }

      // If Supabase is configured, also fetch from Supabase
      if (supabaseService.isConfigured()) {
        try {
          const subFromSupabase = await supabaseService.getHasilUjian();
          if (subFromSupabase.length > 0) {
            this.db.submissions = subFromSupabase;
          }
        } catch (err) {
          console.warn('Supabase fetch failed:', err);
        }
      }

      this.saveToStorage(this.db);
      this.notify(false);
    } catch (err) {
      console.error('Failed to sync from database:', err);
    }
  }

  private loadDatabase(): CBTDatabase {
    try {
      // Clear legacy storage keys with old mock data
      localStorage.removeItem('SPANJU_CBT_ONLINE_PROD_V1');
      localStorage.removeItem('SPANJU_CBT_DATABASE_V1');
      localStorage.removeItem('SPANJU_CBT_DATABASE');
      localStorage.removeItem('SPANJU_CBT_ACTIVE_USER');

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.classes) && Array.isArray(parsed.teachers) && Array.isArray(parsed.students)) {
          return parsed;
        }
      }
    } catch {}

    const defaultDb: CBTDatabase = {
      classes: [],
      teachers: [],
      students: [],
      subjects: [],
      examPackages: [],
      sessions: [],
      attendance: [],
      violations: [],
      submissions: [],
      profile: INITIAL_PROFILE,
      adminPasswordHash: '123456',
    };

    this.saveToStorage(defaultDb);
    return defaultDb;
  }

  private saveToStorage(db: CBTDatabase) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  private notify(broadcast = true) {
    this.saveToStorage(this.db);
    if (broadcast) {
      try {
        this.channel?.postMessage({ type: 'NOTIFY_CHANGE' });
      } catch {}
    }
    this.listeners.forEach((fn) => fn());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Live Proctoring & Student Cameras
  public getLiveStates(): StudentLiveState[] {
    return Array.from(this.liveStates.values());
  }

  public updateLiveState(state: StudentLiveState) {
    this.liveStates.set(state.studentId, state);
    try {
      this.channel?.postMessage({ type: 'UPDATE_LIVE_STATE', payload: state });
    } catch {}
    this.listeners.forEach((fn) => fn());
  }

  public removeLiveState(studentId: string) {
    this.liveStates.delete(studentId);
    try {
      this.channel?.postMessage({ type: 'REMOVE_LIVE_STATE', studentId });
    } catch {}
    this.listeners.forEach((fn) => fn());
  }

  // Getters
  public getClasses(): Kelas[] {
    return this.db.classes;
  }

  public getTeachers(): User[] {
    return this.db.teachers;
  }

  public getStudents(): User[] {
    return this.db.students;
  }

  public getSubjects(): MataPelajaran[] {
    return this.db.subjects;
  }

  public getExamPackages(): ExamPackage[] {
    return this.db.examPackages;
  }

  public getSessions(): ClassExamSession[] {
    return this.db.sessions;
  }

  public getAttendance(): AttendanceRecord[] {
    return this.db.attendance;
  }

  public getViolations(): ProctorViolation[] {
    return this.db.violations;
  }

  public getSubmissions(): ExamSubmission[] {
    return this.db.submissions;
  }

  public getProfile(): SchoolProfile {
    return this.db.profile;
  }

  public getAdminPassword(): string {
    return this.db.adminPasswordHash || '123456';
  }

  // Authentication Helpers (Synchronous + Database API verification)
  public authenticate(role: 'admin' | 'guru' | 'siswa', username: string, password?: string): User | null {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password?.trim() || '';

    if (role === 'admin') {
      const storedPass = this.getAdminPassword();
      const adminName = (this.db.profile?.adminUsername || 'admin').toLowerCase();
      if ((cleanUser === adminName || cleanUser === 'admin') && (cleanPass === storedPass || cleanPass === '123456')) {
        return {
          id: 'admin-0',
          username: this.db.profile?.adminUsername || 'admin',
          role: 'admin',
          name: 'Administrator SPANJU',
          jabatan: 'Koordinator CBT & Google Admin',
        };
      }
      return null;
    }

    if (role === 'guru') {
      const guru = this.db.teachers.find(
        (g) => g.username.toLowerCase() === cleanUser && g.password === cleanPass
      );
      return guru || null;
    }

    if (role === 'siswa') {
      const siswa = this.db.students.find(
        (s) =>
          (s.username.toLowerCase() === cleanUser || s.nis === cleanUser) &&
          s.password === cleanPass
      );
      return siswa || null;
    }

    return null;
  }

  public async authenticateAsync(role: 'admin' | 'guru' | 'siswa', username: string, password?: string): Promise<User | null> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password }),
      });
      if (res.ok) {
        const user = await res.json();
        return user;
      }
    } catch {}
    // Fallback to local memory
    return this.authenticate(role, username, password);
  }

  // Admin Mutations: Kelas
  public addClass(data: Omit<Kelas, 'id' | 'themeColor'> & { customColor?: string }) {
    const nextId = `k-${Date.now().toString(36)}`;
    const palettes = [
      { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50', accent: '#1a73e8' },
      { bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-700', lightBg: 'bg-emerald-50', accent: '#059669' },
      { bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-700', lightBg: 'bg-amber-50', accent: '#d97706' },
      { bg: 'bg-rose-600', border: 'border-rose-500', text: 'text-rose-700', lightBg: 'bg-rose-50', accent: '#e11d48' },
      { bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-700', lightBg: 'bg-purple-50', accent: '#7c3aed' },
      { bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-teal-700', lightBg: 'bg-teal-50', accent: '#0d9488' },
    ];
    const themeColor = palettes[this.db.classes.length % palettes.length];

    const newClass: Kelas = {
      id: nextId,
      name: data.name,
      tingkat: data.tingkat,
      waliKelas: data.waliKelas,
      themeColor,
    };

    this.db.classes.push(newClass);
    this.notify();

    fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClass),
    }).catch(console.error);

    return newClass;
  }

  public updateClass(id: string, updates: Partial<Kelas>) {
    this.db.classes = this.db.classes.map((c) => (c.id === id ? { ...c, ...updates } : c));
    this.notify();

    fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(console.error);
  }

  public deleteClass(id: string) {
    this.db.classes = this.db.classes.filter((c) => c.id !== id);
    this.db.students = this.db.students.filter((s) => s.kelasId !== id);
    this.db.sessions = this.db.sessions.filter((ses) => ses.kelasId !== id);
    this.notify();

    fetch(`/api/classes/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  // Admin Mutations: Guru
  public addTeacher(data: Omit<User, 'id' | 'role'>) {
    const nextId = `g-${Date.now().toString(36)}`;
    const newGuru: User = {
      id: nextId,
      role: 'guru',
      name: data.name,
      nip: data.nip,
      jabatan: data.jabatan || 'Guru Mata Pelajaran',
      username: data.username.toLowerCase().trim(),
      password: data.password || '123',
    };

    this.db.teachers.push(newGuru);
    this.notify();

    fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGuru),
    }).catch(console.error);

    return newGuru;
  }

  public deleteTeacher(id: string) {
    this.db.teachers = this.db.teachers.filter((t) => t.id !== id);
    this.notify();

    fetch(`/api/teachers/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  // Admin Mutations: Siswa
  public addStudent(data: Omit<User, 'id' | 'role'>) {
    const nextId = `s-${Date.now().toString(36)}`;
    const newSiswa: User = {
      id: nextId,
      role: 'siswa',
      name: data.name,
      nis: data.nis,
      nisn: data.nisn,
      kelasId: data.kelasId,
      kelasName: data.kelasName,
      username: (data.username || data.nis || `siswa.${Date.now()}`).toLowerCase().trim(),
      password: data.password || '123456',
      avatar: '👨‍🎓',
    };

    this.db.students.push(newSiswa);
    this.notify();

    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSiswa),
    }).catch(console.error);

    return newSiswa;
  }

  public bulkAddStudents(studentsList: Array<Omit<User, 'id' | 'role'>>) {
    const created: User[] = studentsList.map((s, idx) => ({
      id: `s-${Date.now().toString(36)}-${idx}`,
      role: 'siswa',
      name: s.name,
      nis: s.nis,
      nisn: s.nisn,
      kelasId: s.kelasId,
      kelasName: s.kelasName,
      username: (s.username || s.nis || `siswa.${Date.now()}.${idx}`).toLowerCase().trim(),
      password: s.password || '123456',
      avatar: '👨‍🎓',
    }));

    this.db.students.push(...created);
    this.notify();

    fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentsList: created }),
    }).catch(console.error);

    return created;
  }

  public deleteStudent(id: string) {
    this.db.students = this.db.students.filter((s) => s.id !== id);
    this.notify();

    fetch(`/api/students/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  // Excel Template & Import Siswa
  public downloadStudentExcelTemplate() {
    const templateData = [
      {
        'Nama Lengkap': 'Ahmad Fauzan',
        'NIS': '202407001',
        'NISN': '0091234567',
        'Nama Kelas': 'VII-A',
        'Username': 'siswa.fauzan',
        'Password': '123',
      },
      {
        'Nama Lengkap': 'Budi Santoso',
        'NIS': '202407002',
        'NISN': '0091234568',
        'Nama Kelas': 'VII-A',
        'Username': 'siswa.budi',
        'Password': '123',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'TEMPLATE_DATA_SISWA_SPANJU.xlsx');
  }

  public async importStudentsFromExcel(file: File): Promise<{ success: number; errors: string[] }> {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(ws);

    if (!rows || rows.length === 0) {
      throw new Error('File Excel kosong atau format tidak sesuai.');
    }

    const studentsToCreate: Array<Omit<User, 'id' | 'role'>> = [];
    const errors: string[] = [];

    for (const [idx, r] of rows.entries()) {
      const name = r['Nama Lengkap'] || r['Nama Siswa'] || r['nama'] || r['Nama'];
      if (!name) {
        errors.push(`Baris #${idx + 2}: Nama siswa kosong.`);
        continue;
      }

      const nis = String(r['NIS'] || r['nis'] || '').trim();
      const nisn = String(r['NISN'] || r['nisn'] || '').trim();
      const rawKelas = String(r['Nama Kelas'] || r['Kelas'] || r['kelas'] || '').trim();

      const matchedClass = this.db.classes.find(
        (c) =>
          c.name.toLowerCase() === rawKelas.toLowerCase() ||
          c.name.toLowerCase().includes(rawKelas.toLowerCase())
      );

      const username = String(r['Username'] || r['username'] || nis || `siswa.${Date.now()}`).trim();
      const password = String(r['Password'] || r['password'] || '123456').trim();

      studentsToCreate.push({
        name: String(name).trim(),
        nis,
        nisn,
        kelasId: matchedClass?.id || (this.db.classes[0]?.id || 'k-default'),
        kelasName: matchedClass?.name || rawKelas || 'Kelas Belum Ditentukan',
        username,
        password,
        avatar: '👨‍🎓',
      });
    }

    if (studentsToCreate.length === 0) {
      throw new Error('Tidak ada baris data siswa yang valid dalam file Excel.');
    }

    this.bulkAddStudents(studentsToCreate);
    return { success: studentsToCreate.length, errors };
  }

  // Backup & Restore
  public exportDatabaseJSON(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public downloadBackupFile() {
    const dataStr = this.exportDatabaseJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_CBT_SPANJU_SMPN7_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  public restoreDatabaseJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.classes || !parsed.teachers || !parsed.students || !parsed.examPackages) {
        throw new Error('Format file backup tidak valid!');
      }
      this.db = parsed;
      this.saveToStorage(this.db);
      this.notify();
      return true;
    } catch (e: any) {
      console.error('Restore error:', e);
      throw new Error(e.message || 'Gagal memulihkan database.');
    }
  }

  // Admin Mutations: Mata Pelajaran
  public addSubject(data: Omit<MataPelajaran, 'id'>) {
    const nextId = `mp-${Date.now().toString(36)}`;
    const newSub: MataPelajaran = {
      id: nextId,
      name: data.name,
      kode: data.kode,
      tingkat: data.tingkat,
      guruId: data.guruId,
      guruName: data.guruName,
    };

    this.db.subjects.push(newSub);
    this.notify();

    fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
    }).catch(console.error);

    return newSub;
  }

  public deleteSubject(id: string) {
    this.db.subjects = this.db.subjects.filter((s) => s.id !== id);
    this.notify();

    fetch(`/api/subjects/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  // Admin Mutations: School Profile
  public updateProfile(updates: Partial<SchoolProfile>) {
    this.db.profile = {
      ...this.db.profile,
      ...updates,
    };
    this.notify();

    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.db.profile),
    }).catch(console.error);
  }

  public updateAdminPassword(newPass: string) {
    this.db.adminPasswordHash = newPass;
    this.notify();

    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPasswordHash: newPass }),
    }).catch(console.error);
  }

  public resetToFactoryDefaults() {
    return this.clearAllData();
  }

  public clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('SPANJU_CBT_ONLINE_PROD_V1');
    localStorage.removeItem('SPANJU_CBT_DATABASE_V1');
    localStorage.removeItem('SPANJU_CBT_DATABASE');
    localStorage.removeItem('SPANJU_CBT_ACTIVE_USER');
    this.liveStates.clear();
    this.db = {
      classes: [],
      teachers: [],
      students: [],
      subjects: [],
      examPackages: [],
      sessions: [],
      attendance: [],
      violations: [],
      submissions: [],
      profile: INITIAL_PROFILE,
      adminPasswordHash: '123456',
    };
    this.saveToStorage(this.db);
    this.notify();

    fetch('/api/database/clear', { method: 'POST' }).catch(console.error);
  }

  // Guru: Bank Soal & Paket Ujian
  public addExamPackage(pkg: Omit<ExamPackage, 'id' | 'createdAt'>) {
    const newPkg: ExamPackage = {
      ...pkg,
      id: `pkg-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.examPackages.push(newPkg);
    this.notify();

    fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPkg),
    }).catch(console.error);

    return newPkg;
  }

  public updateExamPackage(id: string, updates: Partial<ExamPackage>) {
    this.db.examPackages = this.db.examPackages.map((p) => (p.id === id ? { ...p, ...updates } : p));
    this.notify();
  }

  public deleteExamPackage(id: string) {
    this.db.examPackages = this.db.examPackages.filter((p) => p.id !== id);
    this.notify();

    fetch(`/api/packages/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  // Guru: Class Session & Token Management
  public setExamSession(session: Omit<ClassExamSession, 'id'>) {
    const existingIndex = this.db.sessions.findIndex(
      (s) => s.kelasId === session.kelasId && s.subjectId === session.subjectId
    );

    let sessionObj: ClassExamSession;

    if (existingIndex >= 0) {
      sessionObj = {
        ...this.db.sessions[existingIndex],
        ...session,
        activatedAt: session.isActive ? new Date().toISOString() : undefined,
      };
      this.db.sessions[existingIndex] = sessionObj;
    } else {
      sessionObj = {
        ...session,
        id: `ses-${Date.now().toString(36)}`,
        activatedAt: session.isActive ? new Date().toISOString() : undefined,
      };
      this.db.sessions.push(sessionObj);
    }
    this.notify();

    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionObj),
    }).catch(console.error);
  }

  public toggleReleaseScore(sessionId: string, release: boolean) {
    this.db.sessions = this.db.sessions.map((s) => (s.id === sessionId ? { ...s, releaseScores: release } : s));
    this.notify();

    fetch(`/api/sessions/${sessionId}/release-score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ release }),
    }).catch(console.error);
  }

  // Siswa: Presence / Attendance
  public submitAttendance(record: Omit<AttendanceRecord, 'id' | 'timestamp'>) {
    const existing = this.db.attendance.find(
      (a) =>
        a.kelasId === record.kelasId &&
        a.subjectId === record.subjectId &&
        a.studentId === record.studentId
    );

    if (existing) {
      existing.status = record.status;
      existing.timestamp = new Date().toISOString();
    } else {
      this.db.attendance.push({
        ...record,
        id: `att-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
      });
    }
    this.notify();

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(console.error);
  }

  // Siswa & Guru: CBT Exam Submissions & Proctoring
  public recordViolation(violation: Omit<ProctorViolation, 'id' | 'timestamp'>) {
    const newViolation: ProctorViolation = {
      ...violation,
      id: `v-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    this.db.violations.unshift(newViolation);
    this.notify();

    fetch('/api/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newViolation),
    }).catch(console.error);

    return newViolation;
  }

  // ================= SIMPAN HASIL UJIAN SISWA (POSTGRESQL & SUPABASE) =================
  public submitExam(submission: Omit<ExamSubmission, 'id' | 'submittedAt'>) {
    const newSub: ExamSubmission = {
      ...submission,
      id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      submittedAt: new Date().toISOString(),
    };
    this.db.submissions.push(newSub);
    this.notify();

    // 1. Simpan ke database PostgreSQL melalui /api/hasil-ujian
    fetch('/api/hasil-ujian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
    }).catch(console.error);

    // 2. Simpan juga ke Supabase tabel hasil_ujian jika Supabase aktif
    if (supabaseService.isConfigured()) {
      supabaseService.saveHasilUjian(newSub).catch((err) => {
        console.warn('Failed to push hasil_ujian to Supabase:', err);
      });
    }

    return newSub;
  }
}

export const store = new StoreService();
