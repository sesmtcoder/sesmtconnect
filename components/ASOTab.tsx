'use client';

import { useState } from 'react';
import { Plus, X, Heart, CheckCircle2, AlertTriangle, Clock, Trash2, Search } from 'lucide-react';
import { HealthRecord, ASOType, ASOStatus, Worker } from '@/lib/data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ToastType } from './Toast';

const ASO_TYPES: ASOType[] = ['Admissional', 'Periódico', 'Retorno ao Trabalho', 'Mudança de Função', 'Demissional'];
const ASO_STATUS_OPT: ASOStatus[] = ['Apto', 'Apto com Restrição', 'Inapto'];
const EXAM_LIST = [
  'Hemograma Completo', 'Glicemia em Jejum', 'Colesterol Total', 'Triglicerídeos',
  'Creatinina', 'TGO / TGP', 'Audiometria (PAIR)', 'Espirometria',
  'Acuidade Visual', 'Raio-X de Tórax', 'ECG em Repouso',
  'Avaliação Psicológica', 'Hepatite B (Anti-HBs)', 'Toxicológico Urinário',
];

const STATUS_COLORS: Record<string, string> = {
  'Apto': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Apto com Restrição': 'border-amber-200 bg-amber-50 text-amber-700',
  'Inapto': 'border-red-200 bg-red-50 text-red-700',
};

