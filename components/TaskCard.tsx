'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, ArrowRightCircle } from 'lucide-react';
import type { ServiceTask } from '@/lib/data';

const PRIORITY_COLORS = {
    'Baixa': 'bg-slate-100 text-slate-700 border-slate-200',
    'Média': 'bg-blue-100 text-blue-700 border-blue-200',
    'Alta': 'bg-amber-100 text-amber-700 border-amber-200',
    'Urgente': 'bg-red-100 text-red-700 border-red-200'
};

interface TaskCardProps {
    task: ServiceTask;
    onClick: () => void;
    onMoveLeft?: () => void;
    onMoveRight?: () => void;
    isFirstColumn: boolean;
    isLastColumn: boolean;
}

export default function TaskCard({
    task,
    onClick,
    onMoveLeft,
    onMoveRight,
    isFirstColumn,
    isLastColumn
}: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`group cursor-grab active:cursor-grabbing rounded-xl border border-white/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-[#1241a1]/30 hover:shadow-md premium-card ${isDragging ? 'ring-2 ring-[#1241a1]/50' : ''}`}
        >
            <div className="mb-2 flex items-start justify-between">
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
                    {task.priority}
                </span>
            </div>
            <h4 className="mb-2 font-bold leading-tight text-slate-900 line-clamp-2 transition-colors group-hover:text-[#1241a1]">{task.title}</h4>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-medium" title="Prazo">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </div>
                {task.comments.length > 0 && (
                    <div className="flex items-center gap-1.5 font-medium" title="Comentários">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                        {task.comments.length}
                    </div>
                )}
            </div>

            {/* Move controls - hidden when DND is active but useful for accessibility/touch */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100/50 pt-2 opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                <button
                    onClick={(e) => { e.stopPropagation(); onMoveLeft?.(); }}
                    disabled={isFirstColumn}
                    className="p-1 text-slate-400 hover:text-[#1241a1] disabled:opacity-20"
                >
                    <ArrowRightCircle className="h-4 w-4 rotate-180" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onMoveRight?.(); }}
                    disabled={isLastColumn}
                    className="p-1 text-slate-400 hover:text-[#1241a1] disabled:opacity-20"
                >
                    <ArrowRightCircle className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
