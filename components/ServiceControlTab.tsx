'use client';

import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, FileText, Calendar, Edit2, Trash2, MapPin, Briefcase, Clock, CheckCircle2, XCircle, Archive, Eye, LayoutList, ExternalLink, History } from 'lucide-react';
import type { LegalProcess, ProcessTaskStatus, ProcessDocument, ProcessTask } from '@/lib/data';
import type { ToastType } from './Toast';
import { supabase } from '@/lib/supabase';

interface ServiceControlTabProps {
    processes: LegalProcess[];
    setProcesses: React.Dispatch<React.SetStateAction<LegalProcess[]>>;
    showToast: (msg: string, type?: ToastType) => void;
}

const KANBAN_COLUMNS: ProcessTaskStatus[] = ['A FAZER', 'FAZENDO', 'CONCLUÍDO'];

export default function ServiceControlTab({ processes, setProcesses, showToast }: ServiceControlTabProps) {
    const [expandedProcess, setExpandedProcess] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProcess, setEditingProcess] = useState<LegalProcess | null>(null);
    const [formData, setFormData] = useState<Partial<LegalProcess>>({});

    const [taskModalProcessId, setTaskModalProcessId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [viewArchived, setViewArchived] = useState(false);

    const toggleExpand = (id: string) => {
        setExpandedProcess(expandedProcess === id ? null : id);
    };

    const handleOpenNew = () => {
        setEditingProcess(null);
        setFormData({
            processNumber: '',
            court: '',
            claimantName: '',
            expertName: '',
            type: 'Serviço Pontual',
            deadlineDate: '',
            scheduledDate: '',
            status: 'Geração de DFD'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (process: LegalProcess, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProcess(process);
        setFormData({
            processNumber: process.processNumber,
            court: process.court,
            claimantName: process.claimantName,
            expertName: process.expertName,
            type: process.type,
            deadlineDate: process.deadlineDate,
            scheduledDate: process.scheduledDate,
            status: process.status,
        });
        setIsModalOpen(true);
    };

    const handleDeleteProcess = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este processo? Todos os documentos e tarefas anexas serão deletados em cascata pelo banco de dados.')) {
            const { error } = await supabase.from('processes').delete().eq('id', id);
            if (error) {
                showToast('Erro ao excluir processo no banco', 'error');
                return;
            }
            setProcesses(processes.filter(p => p.id !== id));
            showToast('Processo excluído', 'success');
        }
    };

    const handleSaveProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.processNumber || !formData.claimantName || !formData.deadlineDate) {
            showToast('Preencha os campos obrigatórios', 'warning');
            return;
        }

        if (editingProcess) {
            const { data, error } = await supabase.from('processes').update({
                process_number: formData.processNumber,
                court: formData.court,
                claimant_name: formData.claimantName,
                expert_name: formData.expertName,
                type: formData.type,
                deadline_date: formData.deadlineDate,
                scheduled_date: formData.scheduledDate || null,
                status: formData.status
            }).eq('id', editingProcess.id).select().single();

            if (error) {
                showToast('Erro ao atualizar no Supabase', 'error');
                return;
            }

            setProcesses(processes.map(p => p.id === editingProcess.id ? { ...p, ...formData } as LegalProcess : p));
            showToast('Processo atualizado com sucesso!', 'success');
        } else {
            const { data, error } = await supabase.from('processes').insert({
                process_number: formData.processNumber,
                court: formData.court,
                claimant_name: formData.claimantName,
                expert_name: formData.expertName,
                type: formData.type || 'Serviço Pontual',
                deadline_date: formData.deadlineDate,
                scheduled_date: formData.scheduledDate || null,
                status: formData.status || 'Geração de DFD'
            }).select().single();

            if (error) {
                showToast('Erro ao cadastrar no Supabase', 'error');
                return;
            }

            const newProcess: LegalProcess = {
                id: data.id,
                processNumber: data.process_number || '',
                court: data.court || '',
                claimantName: data.claimant_name || '',
                expertName: data.expert_name || '',
                type: data.type || '',
                deadlineDate: data.deadline_date || '',
                scheduledDate: data.scheduled_date || '',
                status: data.status || '',
                documents: [],
                tasks: [],
                isArchived: false
            };
            setProcesses([...processes, newProcess]);
            showToast('Processo cadastrado com sucesso!', 'success');
        }

        setIsModalOpen(false);
        setEditingProcess(null);
        setFormData({});
    };

    const handleArchiveProcess = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase.from('processes').update({ is_archived: true }).eq('id', id);
        if (error) {
            showToast('Erro ao arquivar processo', 'error');
            return;
        }
        setProcesses(processes.map(p => p.id === id ? { ...p, isArchived: true } : p));
        showToast('Processo arquivado', 'success');
    };

    const handleUnarchiveProcess = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase.from('processes').update({ is_archived: false }).eq('id', id);
        if (error) {
            showToast('Erro ao desarquivar processo', 'error');
            return;
        }
        setProcesses(processes.map(p => p.id === id ? { ...p, isArchived: false } : p));
        showToast('Processo restaurado', 'success');
    };

    const handleUpdateTaskStatus = async (processId: string, taskId: string, newStatus: ProcessTaskStatus) => {
        const { error } = await supabase.from('process_tasks').update({ status: newStatus }).eq('id', taskId);
        if (error) {
            showToast('Erro ao mover tarefa no banco', 'error');
            return;
        }
        setProcesses(processes.map(p => {
            if (p.id === processId) {
                return {
                    ...p,
                    tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
                };
            }
            return p;
        }));
    };

    const handleFileUpload = async (processId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        showToast('Fazendo upload...', 'info');

        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${processId}/${fileName}`;

        const { data: storageData, error: storageError } = await supabase.storage
            .from('process_documents')
            .upload(filePath, file);

        if (storageError) {
            showToast('Erro ao fazer upload do arquivo', 'error');
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('process_documents')
            .getPublicUrl(filePath);

        const { data, error } = await supabase.from('process_documents').insert({
            process_id: processId,
            name: file.name,
            file_size: (file.size / 1024).toFixed(0) + ' KB',
            file_path: filePath,
            file_url: publicUrl
        }).select().single();

        if (error) {
            showToast('Erro ao anexar documento no banco', 'error');
            return;
        }

        const newDoc: ProcessDocument = {
            id: data.id,
            name: data.name,
            date: new Date(data.created_at).toLocaleDateString('pt-BR'),
            size: data.file_size || '0 KB',
            url: data.file_url
        };

        setProcesses(processes.map(p => {
            if (p.id === processId) {
                return { ...p, documents: [...p.documents, newDoc] };
            }
            return p;
        }));

        showToast('Documento anexado', 'success');
        event.target.value = '';
    };

    const handleDeleteDocument = async (processId: string, docId: string, filePath?: string) => {
        if (confirm('Remover este documento?')) {
            if (filePath) {
                await supabase.storage.from('process_documents').remove([filePath]);
            }
            const { error } = await supabase.from('process_documents').delete().eq('id', docId);
            if (error) {
                showToast('Erro ao remover documento no banco', 'error');
                return;
            }
            setProcesses(processes.map(p => {
                if (p.id === processId) {
                    return { ...p, documents: p.documents.filter(d => d.id !== docId) };
                }
                return p;
            }));
            showToast('Documento removido', 'success');
        }
    };

    const handleOpenNewTaskModal = (processId: string) => {
        setTaskModalProcessId(processId);
        setNewTaskTitle('');
    };

    const handleSaveNewTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !taskModalProcessId) return;

        const { data, error } = await supabase.from('process_tasks').insert({
            process_id: taskModalProcessId,
            title: newTaskTitle.trim(),
            status: 'A FAZER'
        }).select().single();

        if (error) {
            showToast('Erro ao inserir tarefa no banco', 'error');
            return;
        }

        const newTask: ProcessTask = {
            id: data.id,
            title: data.title,
            status: data.status as ProcessTaskStatus
        };

        setProcesses(processes.map(p => {
            if (p.id === taskModalProcessId) {
                return { ...p, tasks: [...p.tasks, newTask] };
            }
            return p;
        }));

        showToast('Tarefa inserida', 'success');
        setTaskModalProcessId(null);
        setNewTaskTitle('');
    };

    const handleDeleteTask = async (processId: string, taskId: string) => {
        if (confirm('Excluir esta tarefa?')) {
            const { error } = await supabase.from('process_tasks').delete().eq('id', taskId);
            if (error) {
                showToast('Erro ao remover tarefa no banco', 'error');
                return;
            }
            setProcesses(processes.map(p => {
                if (p.id === processId) {
                    return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
                }
                return p;
            }));
            showToast('Tarefa removida', 'success');
        }
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-slate-900">
                        {viewArchived ? 'Processos Arquivados' : 'Controle de Serviços'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {viewArchived ? 'Histórico de processos concluídos e arquivados' : 'Acompanhamento e gestão de processos em andamento'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setViewArchived(!viewArchived)}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-all ${viewArchived
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {viewArchived ? <LayoutList className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        {viewArchived ? 'Ver Ativos' : 'Ver Arquivados'}
                    </button>
                    {!viewArchived && (
                        <button
                            onClick={handleOpenNew}
                            className="flex items-center justify-center gap-2 rounded-lg bg-[#1241a1] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#1241a1]/90"
                        >
                            <Plus className="h-4 w-4" />
                            Novo Processo
                        </button>
                    )}
                </div>
            </div>

            {/* Process List Container */}
            <div className={`flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm ${viewArchived ? 'bg-amber-50/10' : ''}`}>
                {viewArchived && (
                    <div className="bg-amber-100/50 px-6 py-2 text-center text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center justify-center gap-2">
                        <History className="h-3 w-3" /> Modo de Visualização do Histórico
                    </div>
                )}

                {/* Table Header Row (Simulated visually like the photo) */}
                <div className="sticky top-0 z-10 grid grid-cols-12 gap-4 border-b border-slate-200 bg-[#f6f6f8] px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-3 pl-8">Processo / Setores</div>
                    <div className="col-span-2">Nome do Serviço</div>
                    <div className="col-span-2">Categoria</div>
                    <div className="col-span-2">Prazos</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1 text-right">Ações</div>
                </div>

                {/* Process Items */}
                <div className="divide-y divide-slate-100">
                    {processes.filter(p => !!p.isArchived === viewArchived).length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            {viewArchived ? 'Nenhum processo arquivado.' : 'Nenhum processo ativo encontrado.'}
                        </div>
                    ) : (
                        processes
                            .filter(p => !!p.isArchived === viewArchived)
                            .map(process => {
                                const isExpanded = expandedProcess === process.id;

                                return (
                                    <div key={process.id} className={`transition-colors ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                                        {/* Main Row */}
                                        <div
                                            className="grid cursor-pointer grid-cols-12 items-center gap-4 px-6 py-4"
                                            onClick={() => toggleExpand(process.id)}
                                        >
                                            {/* Processo / Vara */}
                                            <div className="col-span-3 flex items-start gap-3">
                                                <button className="mt-0.5 text-slate-400 focus:outline-none">
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                                <div>
                                                    <div className="flex items-center gap-2 font-bold text-slate-900">
                                                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                                        {process.processNumber}
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 line-clamp-1">
                                                        <MapPin className="h-3 w-3" />
                                                        Setores: {process.court}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Serviço */}
                                            <div className="col-span-2 text-sm">
                                                <div className="font-bold text-slate-900 line-clamp-2 leading-tight">{process.claimantName}</div>
                                                <div className="mt-1 text-xs text-slate-500 line-clamp-1">Resp: {process.expertName}</div>
                                            </div>

                                            {/* Tipo */}
                                            <div className="col-span-2 text-sm font-medium text-slate-700 leading-tight">
                                                {process.type}
                                            </div>

                                            {/* Prazos */}
                                            <div className="col-span-2 text-xs">
                                                {process.scheduledDate && (
                                                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        Notificar: {process.scheduledDate}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 font-bold text-red-600">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    Prazo: {process.deadlineDate}
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 uppercase">
                                                    {process.status}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-1 flex items-center justify-end gap-2 text-slate-400">
                                                {!viewArchived ? (
                                                    <>
                                                        {process.status === 'Concluido' && (
                                                            <button onClick={(e) => handleArchiveProcess(process.id, e)} className="hover:text-amber-600 transition-colors p-1" title="Arquivar">
                                                                <Archive className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button onClick={(e) => handleOpenEdit(process, e)} className="hover:text-[#1241a1] transition-colors p-1" title="Editar">
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={(e) => handleDeleteProcess(process.id, e)} className="hover:text-red-500 transition-colors p-1" title="Excluir">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => handleUnarchiveProcess(process.id, e)}
                                                            className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                            title="Restaurar de Arquivo"
                                                        >
                                                            <LayoutList className="h-3 w-3" /> RESTAURAR
                                                        </button>
                                                        <button onClick={(e) => handleDeleteProcess(process.id, e)} className="hover:text-red-500 transition-colors p-1 ml-1" title="Excluir Permanentemente">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Content Panel */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-100 bg-slate-50/80 p-6 lg:p-8">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                                    {/* LEFT: Documentos (GED) */}
                                                    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                                                            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm tracking-wide">
                                                                <FileText className="h-4 w-4 text-[#1241a1]" />
                                                                DOCUMENTOS (GED)
                                                            </div>
                                                            <label
                                                                htmlFor={`upload-${process.id}`}
                                                                className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#1241a1] hover:text-[#1241a1]/80 transition-colors"
                                                            >
                                                                <Plus className="h-3 w-3" /> Anexar
                                                                <input
                                                                    type="file"
                                                                    id={`upload-${process.id}`}
                                                                    className="hidden"
                                                                    onChange={(e) => handleFileUpload(process.id, e)}
                                                                />
                                                            </label>
                                                        </div>
                                                        <div className="p-2 flex flex-col gap-2">
                                                            {process.documents.length === 0 ? (
                                                                <div className="p-4 text-center text-xs text-slate-400 italic">Nenhum documento anexado.</div>
                                                            ) : (
                                                                process.documents.map(doc => (
                                                                    <div key={doc.id} className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:border-[#1241a1]/30 transition-all hover:bg-slate-50/50">
                                                                        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-50 text-blue-500">
                                                                            <FileText className="h-4 w-4" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <a
                                                                                href={doc.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="truncate text-sm font-bold text-slate-700 hover:text-[#1241a1] flex items-center gap-1.5"
                                                                            >
                                                                                {doc.name}
                                                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                            </a>
                                                                            <div className="text-[10px] text-slate-400 mt-0.5">{doc.date} • {doc.size}</div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <a
                                                                                href={doc.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-2 text-slate-400 hover:text-[#1241a1] transition-all"
                                                                                title="Visualizar documento"
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </a>
                                                                            <button
                                                                                onClick={() => handleDeleteDocument(process.id, doc.id, doc.filePath)}
                                                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
                                                                                title="Excluir documento"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* RIGHT: Tarefas do Processo (Mini Kanban) */}
                                                    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                                                            <div className="flex items-center gap-2 font-bold text-emerald-700 text-sm tracking-wide uppercase">
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                Tarefas do Processo
                                                            </div>
                                                            <button
                                                                onClick={() => handleOpenNewTaskModal(process.id)}
                                                                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                                            >
                                                                <Plus className="h-3 w-3" /> Nova Tarefa
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/50">
                                                            {KANBAN_COLUMNS.map(col => {
                                                                const tasksInCol = process.tasks.filter(t => t.status === col);
                                                                return (
                                                                    <div key={col} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-100/50 p-2">
                                                                        <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                            {col}
                                                                        </div>
                                                                        <div className="flex flex-col gap-2 min-h-[100px]">
                                                                            {tasksInCol.map(task => (
                                                                                <div key={task.id} className="group relative rounded border border-slate-200 bg-white p-2 text-xs shadow-sm hover:border-[#1241a1]/50">
                                                                                    <div className="font-semibold text-slate-700">{task.title}</div>

                                                                                    {/* Actions inside card */}
                                                                                    <div className="absolute top-1 right-1 hidden group-hover:block">
                                                                                        <button
                                                                                            onClick={() => handleDeleteTask(process.id, task.id)}
                                                                                            className="text-slate-300 hover:text-red-500 transition-colors p-1 bg-white rounded-full shadow-sm"
                                                                                            title="Excluir Tarefa"
                                                                                        >
                                                                                            <Trash2 className="h-3 w-3" />
                                                                                        </button>
                                                                                    </div>

                                                                                    {/* Hover actions to move tasks */}
                                                                                    <div className="absolute -bottom-2 -right-2 hidden group-hover:flex gap-1 bg-white shadow-md rounded-lg border border-slate-200 p-1 z-10">
                                                                                        {KANBAN_COLUMNS.map(targetCol => {
                                                                                            if (targetCol === col) return null;
                                                                                            let colorClass = 'text-slate-500 hover:bg-slate-100';
                                                                                            if (targetCol === 'A FAZER') colorClass = 'text-slate-600 hover:text-slate-800 hover:bg-slate-100';
                                                                                            if (targetCol === 'FAZENDO') colorClass = 'text-amber-600 hover:text-amber-800 hover:bg-amber-50';
                                                                                            if (targetCol === 'CONCLUÍDO') colorClass = 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50';

                                                                                            return (
                                                                                                <button
                                                                                                    key={targetCol}
                                                                                                    onClick={() => handleUpdateTaskStatus(process.id, task.id, targetCol)}
                                                                                                    className={`text-[9px] px-1.5 py-0.5 rounded transition-colors font-bold ${colorClass}`}
                                                                                                    title={`Mover para ${targetCol}`}
                                                                                                >
                                                                                                    Mover {targetCol}
                                                                                                </button>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>

            {/* Modal de Criação / Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold text-slate-900 font-serif">
                                {editingProcess ? 'Editar Processo' : 'Novo Processo'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveProcess} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Número do Processo *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.processNumber || ''}
                                        onChange={(e) => setFormData({ ...formData, processNumber: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                        placeholder="Ex: 001/2024"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Setores envolvidos</label>
                                    <input
                                        type="text"
                                        value={formData.court || ''}
                                        onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                        placeholder="Ex: Pátio, Administrativo..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome do Serviço *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.claimantName || ''}
                                        onChange={(e) => setFormData({ ...formData, claimantName: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                        placeholder="Ex: Instalação de Equipamentos"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Responsável pela execução</label>
                                    <input
                                        type="text"
                                        value={formData.expertName || ''}
                                        onChange={(e) => setFormData({ ...formData, expertName: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                        placeholder="Nome do responsável"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Categoria (Tipo de Ação)</label>
                                    <select
                                        value={formData.type || ''}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                    >
                                        <option value="Serviço Pontual">Serviço Pontual</option>
                                        <option value="Aquisição/Compra">Aquisição/Compra</option>
                                        <option value="Serviço Continuo">Serviço Continuo</option>
                                        <option value="Serviço Anual">Serviço Anual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
                                    <select
                                        value={formData.status || ''}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                    >
                                        <option value="Geração de DFD">Geração de DFD</option>
                                        <option value="Geração de TR">Geração de TR</option>
                                        <option value="Instauração 1doc">Instauração 1doc</option>
                                        <option value="Tramite SSTMP">Tramite SSTMP</option>
                                        <option value="Liberação Empenho">Liberação Empenho</option>
                                        <option value="Em execução">Em execução</option>
                                        <option value="Concluido">Concluido</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Notificar Vencimento (Opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.scheduledDate || ''}
                                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Prazo Limite *</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.deadlineDate || ''}
                                        onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                    CANCELAR
                                </button>
                                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white shadow hover:bg-[#1241a1]/90 hover:shadow-md transition-all">
                                    SALVAR PROCESSO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Criação / Edição de Tarefa (Mini Kanban) */}
            {taskModalProcessId && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold text-slate-900 font-serif">
                                Inserir Tarefa
                            </h3>
                            <button onClick={() => setTaskModalProcessId(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveNewTask} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Título da Tarefa *</label>
                                <input
                                    required
                                    autoFocus
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:ring-emerald-500 focus:outline-none"
                                    placeholder="Ex: Assinar procuração"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setTaskModalProcessId(null)} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                    CANCELAR
                                </button>
                                <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 hover:shadow-md transition-all">
                                    ADICIONAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
