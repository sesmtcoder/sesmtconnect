'use client';

import { useState, useRef } from 'react';
import { Plus, X, Trash2, Search, FileText, Upload, ExternalLink } from 'lucide-react';
import { Accident, AccidentType, AccidentSeverity, AccidentSituacao } from '@/lib/data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ToastType } from './Toast';

const ACCIDENT_TYPES: AccidentType[] = ['Acidente de Trajeto', 'Acidente de Trabalho', 'Doença Ocupacional'];
const SEVERITIES: AccidentSeverity[] = ['Leve', 'Moderado', 'Grave', 'Fatal'];
const SITUACOES: AccidentSituacao[] = ['Inicial', 'Retificação', 'Reabertura'];
const BODY_PARTS = ['Cabeça', 'Pescoço', 'Ombro', 'Braço', 'Cotovelo', 'Antebraço', 'Punho', 'Mão', 'Dedo', 'Tronco', 'Abdômen', 'Costas', 'Coxa', 'Joelho', 'Perna', 'Tornozelo', 'Pé', 'Múltiplas'];

const SEVERITY_COLORS: Record<AccidentSeverity, string> = {
  'Leve': 'border-amber-200 bg-amber-50 text-amber-700',
  'Moderado': 'border-orange-200 bg-orange-50 text-orange-700',
  'Grave': 'border-red-300 bg-red-100 text-red-800',
  'Fatal': 'border-red-900 bg-red-900 text-white',
};
const TYPE_COLORS: Record<AccidentType, string> = {
  'Acidente de Trajeto': 'border-amber-200 bg-amber-50 text-amber-700',
  'Acidente de Trabalho': 'border-red-200 bg-red-50 text-red-700',
  'Doença Ocupacional': 'border-purple-200 bg-purple-50 text-purple-700',
};

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

