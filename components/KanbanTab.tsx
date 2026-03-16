'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Clock, Calendar, CheckCircle2, Circle, ArrowRightCircle, AlertTriangle, AlertCircle, X, Send, Paperclip, FileText, ExternalLink, Trash2, Eye, Archive, RefreshCcw, History } from 'lucide-react';
import { motion } from 'motion/react';
import type { ServiceTask, TaskStatus, TaskComment, ProcessDocument } from '@/lib/data';
import type { ToastType } from './Toast';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const COLUMNS: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído'];

const PRIORITY_COLORS = {
    'Baixa': 'bg-slate-100 text-slate-700 border-slate-200',
    'Média': 'bg-blue-100 text-blue-700 border-blue-200',
    'Alta': 'bg-amber-100 text-amber-700 border-amber-200',
    'Urgente': 'bg-red-100 text-red-700 border-red-200'
};

const COLUMN_COLORS = {
    'A Fazer': 'bg-[#F1F5F9] border-slate-200',
    'Em Andamento': 'bg-[#E0F2FE] border-blue-200',
    'Em Revisão': 'bg-[#F3E8FF] border-purple-200',
    'Concluído': 'bg-[#DCFCE7] border-emerald-200'
};

const COLUMN_TEXT_COLORS = {
    'A Fazer': 'text-slate-600',
    'Em Andamento': 'text-blue-700',
    'Em Revisão': 'text-purple-700',
    'Concluído': 'text-emerald-700'
};

