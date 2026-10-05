import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import {
  Kelas,
  User,
  MataPelajaran,
  SchoolProfile,
} from '../../types/cbt';
import { SidebarLayout, NavItem } from '../layout/SidebarLayout';
import {
  School,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  Cloud,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit2,
  CheckCircle,
  Database,
  Search,
  Save,
  Key,
  X,
  Sparkles,
  Video,
} from 'lucide-react';
import { ProctorCameraMonitoring } from '../common/ProctorCameraMonitoring';
import { supabaseService } from '../../services/supabase';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
  const [activeNav, setActiveNav] = useState<string>('kelas');

  // Local state mirrored from store
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [profile, setProfile] = useState<SchoolProfile>(store.getProfile());

  // Search & filter
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & form states
  const [showClassModal, setShowClassModal] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', tingkat: 7, waliKelas: '' });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    nip: '',
    jabatan: 'Guru Mata Pelajaran',
    username: '',
    password: '',
  });

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    kode: '',
    tingkat: 7,
    guruId: '',
  });

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    nis: '',
    nisn: '',
    kelasId: '',
    username: '',
    password: '',
  });

  // Admin password reset
  const [adminPassForm, setAdminPassForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Supabase Integration state
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseService.getConfig()?.url || '');
  const [supabaseKey, setSupabaseKey] = useState(supabaseService.getConfig()?.anonKey || '');
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    supabaseService.setConfig(supabaseUrl, supabaseKey);
    showToast('Konfigurasi Supabase berhasil diperbarui!');
    store.syncFromDatabase();
  };

  const handleTestSupabase = async () => {
    if (!supabaseUrl || !supabaseKey) {
      showToast('Masukkan URL dan Anon Key Supabase terlebih dahulu.', 'error');
      return;
    }
    setSupabaseTesting(true);
    setSupabaseTestResult(null);
    const res = await supabaseService.testConnection(supabaseUrl, supabaseKey);
    setSupabaseTesting(false);
    setSupabaseTestResult(res.message);
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  useEffect(() => {
    const sync = () => {
      setClasses(store.getClasses());
      setTeachers(store.getTeachers());
      setStudents(store.getStudents());
      setSubjects(store.getSubjects());
      setProfile(store.getProfile());
    };
    sync();
    return store.subscribe(sync);
  }, []);

  // Class Actions
  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name || !classForm.waliKelas) return;

    if (editingClassId) {
      store.updateClass(editingClassId, {
        name: classForm.name,
        tingkat: Number(classForm.tingkat) as 7 | 8 | 9,
        waliKelas: classForm.waliKelas,
      });
      showToast('Data kelas berhasil diperbarui!');
    } else {
      store.addClass({
        name: classForm.name,
        tingkat: Number(classForm.tingkat) as 7 | 8 | 9,
        waliKelas: classForm.waliKelas,
      });
      showToast('Kelas baru berhasil ditambahkan!');
    }

    setShowClassModal(false);
    setEditingClassId(null);
    setClassForm({ name: '', tingkat: 7, waliKelas: '' });
  };

  // Teacher Actions
  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.username) return;

    store.addTeacher({
      name: teacherForm.name,
      nip: teacherForm.nip,
      jabatan: teacherForm.jabatan,
      username: teacherForm.username,
      password: teacherForm.password || '123',
    });
    showToast('Data Guru baru berhasil ditambahkan!');
    setShowTeacherModal(false);
    setTeacherForm({ name: '', nip: '', jabatan: 'Guru Mata Pelajaran', username: '', password: '' });
  };

  // Subject Actions
  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name || !subjectForm.guruId) return;

    const assignedGuru = teachers.find((t) => t.id === subjectForm.guruId);
    store.addSubject({
      name: subjectForm.name,
      kode: subjectForm.kode || `MP-${Math.floor(Math.random() * 900 + 100)}`,
      tingkat: Number(subjectForm.tingkat) as 7 | 8 | 9,
      guruId: subjectForm.guruId,
      guruName: assignedGuru?.name || 'Guru Pengampu',
    });
    showToast('Mata Pelajaran berhasil ditambahkan!');
    setShowSubjectModal(false);
    setSubjectForm({ name: '', kode: '', tingkat: 7, guruId: '' });
  };

  // Student Actions
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.kelasId) return;

    store.addStudent({
      name: studentForm.name,
      nis: studentForm.nis || `2026${Math.floor(Math.random() * 9000 + 1000)}`,
      nisn: studentForm.nisn || `009${Math.floor(Math.random() * 9000000 + 1000000)}`,
      kelasId: studentForm.kelasId,
      username: studentForm.username || `siswa.${studentForm.nis || Date.now()}`,
      password: studentForm.password || '123',
    });
    showToast('Siswa baru berhasil didaftarkan ke kelas!');
    setShowStudentModal(false);
    setStudentForm({ name: '', nis: '', nisn: '', kelasId: '', username: '', password: '' });
  };

  // Mass Excel Upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await store.importStudentsFromExcel(file);
      showToast(`Berhasil mengimpor ${res.success} data siswa ke kelas masing-masing!`);
      if (res.errors.length > 0) {
        alert(`Catatan impor:\n${res.errors.join('\n')}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses file Excel', 'error');
    }
    e.target.value = '';
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateProfile(profile);
    showToast('Profil sekolah dan tahun pelajaran berhasil disimpan!');
  };

  // Admin Password Change
  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassForm.newPassword !== adminPassForm.confirmPassword) {
      showToast('Konfirmasi password tidak cocok!', 'error');
      return;
    }
    if (adminPassForm.newPassword.length < 4) {
      showToast('Password minimal 4 karakter!', 'error');
      return;
    }
    store.updateAdminPassword(adminPassForm.newPassword);
    showToast('Password Admin berhasil diperbarui!');
    setAdminPassForm({ newPassword: '', confirmPassword: '' });
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchesClass = studentClassFilter === 'all' || s.kelasId === studentClassFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nis && s.nis.includes(searchQuery)) ||
      (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  const adminNavItems: NavItem[] = [
    {
      id: 'kelas',
      label: 'Manajemen Kelas',
      icon: <School className="w-4 h-4" />,
      badge: classes.length,
    },
    {
      id: 'guru',
      label: 'Manajemen Guru',
      icon: <Users className="w-4 h-4" />,
      badge: teachers.length,
    },
    {
      id: 'mapel',
      label: 'Mata Pelajaran',
      icon: <BookOpen className="w-4 h-4" />,
      badge: subjects.length,
    },
    {
      id: 'siswa',
      label: 'Data Siswa & Excel',
      icon: <GraduationCap className="w-4 h-4" />,
      badge: students.length,
    },
    {
      id: 'monitoring',
      label: 'Monitoring CCTV Siswa',
      icon: <Video className="w-4 h-4" />,
    },
    {
      id: 'profil',
      label: 'Profil Sekolah & Sistem',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'deploy',
      label: 'Panduan Cloudflare',
      icon: <Cloud className="w-4 h-4" />,
    },
  ];

  return (
    <SidebarLayout
      user={currentUser}
      onLogout={onLogout}
      activeNav={activeNav}
      onSelectNav={setActiveNav}
      navItems={adminNavItems}
      pageTitle={
        activeNav === 'kelas'
          ? 'Manajemen 7 Ruang Kelas'
          : activeNav === 'guru'
          ? 'Manajemen Guru & Kredensial'
          : activeNav === 'mapel'
          ? 'Struktur Mata Pelajaran Kurikulum'
          : activeNav === 'siswa'
          ? 'Manajemen Siswa & Impor Massal Excel'
          : activeNav === 'monitoring'
          ? 'Monitoring CCTV Siswa (Live Chromebook Proctoring)'
          : activeNav === 'profil'
          ? 'Profil Sekolah & Pemeliharaan Database'
          : 'Panduan Deployment GitHub & Cloudflare'
      }
      pageSubtitle="Pusat Kendali Administrator CBT SPANJU · SMP Negeri 7 Muara Badak"
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.downloadBackupFile()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Backup DB</span>
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-600/30">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restore</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    store.restoreDatabaseJSON(String(event.target?.result));
                    showToast('Database berhasil dipulihkan!');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                };
                reader.readAsText(f);
              }}
            />
          </label>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0f172a] border border-blue-800 text-white text-xs font-semibold rounded-xl shadow-2xl animate-fade-in">
          {toastMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-red-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ================= TAB 1: KELAS ================= */}
      {activeNav === 'kelas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                Daftar Kelas Aktif ({classes.length} Ruang Kelas)
              </h2>
              <p className="text-xs text-slate-400">
                Setiap kotak visual kelas didesain dengan aksen warna khas untuk memudahkan identifikasi.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingClassId(null);
                setClassForm({ name: '', tingkat: 7, waliKelas: '' });
                setShowClassModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {classes.map((cls) => {
              const countSiswa = students.filter((s) => s.kelasId === cls.id).length;
              return (
                <div
                  key={cls.id}
                  className="relative bg-[#0d1733] border border-blue-900/50 hover:border-blue-500 rounded-2xl p-5 shadow-xl flex flex-col justify-between overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-2"
                    style={{ backgroundColor: cls.themeColor.accent }}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-3 mt-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800 text-blue-300 font-mono">
                        Tingkat {cls.tingkat}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingClassId(cls.id);
                            setClassForm({
                              name: cls.name,
                              tingkat: cls.tingkat,
                              waliKelas: cls.waliKelas,
                            });
                            setShowClassModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-400 rounded transition-colors"
                          title="Edit Kelas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus kelas ${cls.name}?`)) {
                              store.deleteClass(cls.id);
                              showToast(`Kelas ${cls.name} dihapus.`);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold font-display text-white tracking-tight">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Wali: <span className="text-slate-200">{cls.waliKelas}</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-blue-950 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Kapasitas Siswa</span>
                    <span className="font-bold font-mono text-blue-300">
                      {countSiswa} Siswa
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: GURU ================= */}
      {activeNav === 'guru' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                Daftar Dewan Guru & Akun CBT ({teachers.length} Orang)
              </h2>
              <p className="text-xs text-slate-400">
                Kelola kredensial guru untuk login ke modul bank soal dan monitoring ujian.
              </p>
            </div>
            <button
              onClick={() => setShowTeacherModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru Baru</span>
            </button>
          </div>

          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                    <th className="py-3 px-4">NIP</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Username Login</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950 text-slate-300">
                  {teachers.map((guru) => (
                    <tr key={guru.id} className="hover:bg-blue-950/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{guru.avatar || '👨‍🏫'}</span>
                          <span>{guru.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{guru.nip || '-'}</td>
                      <td className="py-3 px-4 text-slate-300">{guru.jabatan || 'Guru'}</td>
                      <td className="py-3 px-4 font-mono text-blue-400 font-semibold">
                        {guru.username}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Hapus akun guru ${guru.name}?`)) {
                              store.deleteTeacher(guru.id);
                              showToast(`Akun guru ${guru.name} dihapus.`);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: MATA PELAJARAN ================= */}
      {activeNav === 'mapel' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                Struktur Mata Pelajaran Kurikulum ({subjects.length} Mapel)
              </h2>
              <p className="text-xs text-slate-400">
                11 mata pelajaran pokok sesuai struktur kurikulum nasional untuk Kelas 7, 8, dan 9.
              </p>
            </div>
            <button
              onClick={() => setShowSubjectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mata Pelajaran</span>
            </button>
          </div>

          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Nama Mata Pelajaran</th>
                    <th className="py-3 px-4">Tingkat</th>
                    <th className="py-3 px-4">Guru Pengampu</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950 text-slate-300">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-blue-950/30">
                      <td className="py-3 px-4 font-mono font-bold text-blue-300">{sub.kode}</td>
                      <td className="py-3 px-4 font-semibold text-white">{sub.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 font-mono rounded">
                          Kelas {sub.tingkat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{sub.guruName}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Hapus mapel ${sub.name}?`)) {
                              store.deleteSubject(sub.id);
                              showToast(`Mata pelajaran dihapus.`);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: DATA SISWA & EXCEL ================= */}
      {activeNav === 'siswa' && (
        <div className="space-y-6">
          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-display text-white">
                  Manajemen Siswa & Impor Massal Excel
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gunakan template Excel untuk mendaftarkan siswa secara massal. Siswa otomatis terfilter ke kelas masing-masing.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => store.downloadStudentExcelTemplate()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template Excel</span>
                </button>

                <label className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Excel Siswa</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleExcelUpload}
                  />
                </label>

                <button
                  onClick={() => setShowStudentModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-800 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah 1 Siswa</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-blue-950">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa, NIS, atau username..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#091024] text-white border border-blue-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <select
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-[#091024] text-white border border-blue-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="all">Semua Kelas ({students.length} Siswa)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({students.filter((s) => s.kelasId === cls.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#091024] border-b border-blue-950 text-blue-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">NISN</th>
                    <th className="py-3 px-4">Ruang Kelas</th>
                    <th className="py-3 px-4">Username Login</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950 text-slate-300">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Tidak ada siswa yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-blue-950/30">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{s.avatar || '👦'}</span>
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{s.nis || '-'}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{s.nisn || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-semibold font-mono">
                            {s.kelasName || 'Kelas'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-400">
                          {s.username}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Hapus siswa ${s.name}?`)) {
                                store.deleteStudent(s.id);
                                showToast(`Siswa ${s.name} berhasil dihapus.`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PROFIL SEKOLAH & SISTEM ================= */}
      {activeNav === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
              <School className="w-4 h-4 text-blue-400" />
              <span>Identitas Sekolah & Tahun Pelajaran</span>
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-blue-300 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  value={profile.schoolName}
                  onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">Status Google Rujukan</label>
                <input
                  type="text"
                  value={profile.subtitle}
                  onChange={(e) => setProfile({ ...profile, subtitle: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">NPSN</label>
                  <input
                    type="text"
                    value={profile.npsn}
                    onChange={(e) => setProfile({ ...profile, npsn: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Semester Aktif</label>
                  <select
                    value={profile.semester}
                    onChange={(e) =>
                      setProfile({ ...profile, semester: e.target.value as 'Ganjil' | 'Genap' })
                    }
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-semibold focus:outline-hidden"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Kepala Sekolah</label>
                  <input
                    type="text"
                    value={profile.headmaster}
                    onChange={(e) => setProfile({ ...profile, headmaster: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">NIP Kepala Sekolah</label>
                  <input
                    type="text"
                    value={profile.headmasterNip}
                    onChange={(e) => setProfile({ ...profile, headmasterNip: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">Tahun Pelajaran</label>
                <input
                  type="text"
                  value={profile.academicYear}
                  onChange={(e) => setProfile({ ...profile, academicYear: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-semibold focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {/* Supabase & Cloud SQL Integration Card */}
            <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Koneksi Database & Supabase</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300">
                  ● Cloud SQL Active
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi terhubung ke database Cloud SQL PostgreSQL (<code className="text-cyan-300 font-mono">asia-southeast1</code>). Anda juga dapat menghubungkan project Supabase mandiri untuk tabel <code className="text-cyan-300 font-mono">soal</code> dan <code className="text-cyan-300 font-mono">hasil_ujian</code>.
              </p>

              <form onSubmit={handleSaveSupabase} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Supabase Project URL</label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Supabase Anon / Public API Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>

                {supabaseTestResult && (
                  <div className="p-2.5 bg-[#081024] rounded-lg border border-blue-900 text-[11px] text-blue-200">
                    {supabaseTestResult}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={supabaseTesting}
                    className="flex-1 py-2 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-200 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    {supabaseTesting ? 'Menguji...' : 'Uji Koneksi Supabase'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    Simpan Supabase
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Kredensial & Reset Password Admin</span>
              </h2>
              <p className="text-xs text-slate-400">
                Username Admin saat ini: <strong className="font-mono text-blue-300">{profile.adminUsername}</strong>
              </p>

              <form onSubmit={handleChangeAdminPassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password admin baru"
                    value={adminPassForm.newPassword}
                    onChange={(e) =>
                      setAdminPassForm({ ...adminPassForm, newPassword: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password baru"
                    value={adminPassForm.confirmPassword}
                    onChange={(e) =>
                      setAdminPassForm({ ...adminPassForm, confirmPassword: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#091024] text-white border border-blue-900 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Perbarui Password Admin
                </button>
              </form>
            </div>

            <div className="bg-[#0d1733] border border-red-900/40 rounded-2xl p-6 shadow-xl space-y-3">
              <h2 className="text-base font-bold font-display text-red-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-red-400" />
                <span>Kosongkan & Bersihkan Database (Siap Pakai Online)</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hapus seluruh data dumb / riwayat kelas, siswa, guru, mapel, dan sesi ujian sehingga aplikasi bersih kosong dan siap diinput data riil. Akun admin tetap dipertahankan (username: <strong className="text-white font-mono">admin</strong>, password: <strong className="text-white font-mono">123456</strong>).
              </p>

              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      'PERINGATAN: Kosongkan seluruh data aplikasi untuk persiapan online? Hanya akun admin (admin / 123456) yang tersisa.'
                    )
                  ) {
                    store.clearAllData();
                    showToast('Seluruh data berhasil dikosongkan. Akun admin tetap aktif (admin / 123456).');
                  }
                }}
                className="w-full py-2.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Kosongkan Seluruh Data (Clear All Data)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: PANDUAN GITHUB & CLOUDFLARE ================= */}
      {activeNav === 'deploy' && (
        <div className="bg-[#0d1733] border border-blue-900/50 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                Panduan Deployment: GitHub & Cloudflare Pages / Workers
              </h2>
              <p className="text-xs text-slate-400">
                Arsitektur CBT SPANJU dirancang cloud-ready dan dapat langsung di-deploy gratis dengan latency super cepat di edge Cloudflare.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-[#091024] rounded-xl border border-blue-950 text-xs text-slate-300 space-y-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>Push Repositori ke GitHub</span>
              </div>
              <p className="text-slate-400">
                Jalankan perintah berikut di terminal lokal untuk mendorong kode ke repositori GitHub sekolah:
              </p>
              <div className="p-3 bg-black/60 text-blue-300 rounded-lg font-mono text-[11px] overflow-x-auto space-y-1 border border-blue-950">
                <div>git init</div>
                <div>git add .</div>
                <div>git commit -m &quot;feat: initial CBT SPANJU Chromebook Ready&quot;</div>
                <div>git branch -M main</div>
                <div>git remote add origin https://github.com/USERNAME/cbt-spanju.git</div>
                <div>git push -u origin main</div>
              </div>
            </div>

            <div className="p-5 bg-[#091024] rounded-xl border border-blue-950 text-xs text-slate-300 space-y-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>Hubungkan ke Cloudflare Pages</span>
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                <li>Buka dashboard Cloudflare &gt; <strong>Workers & Pages</strong>.</li>
                <li>Pilih <strong>Create application &gt; Pages &gt; Connect to Git</strong>.</li>
                <li>Pilih repositori <code>cbt-spanju</code> dari GitHub Anda.</li>
                <li>Build preset: <strong>Vite</strong> | Build command: <code>npm run build</code></li>
                <li>Build output directory: <code>dist</code></li>
                <li>Klik <strong>Save and Deploy</strong>. Selesai!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 7: MONITORING CCTV SISWA ================= */}
      {activeNav === 'monitoring' && (
        <ProctorCameraMonitoring
          currentUserRole="admin"
          currentUserName={currentUser.name}
        />
      )}

      {/* ================= MODAL: KELAS (FIXED HEIGHT & SCROLL) ================= */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-[#060b1c]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#0e172e] border border-blue-800/60 text-slate-100 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-blue-900/40 bg-[#0a1226] flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold font-display text-white">
                {editingClassId ? 'Edit Data Kelas' : 'Tambah Ruang Kelas Baru'}
              </h3>
              <button
                onClick={() => setShowClassModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-blue-300 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas VII-A, Kelas VIII-C"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">Tingkat Kelas</label>
                <select
                  value={classForm.tingkat}
                  onChange={(e) =>
                    setClassForm({ ...classForm, tingkat: Number(e.target.value) as 7 | 8 | 9 })
                  }
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                >
                  <option value={7}>Tingkat 7 (Kelas VII)</option>
                  <option value={8}>Tingkat 8 (Kelas VIII)</option>
                  <option value={9}>Tingkat 9 (Kelas IX)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">Nama Wali Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siti Rahmawati, S.Pd."
                  value={classForm.waliKelas}
                  onChange={(e) => setClassForm({ ...classForm, waliKelas: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 bg-blue-950 text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GURU ================= */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 bg-[#060b1c]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#0e172e] border border-blue-800/60 text-slate-100 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-blue-900/40 bg-[#0a1226] flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold font-display text-white">
                Tambah Guru Pengampu Baru
              </h3>
              <button
                onClick={() => setShowTeacherModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTeacher} className="flex-1 overflow-y-auto p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-blue-300 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Fauzi, S.Kom."
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">NIP (Opsional)</label>
                <input
                  type="text"
                  placeholder="198503142010011012"
                  value={teacherForm.nip}
                  onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">Jabatan / Keterangan</label>
                <input
                  type="text"
                  value={teacherForm.jabatan}
                  onChange={(e) => setTeacherForm({ ...teacherForm, jabatan: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="guru.ahmad"
                    value={teacherForm.username}
                    onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Bawaan: 123"
                    value={teacherForm.password}
                    onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2 bg-blue-950 text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MAPEL ================= */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-[#060b1c]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#0e172e] border border-blue-800/60 text-slate-100 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-blue-900/40 bg-[#0a1226] flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold font-display text-white">
                Tambah Mata Pelajaran
              </h3>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="flex-1 overflow-y-auto p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-blue-300 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bahasa Inggris"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Kode Mapel</label>
                  <input
                    type="text"
                    placeholder="MP7-01"
                    value={subjectForm.kode}
                    onChange={(e) => setSubjectForm({ ...subjectForm, kode: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Tingkat</label>
                  <select
                    value={subjectForm.tingkat}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, tingkat: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                  >
                    <option value={7}>Kelas 7</option>
                    <option value={8}>Kelas 8</option>
                    <option value={9}>Kelas 9</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">Guru Pengampu</label>
                <select
                  required
                  value={subjectForm.guruId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, guruId: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                >
                  <option value="">-- Pilih Guru Pengampu --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 bg-blue-950 text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: 1 SISWA ================= */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-[#060b1c]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#0e172e] border border-blue-800/60 text-slate-100 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-blue-900/40 bg-[#0a1226] flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold font-display text-white">Tambah Siswa Baru</h3>
              <button
                onClick={() => setShowStudentModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-blue-300 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rizky Pratama"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">NIS</label>
                  <input
                    type="text"
                    placeholder="202407001"
                    value={studentForm.nis}
                    onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">NISN</label>
                  <input
                    type="text"
                    placeholder="0098472819"
                    value={studentForm.nisn}
                    onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-blue-300 mb-1">Ruang Kelas</label>
                <select
                  required
                  value={studentForm.kelasId}
                  onChange={(e) => setStudentForm({ ...studentForm, kelasId: e.target.value })}
                  className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-semibold text-white focus:outline-hidden"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tingkat {c.tingkat})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Username Login</label>
                  <input
                    type="text"
                    placeholder="siswa.202407001"
                    value={studentForm.username}
                    onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-300 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Bawaan: 123"
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    className="w-full p-2.5 bg-[#091024] border border-blue-800 rounded-xl font-mono text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 bg-blue-950 text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};