export default function AccidentsTab({ accidents, setAccidents, showToast }: {
  accidents: Accident[];
  setAccidents: React.Dispatch<React.SetStateAction<Accident[]>>;
  showToast: (msg: string, type?: ToastType) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterYear, setFilterYear] = useState<string>('Todos');
  const [filterMonth, setFilterMonth] = useState<string>('Todos');
  const [filterSector, setFilterSector] = useState<string>('Todos');
  const [formData, setFormData] = useState<Partial<Accident>>({ daysOff: 0, status: 'Aberto', situacao: 'Inicial' });
  const [catPdfFile, setCatPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get distinct values for filters
  const years = Array.from(new Set(accidents.map(a => a.date.substring(0, 4)))).sort().reverse();
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const sectors = Array.from(new Set(accidents.map(a => a.location))).filter(Boolean).sort();

  const resetForm = () => {
    setFormData({ daysOff: 0, status: 'Aberto', situacao: 'Inicial' });
    setCatPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    let catPdfUrl: string | undefined = undefined;

    // Upload PDF to Supabase Storage if present
    if (catPdfFile && isSupabaseConfigured()) {
      try {
        const filePath = `cat-pdfs/${crypto.randomUUID()}-${catPdfFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('accidents')
          .upload(filePath, catPdfFile, { contentType: 'application/pdf' });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('accidents').getPublicUrl(filePath);
        catPdfUrl = urlData?.publicUrl;
      } catch {
        // If storage fails, store as local object URL (session only)
        catPdfUrl = URL.createObjectURL(catPdfFile);
        showToast('PDF salvo localmente. Configure o Supabase Storage para persistir o arquivo.', 'warning');
      }
    } else if (catPdfFile) {
      // No Supabase — use local object URL (session-only)
      catPdfUrl = URL.createObjectURL(catPdfFile);
    }

    const newAccident: Accident = {
      id: '', date: formData.date || '', time: formData.time || '',
      workerId: formData.workerId || '', workerName: formData.workerName || '',
      type: formData.type as AccidentType, situacao: formData.situacao as AccidentSituacao,
      severity: formData.severity as AccidentSeverity,
      location: formData.location || '', description: formData.description || '',
      bodyPart: formData.bodyPart, daysOff: formData.daysOff || 0,
      cid: formData.cid, catNumber: formData.catNumber, catPdfUrl,
      rootCause: formData.rootCause, actionPlan: formData.actionPlan,
      status: formData.status as any || 'Aberto', createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('accidents').insert([{
          date: newAccident.date, time: newAccident.time, worker_id: newAccident.workerId,
          worker_name: newAccident.workerName, type: newAccident.type, situacao: newAccident.situacao,
          severity: newAccident.severity, location: newAccident.location, description: newAccident.description,
          body_part: newAccident.bodyPart, days_off: newAccident.daysOff,
          cid: newAccident.cid, cat_number: newAccident.catNumber, cat_pdf_url: catPdfUrl,
          root_cause: newAccident.rootCause, action_plan: newAccident.actionPlan, status: newAccident.status,
        }]).select();
        if (error) throw error;
        if (data?.[0]) newAccident.id = data[0].id;
      } catch { /* fallback */ }
    }

    if (!newAccident.id) newAccident.id = crypto.randomUUID();
    setAccidents(prev => [newAccident, ...prev]);
    setIsModalOpen(false);
    resetForm();
    setIsUploading(false);
    showToast('Registro de acidente/incidente cadastrado!', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    if (isSupabaseConfigured()) await supabase.from('accidents').delete().eq('id', id);
    setAccidents(prev => prev.filter(a => a.id !== id));
    showToast('Registro removido.', 'warning');
  };

  const filtered = accidents.filter(a => {
    const s = a.workerName.toLowerCase().includes(search.toLowerCase()) || a.location.toLowerCase().includes(search.toLowerCase());
    const t = filterType === 'Todos' || a.type === filterType;
    const y = filterYear === 'Todos' || a.date.startsWith(filterYear);
    const m = filterMonth === 'Todos' || (a.date.length >= 7 && a.date.substring(5, 7) === filterMonth);
    const sec = filterSector === 'Todos' || a.location === filterSector;
    return s && t && y && m && sec;
  });

  const totalDaysOff = accidents.reduce((sum, a) => sum + a.daysOff, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Registro de Acidentes / CAT</h2>
          <p className="text-sm text-slate-500">Comunicação de Acidentes do Trabalho e investigação (e-Social S-2210)</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors">
          <Plus className="h-4 w-4" /> Registrar Ocorrência
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Ocorrências', value: accidents.length, color: 'text-slate-600' },
          { label: 'Ac. Trabalho', value: accidents.filter(a => a.type === 'Acidente de Trabalho').length, color: 'text-red-600' },
          { label: 'Ac. Trajeto', value: accidents.filter(a => a.type === 'Acidente de Trajeto').length, color: 'text-amber-600' },
          { label: 'Dias Afastados', value: totalDaysOff, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por colaborador ou local..." className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-[#1241a1]">
            <option value="Todos">Ano (Todos)</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-[#1241a1]">
            <option value="Todos">Mês (Todos)</option>
            {months.map(m => <option key={m} value={m}>{MONTH_LABELS[m]} ({m})</option>)}
          </select>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-[#1241a1]">
            <option value="Todos">Setor/Local (Todos)</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-[#1241a1]">
            <option value="Todos">Tipo (Todos)</option>
            {ACCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                <th className="px-6 py-4">Data / Hora</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Situação</th>
                <th className="px-6 py-4">Gravidade</th>
                <th className="px-6 py-4">Local</th>
                <th className="px-6 py-4">Dias Afastados</th>
                <th className="px-6 py-4">CAT / PDF</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                    <div className="font-bold">{new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                    <div className="text-xs text-slate-400">{a.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{a.workerName.charAt(0)}</div>
                      <span className="text-sm font-bold text-slate-800">{a.workerName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    {a.situacao && (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-500">{a.situacao}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.location}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{a.daysOff > 0 ? `${a.daysOff} dias` : '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-slate-500">{a.catNumber || '—'}</span>
                      {a.catPdfUrl && (
                        <a href={a.catPdfUrl} target="_blank" rel="noopener noreferrer" title="Abrir PDF da CAT" className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 hover:bg-red-100 transition-colors">
                          <FileText className="h-3 w-3" />
                          PDF
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-emerald-600 font-bold text-sm">✓ Nenhuma ocorrência registrada — Excelente índice de segurança!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-serif">Registrar Ocorrência</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Row 1: Colaborador + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Colaborador *</label>
                  <input required type="text" value={formData.workerName || ''} onChange={e => setFormData({ ...formData, workerName: e.target.value })} placeholder="Nome do colaborador" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#1241a1]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de Ocorrência *</label>
                  <select required value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value as AccidentType })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#1241a1]">
                    <option value="">Selecionar...</option>
                    {ACCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* Row 2: Data + Hora + Gravidade */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Data *</label>
                  <input required type="date" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Hora *</label>
                  <input required type="time" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Gravidade *</label>
                  <select required value={formData.severity || ''} onChange={e => setFormData({ ...formData, severity: e.target.value as AccidentSeverity })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#1241a1]">
                    <option value="">Selecionar...</option>
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {/* Row 3: Situação + Local */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Situação da CAT *</label>
                  <select required value={formData.situacao || 'Inicial'} onChange={e => setFormData({ ...formData, situacao: e.target.value as AccidentSituacao })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#1241a1]">
                    {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Local do Acidente *</label>
                  <input required type="text" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Ex: Linha de Produção 3" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
                </div>
              </div>
              {/* Row 4: Parte do Corpo atingida */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Parte do Corpo Atingida</label>
                <select value={formData.bodyPart || ''} onChange={e => setFormData({ ...formData, bodyPart: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none">
                  <option value="">Não aplicável</option>
                  {BODY_PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {/* Row 5: Descrição */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Descrição do Ocorrido *</label>
                <textarea required value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Descreva o ocorrido detalhadamente..." className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:outline-none" />
              </div>
              {/* Row 6: Dias + CID + CAT Nº */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Dias de Afastamento</label>
                  <input type="number" min="0" value={formData.daysOff || 0} onChange={e => setFormData({ ...formData, daysOff: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">CID (se houver)</label>
                  <input type="text" value={formData.cid || ''} onChange={e => setFormData({ ...formData, cid: e.target.value })} placeholder="Ex: S61.0" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Nº da CAT</label>
                  <input type="text" value={formData.catNumber || ''} onChange={e => setFormData({ ...formData, catNumber: e.target.value })} placeholder="Número da CAT" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                </div>
              </div>
              {/* Row 7: PDF CAT */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">PDF da CAT</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:border-[#1241a1] hover:bg-blue-50/40 transition-colors"
                >
                  <Upload className="h-4 w-4 shrink-0 text-slate-400" />
                  {catPdfFile ? (
                    <span className="flex items-center gap-2 text-[#1241a1] font-medium">
                      <FileText className="h-4 w-4" />
                      {catPdfFile.name}
                      <button type="button" onClick={e => { e.stopPropagation(); setCatPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-1 text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  ) : (
                    <span>Clique para anexar o PDF da CAT (opcional)</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => setCatPdfFile(e.target.files?.[0] || null)}
                />
              </div>
              {/* Row 8: Causa Raiz */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Causa Raiz</label>
                <input type="text" value={formData.rootCause || ''} onChange={e => setFormData({ ...formData, rootCause: e.target.value })} placeholder="Ex: Falta de EPI, Falha de processo..." className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
              </div>
              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2">CANCELAR</button>
                <button type="submit" disabled={isUploading} className="rounded-lg bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60">
                  {isUploading ? 'SALVANDO...' : 'REGISTRAR OCORRÊNCIA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
