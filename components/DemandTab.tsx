'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, Clock, XCircle, Search, Filter } from 'lucide-react';
import type { Demand, DemandStatus } from '@/lib/data';
import type { ToastType } from './Toast';

const STATUS_COLORS: Record<DemandStatus, string> = {
    'Pendente': 'bg-slate-100 text-slate-700 border-slate-200',
    'Em Análise': 'bg-blue-100 text-blue-700 border-blue-200',
    'Implementado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Recusado': 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<DemandStatus, React.ReactNode> = {
    'Pendente': <Clock className="h-4 w-4" />,
    'Em Análise': <Search className="h-4 w-4" />,
    'Implementado': <CheckCircle2 className="h-4 w-4" />,
    'Recusado': <XCircle className="h-4 w-4" />,
};

interface DemandTabProps {
    demands: Demand[];
    setDemands: React.Dispatch<React.SetStateAction<Demand[]>>;
    showToast: (msg: string, type?: ToastType) => void;
}

export default function DemandTab({ demands, setDemands, showToast }: DemandTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<DemandStatus | 'Todos'>('Todos');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    const [newDemandData, setNewDemandData] = useState<Partial<Demand>>({
        status: 'Pendente',
    });

    const handleCreateDemand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDemandData.title || !newDemandData.description || !newDemandData.requestedBy) return;

        const newDemand: Demand = {
            id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
            title: newDemandData.title,
            description: newDemandData.description,
            requestedBy: newDemandData.requestedBy,
            status: newDemandData.status as DemandStatus,
            createdAt: new Date().toISOString(),
            implementedAt: newDemandData.status === 'Implementado' ? new Date().toISOString() : undefined,
        };

        setDemands([...demands, newDemand]);
        setIsNewModalOpen(false);
        setNewDemandData({ status: 'Pendente' });
        showToast('Demanda registrada com sucesso!', 'success');
    };

    const handleStatusChange = (id: string, newStatus: DemandStatus) => {
        setDemands(demands.map(d => {
            if (d.id === id) {
                return {
                    ...d,
                    status: newStatus,
                    implementedAt: newStatus === 'Implementado' && d.status !== 'Implementado'
                        ? new Date().toISOString()
                        : (newStatus !== 'Implementado' ? undefined : d.implementedAt)
                };
            }
            return d;
        }));
        showToast(`Status atualizado para ${newStatus}`, 'success');
    };

    const filteredDemands = demands.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'Todos' || d.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Statistics
    const stats = {
        total: demands.length,
        implemented: demands.filter(d => d.status === 'Implementado').length,
        pending: demands.filter(d => d.status === 'Pendente' || d.status === 'Em Análise').length,
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header & Controls */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-slate-900">Chamada de Demandas</h2>
                    <p className="text-sm text-slate-500">Acompanhamento de recursos e solicitações do ERP</p>
                </div>
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#1241a1] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#1241a1]/90 shadow-sm hover:shadow"
                >
                    <Plus className="h-4 w-4" />
                    Nova Demanda
                </button>
            </div>

            {/* KPI Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-1 text-sm font-bold text-slate-500 uppercase tracking-wider">Total Registrado</div>
                    <div className="text-3xl font-black text-slate-900">{stats.total}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-emerald-50 p-5 shadow-sm">
                    <div className="mb-1 text-sm font-bold text-emerald-600 uppercase tracking-wider">Implementados</div>
                    <div className="text-3xl font-black text-emerald-700">{stats.implemented}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-amber-50 p-5 shadow-sm">
                    <div className="mb-1 text-sm font-bold text-amber-600 uppercase tracking-wider">Em Aberto</div>
                    <div className="text-3xl font-black text-amber-700">{stats.pending}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="h-4 w-4" />
                    </div>
                    <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-[#1241a1] focus:ring-[#1241a1] shadow-sm"
                        placeholder="Buscar por título, descrição ou solicitante..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                    <Filter className="h-4 w-4 ml-2 text-slate-400" />
                    <select
                        className="border-none bg-transparent py-1.5 pl-2 pr-8 text-sm font-medium text-slate-700 focus:ring-0"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="Todos">Todos os Status</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Em Análise">Em Análise</option>
                        <option value="Implementado">Implementado</option>
                        <option value="Recusado">Recusado</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {filteredDemands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
                            <Search className="h-6 w-6" />
                        </div>
                        <p className="text-lg font-bold text-slate-900">Nenhuma demanda encontrada</p>
                        <p className="text-sm text-slate-500 max-w-sm mt-1">Refine a busca ou cadastre uma nova solicitação para começar o acompanhamento.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-[#f6f6f8] text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Demanda</th>
                                <th className="px-6 py-4">Solicitante</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data Registro</th>
                                <th className="px-6 py-4 text-right">Ação Rápida</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDemands.map((demand) => (
                                <tr key={demand.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900">{demand.title}</p>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-md" title={demand.description}>{demand.description}</p>
                                    </td>
                                    <td className="px-6 py-4 font-medium">{demand.requestedBy}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_COLORS[demand.status]}`}>
                                            {STATUS_ICONS[demand.status]}
                                            {demand.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                        {new Date(demand.createdAt).toLocaleDateString('pt-BR')}
                                        {demand.implementedAt && (
                                            <div className="text-emerald-600 font-medium mt-1">Concluído em: {new Date(demand.implementedAt).toLocaleDateString('pt-BR')}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <select
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#1241a1] focus:ring-[#1241a1] hover:bg-slate-50"
                                            value={demand.status}
                                            onChange={(e) => handleStatusChange(demand.id, e.target.value as DemandStatus)}
                                        >
                                            <option value="Pendente">Marcar Pendente</option>
                                            <option value="Em Análise">Em Análise</option>
                                            <option value="Implementado">Implementar</option>
                                            <option value="Recusado">Recusar</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* New Modal */}
            {isNewModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 font-serif">Registrar Nova Demanda</h3>
                            <button onClick={() => setIsNewModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateDemand} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Título Breve</label>
                                <input
                                    required
                                    type="text"
                                    value={newDemandData.title || ''}
                                    onChange={(e) => setNewDemandData({ ...newDemandData, title: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none transition-colors shadow-inner"
                                    placeholder="Ex: Novo dashboard financeiro"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Descrição Detalhada</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newDemandData.description || ''}
                                    onChange={(e) => setNewDemandData({ ...newDemandData, description: e.target.value })}
                                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none transition-colors shadow-inner"
                                    placeholder="O que exatamente precisa ser desenvolvido? Qual a regra de negócio..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Solicitante</label>
                                    <input
                                        required
                                        type="text"
                                        value={newDemandData.requestedBy || ''}
                                        onChange={(e) => setNewDemandData({ ...newDemandData, requestedBy: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none transition-colors shadow-inner"
                                        placeholder="Nome do solicitante"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Status Inicial</label>
                                    <select
                                        value={newDemandData.status || 'Pendente'}
                                        onChange={(e) => setNewDemandData({ ...newDemandData, status: e.target.value as DemandStatus })}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#1241a1] focus:bg-white focus:ring-[#1241a1] focus:outline-none transition-colors shadow-inner"
                                    >
                                        <option value="Pendente">Pendente</option>
                                        <option value="Em Análise">Em Análise</option>
                                        <option value="Implementado">Implementado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsNewModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">CANCELAR</button>
                                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white shadow hover:bg-[#1241a1]/90 hover:shadow-md transition-all">SALVAR DEMANDA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