export default function KanbanTab({
    tasks,
    setTasks,
    userEmail,
    showToast
}: {
    tasks: ServiceTask[];
    setTasks: React.Dispatch<React.SetStateAction<ServiceTask[]>>;
    userEmail: string;
    showToast: (message: string, type?: ToastType) => void;
}) {
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [viewingTask, setViewingTask] = useState<ServiceTask | null>(null);
    const [newComment, setNewComment] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Form states for new task
    const [newTaskData, setNewTaskData] = useState<Partial<ServiceTask>>({
        status: 'A Fazer',
        priority: 'Média',
        comments: []
    });

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskData.title) return;

        const newTask: ServiceTask = {
            id: '',
            title: newTaskData.title || '',
            description: newTaskData.description || '',
            status: newTaskData.status as TaskStatus || 'A Fazer',
            dueDate: newTaskData.dueDate || new Date().toISOString().split('T')[0],
            priority: newTaskData.priority as any || 'Média',
            comments: [],
            documents: [],
            assignee: newTaskData.assignee || 'Não atribuído',
            isArchived: false,
            createdAt: new Date().toISOString()
        };

        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase.from('erp_tasks').insert([{
                    title: newTask.title,
                    description: newTask.description,
                    status: newTask.status,
                    due_date: newTask.dueDate,
                    priority: newTask.priority,
                    assignee: newTask.assignee,
                    is_archived: false
                }]).select();

                if (error) throw error;
                if (data && data.length > 0) {
                    newTask.id = data[0].id;
                } else {
                    // Se não retornou data (RLS?), gera um id temporário para não quebrar a UI
                    newTask.id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
                }
            } catch (err: any) {
                console.error('Erro ao criar tarefa Supabase:', {
                    message: err.message,
                    code: err.code,
                    details: err.details,
                    hint: err.hint,
                    error: err
                });
                showToast(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`, 'error');
                return;
            }
        } else {
            newTask.id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        }

        setTasks([...tasks, newTask]);
        setIsNewTaskModalOpen(false);
        setNewTaskData({ status: 'A Fazer', priority: 'Média', comments: [] });
        showToast('Serviço cadastrado com sucesso!', 'success');
    };

    const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
        if (isSupabaseConfigured()) {
            try {
                const { error } = await supabase.from('erp_tasks')
                    .update({ status: newStatus })
                    .eq('id', taskId);
                if (error) throw error;
            } catch (err) {
                showToast('Erro ao atualizar status.', 'error');
                return;
            }
        }
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        if (viewingTask?.id === taskId) {
            setViewingTask({ ...viewingTask, status: newStatus });
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingTask || !newComment.trim()) return;

        const comment: TaskComment = {
            id: '',
            text: newComment.trim(),
            createdAt: new Date().toISOString(),
            author: userEmail || 'Usuário Atual'
        };

        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase.from('erp_task_comments').insert([{
                    task_id: viewingTask.id,
                    text: comment.text,
                    author: comment.author
                }]).select();

                if (error) throw error;
                if (data && data.length > 0) {
                    comment.id = data[0].id;
                } else {
                    comment.id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
                }
            } catch (err: any) {
                console.error('Erro ao adicionar comentário:', err);
                showToast('Erro ao comentar.', 'error');
                return;
            }
        } else {
            comment.id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        }

        const updatedTask = {
            ...viewingTask,
            comments: [...viewingTask.comments, comment]
        };

        setTasks(tasks.map(t => t.id === viewingTask.id ? updatedTask : t));
        setViewingTask(updatedTask);
        setNewComment('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !viewingTask) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `erp_tasks/${viewingTask.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('erp_documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('erp_documents')
                .getPublicUrl(filePath);

            const { data: docData, error: dbError } = await supabase.from('erp_task_documents').insert([{
                task_id: viewingTask.id,
                name: file.name,
                file_url: publicUrl,
                file_path: filePath,
                file_size: `${(file.size / 1024).toFixed(1)} KB`
            }]).select();

            if (dbError) throw dbError;

            const newDoc: ProcessDocument = {
                id: docData[0].id,
                name: file.name,
                date: new Date().toLocaleDateString(),
                size: `${(file.size / 1024).toFixed(1)} KB`,
                url: publicUrl,
                filePath: filePath
            };

            const updatedTask = {
                ...viewingTask,
                documents: [...(viewingTask.documents || []), newDoc]
            };

            setTasks(tasks.map(t => t.id === viewingTask.id ? updatedTask : t));
            setViewingTask(updatedTask);
            showToast('Documento anexado!', 'success');
        } catch (err: any) {
            console.error(err);
            showToast('Erro no anexo.', 'error');
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleDeleteDocument = async (docId: string, filePath?: string) => {
        if (!viewingTask) return;
        try {
            if (filePath && isSupabaseConfigured()) {
                await supabase.storage.from('erp_documents').remove([filePath]);
            }
            if (isSupabaseConfigured()) {
                const { error } = await supabase.from('erp_task_documents').delete().eq('id', docId);
                if (error) throw error;
            }
            const updatedTask = {
                ...viewingTask,
                documents: viewingTask.documents.filter(d => d.id !== docId)
            };
            setTasks(tasks.map(t => t.id === viewingTask.id ? updatedTask : t));
            setViewingTask(updatedTask);
            showToast('Documento removido.', 'warning');
        } catch (err) {
            showToast('Erro ao remover.', 'error');
        }
    };

    const handleArchiveTask = async (taskId: string, archive: boolean) => {
        if (isSupabaseConfigured()) {
            try {
                const { error } = await supabase.from('erp_tasks')
                    .update({ is_archived: archive })
                    .eq('id', taskId);
                if (error) throw error;
            } catch (err) {
                showToast('Erro ao arquivar/restaurar.', 'error');
                return;
            }
        }
        setTasks(tasks.map(t => t.id === taskId ? { ...t, isArchived: archive } : t));
        if (viewingTask?.id === taskId) {
            setViewingTask({ ...viewingTask, isArchived: archive });
        }
        showToast(archive ? 'Serviço arquivado.' : 'Serviço restaurado.', archive ? 'warning' : 'success');
    };

    const handleDeleteTask = async (taskId: string) => {
        if (isSupabaseConfigured()) {
            try {
                const { data: docs } = await supabase.from('erp_task_documents').select('file_path').eq('task_id', taskId);
                if (docs && docs.length > 0) {
                    const paths = docs.map(d => d.file_path).filter(Boolean) as string[];
                    if (paths.length > 0) await supabase.storage.from('erp_documents').remove(paths);
                }
                const { error } = await supabase.from('erp_tasks').delete().eq('id', taskId);
                if (error) throw error;
            } catch (err) {
                showToast('Erro ao excluir.', 'error');
                return;
            }
        }
        setTasks(tasks.filter(t => t.id !== taskId));
        setViewingTask(null);
        showToast('Serviço excluído.', 'warning');
    };

    const moveTaskRight = (task: ServiceTask) => {
        const currentIndex = COLUMNS.indexOf(task.status);
        if (currentIndex < COLUMNS.length - 1) {
            handleUpdateStatus(task.id, COLUMNS[currentIndex + 1]);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-slate-900">
                        {showArchived ? 'Histórico de Serviços' : 'Projetos e Serviços (ERP)'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {showArchived ? 'Visualizando serviços arquivados' : 'Acompanhamento e fluxo de trabalho da equipe'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all shadow-sm ${showArchived
                            ? 'bg-slate-800 text-white hover:bg-slate-900'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {showArchived ? <RefreshCcw className="h-4 w-4" /> : <History className="h-4 w-4" />}
                        {showArchived ? 'VER ATIVOS' : 'HISTÓRICO'}
                    </button>
                    <button
                        onClick={() => setIsNewTaskModalOpen(true)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[#1241a1] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#1241a1]/90"
                    >
                        <Plus className="h-4 w-4" />
                        Novo Serviço
                    </button>
                </div>
            </div>

            <div className={`flex flex-1 gap-6 ${!showArchived ? 'overflow-x-auto pb-4' : ''} transition-all`}>
                {!showArchived ? (
                    COLUMNS.map(column => {
                        const columnTasks = tasks.filter(t => t.status === column && !t.isArchived);
                        return (
                            <div key={column} className={`flex w-80 flex-shrink-0 flex-col rounded-xl border p-4 ${COLUMN_COLORS[column]}`}>
                                <div className="mb-4 flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-xs font-black uppercase tracking-widest ${COLUMN_TEXT_COLORS[column]}`}>{column}</h3>
                                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/60 text-[10px] font-bold text-slate-500 shadow-sm backdrop-blur-sm">
                                            {columnTasks.length}
                                        </span>
                                    </div>
                                    <button onClick={() => setIsNewTaskModalOpen(true)} className="p-1 text-slate-400 hover:text-slate-600">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {columnTasks.map(task => (
                                        <motion.div
                                            layout
                                            key={task.id}
                                            onClick={() => setViewingTask(task)}
                                            className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#1241a1]/40 hover:shadow-lg hover:shadow-slate-200/50"
                                        >
                                            <div className="mb-3 flex items-start justify-between">
                                                <span className={`inline-block rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${PRIORITY_COLORS[task.priority]}`}>
                                                    {task.priority}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                </div>
                                            </div>

                                            <h4 className="mb-3 text-sm font-bold leading-snug text-slate-800 line-clamp-2">{task.title}</h4>

                                            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                                <div className="flex items-center gap-3">
                                                    {task.comments.length > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400" title="Comentários">
                                                            <MessageSquare className="h-3 w-3" />
                                                            {task.comments.length}
                                                        </div>
                                                    )}
                                                    {task.documents && task.documents.length > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400" title="Anexos">
                                                            <Paperclip className="h-3 w-3" />
                                                            {task.documents.length}
                                                        </div>
                                                    )}
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                                                        {task.assignee?.charAt(0) || '?'}
                                                    </div>
                                                </div>

                                                {column !== COLUMNS[COLUMNS.length - 1] && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveTaskRight(task); }}
                                                        className="flex items-center gap-1 rounded-lg bg-[#1241a1]/5 px-2 py-1 text-[10px] font-bold text-[#1241a1] hover:bg-[#1241a1] hover:text-white transition-colors"
                                                    >
                                                        Próximo
                                                        <ArrowRightCircle className="h-3 w-3" />
                                                    </button>
                                                )}
                                                {column === COLUMNS[COLUMNS.length - 1] && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Finalizado
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleArchiveTask(task.id, true); }}
                                                            className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 hover:bg-amber-100 transition-colors"
                                                            title="Arquivar"
                                                        >
                                                            <Archive className="h-3 w-3" />
                                                            Arquivar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {columnTasks.length === 0 && (
                                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white/50 py-8 text-center text-slate-400">
                                            <p className="text-sm">Nenhum serviço</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                        <th className="px-6 py-4">Serviço / Título</th>
                                        <th className="px-6 py-4">Prioridade</th>
                                        <th className="px-6 py-4">Responsável</th>
                                        <th className="px-6 py-4">Prazo</th>
                                        <th className="px-6 py-4">Status Final</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tasks.filter(t => t.isArchived).map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{task.title}</span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {task.comments.length > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold"><MessageSquare className="h-3 w-3" /> {task.comments.length}</span>}
                                                        {task.documents && task.documents.length > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold"><Paperclip className="h-3 w-3" /> {task.documents.length}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{task.assignee?.charAt(0)}</div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase">{task.assignee}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-bold uppercase ${COLUMN_TEXT_COLORS[task.status]} ${COLUMN_COLORS[task.status]}`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setViewingTask(task)} className="p-1.5 text-slate-400 hover:text-[#1241a1] hover:bg-slate-100 rounded-lg transition-colors" title="Visualizar Detalhes"><Eye className="h-4 w-4" /></button>
                                                    <button onClick={() => handleArchiveTask(task.id, false)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Restaurar"><RefreshCcw className="h-4 w-4" /></button>
                                                    <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir Permanentemente"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {tasks.filter(t => t.isArchived).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">Nenhum serviço arquivado no momento.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {isNewTaskModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Novo Serviço / Projeto</h3>
                            <button onClick={() => setIsNewTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Título</label>
                                <input
                                    required
                                    type="text"
                                    value={newTaskData.title || ''}
                                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:ring-[#1241a1]"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Descrição</label>
                                <textarea
                                    value={newTaskData.description || ''}
                                    onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:ring-[#1241a1]"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Prazo</label>
                                    <input
                                        required
                                        type="date"
                                        value={newTaskData.dueDate || ''}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Prioridade</label>
                                    <select
                                        value={newTaskData.priority || 'Média'}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value as any })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                    >
                                        <option value="Baixa">Baixa</option>
                                        <option value="Média">Média</option>
                                        <option value="Alta">Alta</option>
                                        <option value="Urgente">Urgente</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Responsável</label>
                                    <input
                                        type="text"
                                        value={newTaskData.assignee || ''}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, assignee: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700">CANCELAR</button>
                                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90 transition-colors">CRIAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewingTask && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl max-h-[90vh]">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${PRIORITY_COLORS[viewingTask.priority]}`}>{viewingTask.priority}</span>
                                <span className="text-xs text-slate-400">#{viewingTask.id.slice(0, 8)}</span>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:flex gap-8">
                            <div className="flex-1">
                                <h2 className="mb-6 text-2xl font-bold text-slate-900">{viewingTask.title}</h2>
                                <div className="mb-8">
                                    <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Descrição</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">{viewingTask.description || 'Sem descrição.'}</p>
                                </div>
                                <div className="mb-8">
                                    <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Anexos</h4>
                                    <div className="mb-4 flex flex-wrap gap-4">
                                        {(viewingTask.documents || []).map(doc => (
                                            <div key={doc.id} className="group relative flex w-40 flex-col overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition-all hover:border-[#1241a1]/40">
                                                <div className="flex h-24 items-center justify-center bg-slate-50">
                                                    {/\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name) ? <Eye className="h-8 w-8 text-slate-300" /> : <FileText className="h-8 w-8 text-slate-300" />}
                                                </div>
                                                <div className="p-2">
                                                    <p className="truncate text-[10px] font-bold text-slate-700" title={doc.name}>{doc.name}</p>
                                                    <p className="text-[9px] text-slate-400">{doc.size}</p>
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a href={doc.url} target="_blank" className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-[#1241a1] hover:text-white transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>
                                                    <button onClick={() => handleDeleteDocument(doc.id, doc.filePath)} className="rounded-full bg-red-50 p-2 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        <label className="flex h-32 w-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-[#1241a1] hover:text-[#1241a1] transition-all">
                                            {isUploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1241a1] border-t-transparent" /> : <><Plus className="mb-1 h-6 w-6" /><span className="text-[10px] font-bold uppercase">Anexar</span></>}
                                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Comentários</h4>
                                    <div className="mb-6 space-y-4">
                                        {viewingTask.comments.map(c => (
                                            <div key={c.id} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                                                <div className="mb-2 flex items-center justify-between text-[10px]">
                                                    <span className="font-bold text-[#1241a1] uppercase">{c.author}</span>
                                                    <span className="text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-700">{c.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={handleAddComment} className="flex gap-2">
                                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Comentar..." className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm" />
                                        <button disabled={!newComment.trim()} className="rounded-lg bg-[#1241a1] px-4 py-2 text-white hover:bg-[#1241a1]/90 disabled:opacity-50"><Send className="h-4 w-4" /></button>
                                    </form>
                                </div>
                            </div>
                            <div className="mt-8 w-full md:mt-0 md:w-64 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 space-y-8">
                                <div>
                                    <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Status Atual</h4>
                                    <select value={viewingTask.status} onChange={e => handleUpdateStatus(viewingTask.id, e.target.value as TaskStatus)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800">
                                        {COLUMNS.map(c => <option key={c} value={c}>{columnNames[c] || c}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Responsável</h4>
                                        <p className="text-sm font-bold text-slate-800 uppercase">{viewingTask.assignee}</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Prazo Final</h4>
                                        <p className="text-sm font-bold text-slate-800">{new Date(viewingTask.dueDate).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-slate-50 space-y-3">
                                    <button
                                        onClick={() => handleArchiveTask(viewingTask.id, !viewingTask.isArchived)}
                                        className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-black uppercase tracking-widest transition-all ${viewingTask.isArchived
                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                                            : 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white'
                                            }`}
                                    >
                                        {viewingTask.isArchived ? <RefreshCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                        {viewingTask.isArchived ? 'Restaurar Serviço' : 'Arquivar Serviço'}
                                    </button>
                                    <button onClick={() => handleDeleteTask(viewingTask.id)} className="w-full rounded-lg bg-red-50 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-500 hover:text-white transition-all">Excluir Serviço</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const columnNames: Record<string, string> = {
    'A Fazer': 'A FAZER',
    'Em Andamento': 'EM ANDAMENTO',
    'Em Revisão': 'EM REVISÃO',
    'Concluído': 'CONCLUÍDO'
};