const ASO_VALIDITY_MONTHS: Partial<Record<ASOType, number>> = {
  'Admissional': 12, 'Periódico': 12, 'Retorno ao Trabalho': 12,
  'Mudança de Função': 12, 'Demissional': 0,
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function getValidityBadge(validityDate: string): { label: string; color: string } {
  if (!validityDate) return { label: 'Sem Validade', color: 'border-slate-200 bg-slate-50 text-slate-500' };
  const diffDays = Math.ceil((new Date(validityDate + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Vencido', color: 'border-red-200 bg-red-50 text-red-700' };
  if (diffDays <= 30) return { label: 'Vencendo', color: 'border-amber-200 bg-amber-50 text-amber-700' };
  return { label: 'Em Dia', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
}

export default function ASOTab({ healthRecords, setHealthRecords, workers, showToast }: {
  healthRecords: HealthRecord[];
  setHealthRecords: React.Dispatch<React.SetStateAction<HealthRecord[]>>;
  workers: Worker[];
  showToast: (msg: string, type?: ToastType) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('Todos');
  const [formData, setFormData] = useState<Partial<HealthRecord>>({ exams: [] });
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const worker = workers.find(w => w.id === formData.workerId);
    const months = ASO_VALIDITY_MONTHS[formData.type as ASOType] ?? 12;
    const validityDate = formData.type === 'Demissional' ? '' : addMonths(formData.date!, months);

    const newRecord: HealthRecord = {
      id: '', workerId: formData.workerId || '', workerName: worker?.name || '',
      type: formData.type as ASOType, date: formData.date || '', validityDate,
      doctor: formData.doctor || '', crm: formData.crm || '',
      status: (formData.status as ASOStatus) || 'Apto',
      restrictions: formData.restrictions, exams: selectedExams,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('health_records').insert([{
          worker_id: newRecord.workerId, worker_name: newRecord.workerName,
          type: newRecord.type, date: newRecord.date, validity_date: newRecord.validityDate || null,
          doctor: newRecord.doctor, crm: newRecord.crm, status: newRecord.status,
          restrictions: newRecord.restrictions, exams: newRecord.exams,
        }]).select();
        if (error) throw error;
        if (data?.[0]) newRecord.id = data[0].id;
      } catch { /* fallback */ }
    }

    if (!newRecord.id) newRecord.id = crypto.randomUUID();
    setHealthRecords(prev => [newRecord, ...prev]);
    setIsModalOpen(false);
    setFormData({ exams: [] });
    setSelectedExams([]);
    showToast('ASO registrado com sucesso!', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro de ASO?')) return;
    if (isSupabaseConfigured()) await supabase.from('health_records').delete().eq('id', id);
    setHealthRecords(prev => prev.filter(r => r.id !== id));
    showToast('ASO removido.', 'warning');
  };

  const toggleExam = (exam: string) => setSelectedExams(prev =>
    prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]
  );

  const filtered = healthRecords.filter(r =>
    r.workerName.toLowerCase().includes(search.toLowerCase()) &&
    (filterType === 'Todos' || r.type === filterType)
  );

  const expired = healthRecords.filter(r => r.validityDate && getValidityBadge(r.validityDate).label === 'Vencido').length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Saúde Ocupacional — ASO / PCMSO</h2>
          <p className="text-sm text-slate-500 mt-0.5">Atestados de Saúde Ocupacional e controle de exames (NR-07)</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-[#1241a1] px-4 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90 transition-colors whitespace-nowrap">
          <Plus className="h-4 w-4" /> Novo ASO
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total ASOs', value: healthRecords.length, color: 'bg-blue-50 text-blue-600', icon: <Heart className="h-5 w-5" /> },
          { label: 'Aptos', value: healthRecords.filter(r => r.status === 'Apto').length, color: 'bg-emerald-50 text-emerald-600', icon: <CheckCircle2 className="h-5 w-5" /> },
          { label: 'Com Restrição', value: healthRecords.filter(r => r.status === 'Apto com Restrição').length, color: 'bg-amber-50 text-amber-600', icon: <Clock className="h-5 w-5" /> },
          { label: 'ASO Vencido', value: expired, color: 'bg-red-50 text-red-600', icon: <AlertTriangle className="h-5 w-5" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
            <div className={`rounded-xl p-2.5 ${s.color}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar colaborador..." className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todos', ...ASO_TYPES].map(s => (
            <button key={s} onClick={() => setFilterType(s)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-all border whitespace-nowrap ${filterType === s ? 'bg-[#1241a1] text-white border-[#1241a1]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Tipo de ASO</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Validade</th>
                <th className="px-6 py-4">Médico / CRM</th>
                <th className="px-6 py-4">Resultado</th>
                <th className="px-6 py-4">Status Validade</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => {
                const validity = getValidityBadge(r.validityDate);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{r.workerName.charAt(0)}</div>
                        <span className="text-sm font-bold text-slate-800">{r.workerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{r.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{r.validityDate ? new Date(r.validityDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">{r.doctor}</div>
                      <div className="text-[10px] text-slate-400">CRM {r.crm}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${validity.color}`}>{validity.label}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic text-sm">Nenhum ASO registrado. Clique em "Novo ASO" para começar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-serif">Registrar ASO</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Colaborador *</label>
                  <select required value={formData.workerId || ''} onChange={e => setFormData({ ...formData, workerId: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#1241a1]">
                    <option value="">Selecionar...</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de ASO *</label>
                  <select required value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value as ASOType })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#1241a1]">
                    <option value="">Selecionar...</option>
                    {ASO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Data do ASO *</label>
                  <input required type="date" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Médico *</label>
                  <input required type="text" value={formData.doctor || ''} onChange={e => setFormData({ ...formData, doctor: e.target.value })} placeholder="Dr. Nome" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">CRM *</label>
                  <input required type="text" value={formData.crm || ''} onChange={e => setFormData({ ...formData, crm: e.target.value })} placeholder="12345" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Resultado *</label>
                  <select required value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value as ASOStatus })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#1241a1]">
                    <option value="">Selecionar...</option>
                    {ASO_STATUS_OPT.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Restrições</label>
                  <input type="text" value={formData.restrictions || ''} onChange={e => setFormData({ ...formData, restrictions: e.target.value })} placeholder="Ex: Não subir em altura" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Exames Realizados</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {EXAM_LIST.map(exam => (
                    <label key={exam} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-[#1241a1]">
                      <input type="checkbox" checked={selectedExams.includes(exam)} onChange={() => toggleExam(exam)} className="accent-[#1241a1]" />
                      {exam}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2">CANCELAR</button>
                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90 transition-colors">SALVAR ASO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
