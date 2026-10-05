import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Question, ExamSubmission } from '../types/cbt';

const STORAGE_SUPABASE_KEY = 'SPANJU_SUPABASE_CONFIG';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;

  constructor() {
    this.init();
  }

  public init() {
    // 1. Check environment variables
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (envUrl && envKey) {
      this.config = { url: envUrl, anonKey: envKey };
      this.client = createClient(envUrl, envKey);
      return;
    }

    // 2. Check local stored config
    try {
      const stored = localStorage.getItem(STORAGE_SUPABASE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          this.config = parsed;
          this.client = createClient(parsed.url, parsed.anonKey);
        }
      }
    } catch {}
  }

  public isConfigured(): boolean {
    return !!(this.client && this.config?.url && this.config?.anonKey);
  }

  public getConfig(): SupabaseConfig | null {
    return this.config;
  }

  public setConfig(url: string, anonKey: string) {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl || !cleanKey) {
      localStorage.removeItem(STORAGE_SUPABASE_KEY);
      this.client = null;
      this.config = null;
      return;
    }

    const newConfig: SupabaseConfig = { url: cleanUrl, anonKey: cleanKey };
    localStorage.setItem(STORAGE_SUPABASE_KEY, JSON.stringify(newConfig));
    this.config = newConfig;
    this.client = createClient(cleanUrl, cleanKey);
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  // ================= 1. AMBIL SOAL DARI TABEL SOAL SUPABASE =================
  public async getSoal(packageId?: string): Promise<Question[]> {
    if (!this.client) {
      // Fallback ke server API internal Cloud SQL
      const url = packageId ? `/api/soal?packageId=${encodeURIComponent(packageId)}` : '/api/soal';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data soal dari server.');
      return await res.json();
    }

    let query = this.client.from('soal').select('*');
    if (packageId) {
      query = query.eq('package_id', packageId);
    }
    query = query.order('number', { ascending: true });

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching soal from Supabase:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      number: row.number || 1,
      text: row.text,
      image: row.image,
      points: row.points || 10,
      options: row.options || [],
      correctAnswers: row.correct_answers || [],
      boolStatements: row.bool_statements || [],
      matchPairs: row.match_pairs || [],
      shortAnswerKeys: row.short_answer_keys || [],
    }));
  }

  // ================= 2. SIMPAN HASIL JAWABAN SISWA KE TABEL HASIL_UJIAN =================
  public async saveHasilUjian(hasil: ExamSubmission): Promise<any> {
    const payload = {
      id: hasil.id,
      exam_session_id: hasil.examSessionId,
      package_id: hasil.packageId,
      student_id: hasil.studentId,
      student_name: hasil.studentName,
      student_nis: hasil.studentNis,
      kelas_id: hasil.kelasId,
      answers: hasil.answers,
      score: hasil.score,
      max_score: hasil.maxScore,
      percentage: hasil.percentage,
      passed: hasil.passed,
      violations_count: hasil.violationsCount,
      started_at: hasil.startedAt,
      submitted_at: hasil.submittedAt || new Date().toISOString(),
    };

    if (!this.client) {
      // Kirim ke server API Cloud SQL
      const res = await fetch('/api/hasil-ujian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Gagal menyimpan hasil ujian ke database server.');
      }
      return await res.json();
    }

    const { data, error } = await this.client
      .from('hasil_ujian')
      .upsert(payload)
      .select();

    if (error) {
      console.error('Error inserting hasil_ujian to Supabase:', error);
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    return data?.[0] || payload;
  }

  // ================= 3. AMBIL SELURUH HASIL UJIAN =================
  public async getHasilUjian(examSessionId?: string, studentId?: string): Promise<ExamSubmission[]> {
    if (!this.client) {
      let url = '/api/hasil-ujian';
      const params = new URLSearchParams();
      if (examSessionId) params.append('examSessionId', examSessionId);
      if (studentId) params.append('studentId', studentId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data hasil ujian dari database server.');
      return await res.json();
    }

    let query = this.client.from('hasil_ujian').select('*');
    if (examSessionId) {
      query = query.eq('exam_session_id', examSessionId);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    query = query.order('submitted_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching hasil_ujian from Supabase:', error);
      throw new Error(`Supabase query error: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      examSessionId: row.exam_session_id,
      packageId: row.package_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentNis: row.student_nis,
      kelasId: row.kelas_id,
      answers: row.answers || {},
      score: row.score,
      maxScore: row.max_score,
      percentage: row.percentage,
      passed: row.passed,
      violationsCount: row.violations_count || 0,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
    }));
  }

  // ================= 4. TEST KONEKSI SUPABASE =================
  public async testConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
    try {
      const tempClient = createClient(url, key);
      const { error } = await tempClient.from('soal').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Koneksi ke Supabase tabel soal & hasil_ujian berhasil terhubung!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal menghubungi Supabase.' };
    }
  }
}

export const supabaseService = new SupabaseService();
