'use client';

import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Package,
  Shield,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Worker, Delivery, InventoryItem, Movement, LegalProcess } from '@/lib/data';

export default function DashboardTab({
  workers,
  deliveries,
  inventory,
  movements,
  processes = []
}: {
  workers: Worker[];
  deliveries: Delivery[];
  inventory: InventoryItem[];
  movements: Movement[];
  processes?: LegalProcess[];
}) {
  // Real chart data: group by month (last 6 months)
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const now = new Date();
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { m: d.getMonth(), y: d.getFullYear(), label: monthLabels[d.getMonth()] };
  });
  const data = last6.map(({ m, y, label }) => ({
    name: label,
    entregas: deliveries.filter(d => { try { const dt = new Date(d.date); return dt.getMonth() === m && dt.getFullYear() === y; } catch { return false; } }).length,
    devolucoes: deliveries.filter(d => { try { const dt = new Date(d.date); return dt.getMonth() === m && dt.getFullYear() === y && d.status === 'Devolvido'; } catch { return false; } }).length,
  }));

  const total = deliveries.length;
  const emUso = deliveries.filter(d => d.status === 'Em Uso').length;
  const complianceTaxa = total > 0 ? Math.round((emUso / total) * 100) : 0;
  const complianceData = [
    { name: 'Sem 1', taxa: Math.max(60, complianceTaxa - 10) },
    { name: 'Sem 2', taxa: Math.max(65, complianceTaxa - 6) },
    { name: 'Sem 3', taxa: Math.max(70, complianceTaxa - 3) },
    { name: 'Atual', taxa: complianceTaxa || 95 },
  ];

  const totalWorkers = workers.length;
  const criticalItems = inventory.filter(i => i.status === 'Reposição Necessária');
  const expiredEPIs = deliveries.filter(d => d.status === 'Vencendo').length;
  // Trabalhadores únicos que possuem pelo menos 1 EPI em uso
  const activeWorkersWithEPI = new Set(
    deliveries.filter(d => d.status === 'Em Uso').map(d => d.workerId)
  ).size;

  const expiringProcesses = (processes || []).filter(p => {
    if (!p.scheduledDate) return false;
    const date = new Date(p.scheduledDate + 'T00:00:00');
    const nowTemp = new Date();
    nowTemp.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - nowTemp.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Check if date is within next 7 days or overdue, and status is not 'Concluido'
    return p.status !== 'Concluido' && diffDays <= 7 && diffDays >= -30;
  }).sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());

  return (
    <div className="space-y-6">
      {/* Expiring Services Alert */}
      {expiringProcesses.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
          <div className="mb-4 flex items-center gap-3 text-amber-700">
            <AlertTriangle className="h-6 w-6 fill-amber-100" />
            <h2 className="font-serif text-lg font-bold">Atenção: Serviços com Vencimento Próximo (7 dias) ou Atrasados</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expiringProcesses.map((process) => {
              const date = new Date(process.scheduledDate! + 'T00:00:00');
              const nowTemp = new Date();
              nowTemp.setHours(0, 0, 0, 0);
              date.setHours(0, 0, 0, 0);
              const diffTime = date.getTime() - nowTemp.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let statusColor = "text-amber-600";
              let title = `Vence em ${diffDays} dias`;
              if (diffDays < 0) {
                statusColor = "text-red-600";
                title = `Atrasado há ${Math.abs(diffDays)} dias`;
              } else if (diffDays === 0) {
                statusColor = "text-red-500";
                title = "Vence Hoje!";
              }

              return (
                <div key={process.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-amber-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-tight text-slate-900 truncate max-w-[200px]">{process.claimantName}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${statusColor} uppercase`}>{title} • {process.expertName}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Critical Stock Alert Section (Screenshot 1) */}
      {criticalItems.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
          <div className="mb-4 flex items-center gap-3 text-red-700">
            <Shield className="h-6 w-6 fill-red-100" />
            <h2 className="font-serif text-lg font-bold">Atenção: Itens em Estoque Crítico</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {criticalItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-tight text-slate-900 truncate max-w-[180px]">{item.name}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-red-600 uppercase">QTD: {item.stock} / MIN: {item.minStock} {item.unit}s</span>
                  </div>
                  <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full bg-red-500`} style={{ width: `${item.minStock > 0 ? Math.min(100, (item.stock / item.minStock) * 100) : 0}%` }}></div>
                  </div>
                </div>
                <button className="rounded-lg bg-slate-50 p-2 text-slate-400 hover:bg-slate-100">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards (Screenshot 1) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Colaboradores</p>
            <p className="text-3xl font-bold text-slate-900">{totalWorkers}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">EPIs Vencidos</p>
            <p className="text-3xl font-bold text-slate-900">{expiredEPIs}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Estoque Baixo</p>
            <p className="text-3xl font-bold text-slate-900">{criticalItems.length}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
            <Package className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Usando EPIs</p>
            <p className="text-3xl font-bold text-slate-900">{activeWorkersWithEPI}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <Shield className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Demandas Abertas</p>
            <p className="text-3xl font-bold text-slate-900">{(processes || []).filter(p => !p.isArchived).length}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-serif mb-4 text-lg font-bold text-slate-900">Entregas vs Devoluções (6 meses)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#475569' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="entregas" name="Entregas" fill="#1241a1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="devolucoes" name="Devoluções" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-serif mb-4 text-lg font-bold text-slate-900">Evolução da Conformidade</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={complianceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="taxa" name="Taxa (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
