'use client';

import { useState } from 'react';
import { Plus, X, BookOpen, CheckCircle2, AlertTriangle, Clock, Download, Trash2, Search, Filter } from 'lucide-react';
import { Training, TrainingStatus, Worker } from '@/lib/data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ToastType } from './Toast';
import { motion } from 'motion/react';

const NR_LIST = [
  'NR-01 — Disposições Gerais', 'NR-04 — SESMT', 'NR-05 — CIPA',
  'NR-06 — EPI', 'NR-07 — PCMSO', 'NR-08 — Edificações', 'NR-09 — Agentes Ambientais / PPRA',
  'NR-10 — Eletricidade', 'NR-11 — Transporte', 'NR-12 — Máquinas e Equipamentos',
  'NR-13 — Vasos sob Pressão', 'NR-15 — Atividades Insalubres', 'NR-17 — Ergonomia',
  'NR-18 — Construção Civil', 'NR-20 — Inflamáveis', 'NR-23 — Incêndio',
  'NR-33 — Espaço Confinado', 'NR-35 — Trabalho em Altura', 'NR-36 — Frigoríficos',
  'Outro'
];

const STATUS_CONFIG: Record<TrainingStatus, { color: string; icon: React.ReactNode; label: string }> = {
  'Válido':    { color: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Válido' },
  'Vencendo':  { color: 'border-amber-200 bg-amber-50 text-amber-700',       icon: <Clock className="h-3 w-3" />,         label: 'Vencendo' },
  'Vencido':   { color: 'border-red-200 bg-red-50 text-red-700',             icon: <AlertTriangle className="h-3 w-3" />, label: 'Vencido' },
  'Pendente':  { color: 'border-slate-200 bg-slate-50 text-slate-500',       icon: <Clock className="h-3 w-3" />,         label: 'Pendente' },
};

function calcTrainingStatus(validityDate: string): TrainingStatus {
  const today = new Date();
  const expiry = new Date(validityDate + 'T00:00:00');
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Vencido';
  if (diffDays <= 30) return 'Vencendo';
  return 'Válido';
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export default function TrainingTab({
  trainings, setTrainings, workers, showToast
}: {
  trainings: Training[];
  setTrainings: React.Dispatch<React.SetStateAction<Training[]>>;
  workers: Worker[];
  showToast: (msg: string, type?: ToastType) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [formData, setFormData] = useState<Partial<Training>>({ validityMonths: 12, exams: [] } as any);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const worker = workers.find(w => w.id === formData.workerId);
    const validityDate = addMonths(formData.date!, formData.validityMonths || 12);
    const status = calcTrainingStatus(validityDate);

    const newTraining: Training = {
      id: '',
      name: formData.name || '',
      nr: formData.nr || '',
      workerId: formData.workerId || '',
      workerName: worker?.name || formData.workerName || '',
      date: formData.date || '',
      validityMonths: formData.validityMonths || 12,
      validityDate,
      instructor: formData.instructor || '',
      status,
      certificateUrl: formData.certificateUrl,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('trainings').insert([{
          name: newTraining.name, nr: newTraining.nr, worker_id: newTraining.workerId,
          worker_name: newTraining.workerName, date: newTraining.date,
          validity_months: newTraining.validityMonths, validity_date: newTraining.validityDate,
          instructor: newTraining.instructor, status: newTraining.status
        }]).select();
        if (error) throw error;
        if (data?.[0]) newTraining.id = data[0].id;
      } catch { /* fallback to local */ }
    }

    if (!newTraining.id) newTraining.id = crypto.randomUUID();
    setTrainings(prev => [newTraining, ...prev]);
    setIsModalOpen(false);
    setFormData({ validityMonths: 12 } as any);
    showToast('Treinamento registrado com sucesso!', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro de treinamento?')) return;
    if (isSupabaseConfigured()) {
      await supabase.from('trainings').delete().eq('id', id);
    }
    setTrainings(prev => prev.filter(t => t.id !== id));
    showToast('Treinamento removido.', 'warning');
  };

  const filtered = trainings.filter(t => {
    const matchSearch = t.workerName.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()) || t.nr.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: trainings.length,
    valid: trainings.filter(t => t.status === 'Válido').length,
    expiring: trainings.filter(t => t.status === 'Vencendo').length,
    expired: trainings.filter(t => t.status === 'Vencido').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Treinamentos e Capacitações</h2>
          <p className="text-sm text-slate-500">Controle de validade por NR e e-Social</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-[#1241a1] px-4 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90 transition-colors">
          <Plus className="h-4 w-4" /> Registrar Treinamento
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'bg-blue-50 text-blue-600', icon: <BookOpen className="h-5 w-5" /> },
          { label: 'Válidos', value: stats.valid, color: 'bg-emerald-50 text-emerald-600', icon: <CheckCircle2 className="h-5 w-5" /> },
          { label: 'Vencendo', value: stats.expiring, color: 'bg-amber-50 text-amber-600', icon: <Clock className="h-5 w-5" /> },
          { label: 'Vencidos', value: stats.expired, color: 'bg-red-50 text-red-600', icon: <AlertTriangle className="h-5 w-5" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
            <div className={`rounded-xl p-2.5 ${s.color}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por colaborador ou NR..." className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {['Todos', 'Válido', 'Vencendo', 'Vencido'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`rounded-lg px-3 py-2 text-xs font-bold transition-all border ${filterStatus === s ? 'bg-[#1241a1] text-white border-[#1241a1]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Treinamento / NR</th>
                <th className="px-6 py-4">Realizado em</th>
                <th className="px-6 py-4">Validade</th>
                <th className="px-6 py-4">Instrutor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => {
                const s = STATUS_CONFIG[t.status];
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{t.workerName.charAt(0)}</div>
                        <span className="text-sm font-bold text-slate-800">{t.workerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{t.nr}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(t.date+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">{new Date(t.validityDate+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{t.instructor}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${s.color}`}>
                        {s.icon} {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic text-sm">Nenhum treinamento encontrado. Clique em "Registrar Treinamento" para começar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-serif">Registrar Treinamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Colaborador *</label>
                  <select required value={formData.workerId || ''} onChange={e => { const w = workers.find(w => w.id === e.target.value); setFormData({ ...formData, workerId: e.target.value, workerName: w?.name }); }} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none">
                    <option value="">Selecionar...</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">NR / Treinamento *</label>
                  <select required value={formData.nr || ''} onChange={e => setFormData({ ...formData, nr: e.target.value, name: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none">
                    <option value="">Selecionar NR...</option>
                    {NR_LIST.map(nr => <option key={nr} value={nr}>{nr}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Data de Realização *</label>
                  <input required type="date" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Validade (meses) *</label>
                  <input required type="number" min="1" max="120" value={formData.validityMonths || 12} onChange={e => setFormData({ ...formData, validityMonths: parseInt(e.target.value) || 12 })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Instrutor</label>
                  <input type="text" value={formData.instructor || ''} onChange={e => setFormData({ ...formData, instructor: e.target.value })} placeholder="Nome do instrutor" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2">CANCELAR</button>
                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90 transition-colors">REGISTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
