'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Clock, Calendar, CheckCircle2, Circle, ArrowRightCircle, AlertTriangle, AlertCircle, X, Send } from 'lucide-react';
import { motion } from 'motion/react';
import type { ServiceTask, TaskStatus, TaskComment } from '@/lib/data';
import type { ToastType } from './Toast';

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

    // Form states for new task
    const [newTaskData, setNewTaskData] = useState<Partial<ServiceTask>>({
        status: 'A Fazer',
        priority: 'Média',
        comments: []
    });

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskData.title) return;

        const newTask: ServiceTask = {
            id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
            title: newTaskData.title || '',
            description: newTaskData.description || '',
            status: newTaskData.status as TaskStatus || 'A Fazer',
            dueDate: newTaskData.dueDate || new Date().toISOString().split('T')[0],
            priority: newTaskData.priority as any || 'Média',
            comments: [],
            assignee: newTaskData.assignee || 'Não atribuído',
            createdAt: new Date().toISOString()
        };

        setTasks([...tasks, newTask]);
        setIsNewTaskModalOpen(false);
        setNewTaskData({ status: 'A Fazer', priority: 'Média', comments: [] });
        showToast('Serviço cadastrado com sucesso!', 'success');
    };

    const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        if (viewingTask?.id === taskId) {
            setViewingTask({ ...viewingTask, status: newStatus });
        }
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingTask || !newComment.trim()) return;

        const comment: TaskComment = {
            id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
            text: newComment.trim(),
            createdAt: new Date().toISOString(),
            author: userEmail || 'Usuário Atual'
        };

        const updatedTask = {
            ...viewingTask,
            comments: [...viewingTask.comments, comment]
        };

        setTasks(tasks.map(t => t.id === viewingTask.id ? updatedTask : t));
        setViewingTask(updatedTask);
        setNewComment('');
    };

    const moveTaskRight = (task: ServiceTask) => {
        const currentIndex = COLUMNS.indexOf(task.status);
        if (currentIndex < COLUMNS.length - 1) {
            handleUpdateStatus(task.id, COLUMNS[currentIndex + 1]);
        }
    };

    const moveTaskLeft = (task: ServiceTask) => {
        const currentIndex = COLUMNS.indexOf(task.status);
        if (currentIndex > 0) {
            handleUpdateStatus(task.id, COLUMNS[currentIndex - 1]);
        }
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-slate-900">Projetos e Serviços (ERP)</h2>
                    <p className="text-sm text-slate-500">Acompanhamento e fluxo de trabalho da equipe</p>
                </div>
                <button
                    onClick={() => setIsNewTaskModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#1241a1] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#1241a1]/90"
                >
                    <Plus className="h-4 w-4" />
                    Novo Serviço
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
                {COLUMNS.map(column => {
                    const columnTasks = tasks.filter(t => t.status === column);
                    return (
                        <div key={column} className={`flex w-80 flex-shrink-0 flex-col rounded-xl border p-4 ${COLUMN_COLORS[column]}`}>
                            <div className="mb-4 flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <h3 className={`text-xs font-black uppercase tracking-widest ${COLUMN_TEXT_COLORS[column]}`}>{column}</h3>
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/60 text-[10px] font-bold text-slate-500 shadow-sm backdrop-blur-sm">
                                        {columnTasks.length}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsNewTaskModalOpen(true)}
                                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                >
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
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                                                    {task.assignee?.charAt(0) || '?'}
                                                </div>
                                            </div>

                                            {/* Status Transition Action - Optimized as requested */}
                                            {column !== COLUMNS[COLUMNS.length - 1] && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveTaskRight(task); }}
                                                    className="flex items-center gap-1 rounded-lg bg-[#1241a1]/5 px-2 py-1 text-[10px] font-bold text-[#1241a1] transition-all hover:bg-[#1241a1] hover:text-white"
                                                    title={`Mover para ${COLUMNS[COLUMNS.indexOf(task.status) + 1]}`}
                                                >
                                                    Próximo
                                                    <ArrowRightCircle className="h-3 w-3" />
                                                </button>
                                            )}
                                            {column === COLUMNS[COLUMNS.length - 1] && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Finalizado
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
                })}
            </div>

            {/* New Task Modal */}
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
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                                    placeholder="Ex: Instalação de linha de vida"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Descrição</label>
                                <textarea
                                    rows={3}
                                    value={newTaskData.description || ''}
                                    onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                                    placeholder="Detalhes adicionais..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Prazo (Due Date)</label>
                                    <input
                                        required
                                        type="date"
                                        value={newTaskData.dueDate || ''}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:ring-[#1241a1]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Prioridade</label>
                                    <select
                                        value={newTaskData.priority || 'Média'}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value as any })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:ring-[#1241a1]"
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
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Status Inicial</label>
                                    <select
                                        value={newTaskData.status || 'A Fazer'}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, status: e.target.value as TaskStatus })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:ring-[#1241a1]"
                                    >
                                        {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Responsável</label>
                                    <input
                                        type="text"
                                        value={newTaskData.assignee || ''}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, assignee: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:ring-[#1241a1]"
                                        placeholder="Nome do responsável"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">CANCELAR</button>
                                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90">CRIAR SERVIÇO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Task Modal */}
            {viewingTask && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl max-h-[90vh]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className={`inline-block rounded border px-2 py-1 text-xs font-bold uppercase tracking-wider ${PRIORITY_COLORS[viewingTask.priority]}`}>
                                    {viewingTask.priority}
                                </span>
                                <span className="text-sm font-medium text-slate-500">Ref: {viewingTask.id.split('-')[0]}</span>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 lg:flex">
                            {/* Main Content */}
                            <div className="flex-1 lg:pr-6">
                                <h2 className="mb-4 text-2xl font-bold text-slate-900">{viewingTask.title}</h2>
                                <div className="mb-6">
                                    <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-900">Descrição</h4>
                                    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                                        {viewingTask.description || <span className="italic text-slate-400">Nenhuma descrição fornecida.</span>}
                                    </div>
                                </div>

                                {/* Comments Section */}
                                <div>
                                    <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" /> Comentários e Atualizações
                                    </h4>
                                    <div className="space-y-4 mb-6">
                                        {viewingTask.comments.map(comment => (
                                            <div key={comment.id} className="flex gap-3">
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1241a1]/10 font-bold text-[#1241a1]">
                                                    {comment.author.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                                                    <div className="mb-1 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-900">{comment.author}</span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {new Date(comment.createdAt).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-700">{comment.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {viewingTask.comments.length === 0 && (
                                            <div className="text-center text-sm italic text-slate-400">Nenhum comentário ainda.</div>
                                        )}
                                    </div>

                                    <form onSubmit={handleAddComment} className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1241a1] focus:ring-[#1241a1]"
                                            placeholder="Adicionar um comentário..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim()}
                                            className="flex items-center justify-center rounded-lg bg-[#1241a1] px-4 py-2 font-bold text-white transition-colors hover:bg-[#1241a1]/90 disabled:opacity-50"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="mt-8 flex w-full flex-col gap-6 lg:mt-0 lg:w-64 lg:border-l lg:border-slate-100 lg:pl-6">
                                <div>
                                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Status</h4>
                                    <select
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-[#1241a1] focus:ring-[#1241a1]"
                                        value={viewingTask.status}
                                        onChange={(e) => handleUpdateStatus(viewingTask.id, e.target.value as TaskStatus)}
                                    >
                                        {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Responsável</h4>
                                    <p className="font-semibold text-slate-900">{viewingTask.assignee || 'Não atribuído'}</p>
                                </div>
                                <div>
                                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Prazo</h4>
                                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        {new Date(viewingTask.dueDate).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Criado em</h4>
                                    <p className="text-sm text-slate-500">
                                        {new Date(viewingTask.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="mt-auto pt-6 border-t border-slate-100">
                                    <button
                                        onClick={() => {
                                            setTasks(tasks.filter(t => t.id !== viewingTask.id));
                                            setViewingTask(null);
                                            showToast('Serviço excluído.', 'warning');
                                        }}
                                        className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
                                    >
                                        Excluir Serviço
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
