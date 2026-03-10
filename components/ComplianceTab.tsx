'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Worker, Delivery } from '@/lib/data';

export default function ComplianceTab({
  workers,
  deliveries
}: {
  workers: Worker[];
  deliveries: Delivery[];
}) {
  const pendingDeliveries = deliveries.filter(d => d.status === 'Vencendo');

  // Calculate compliance per department dynamically
  const depts = Array.from(new Set(workers.map(w => w.dept))).filter(Boolean);
  const deptCompliance = depts.map(dept => {
    const deptWorkers = workers.filter(w => w.dept === dept);
    const deptDeliveries = deliveries.filter(d =>
      deptWorkers.some(w => w.id === d.workerId)
    );
    const emUso = deptDeliveries.filter(d => d.status === 'Em Uso').length;
    const total = deptDeliveries.length;
    const pct = total > 0 ? Math.round((emUso / total) * 100) : 100;
    return { dept, pct };
  });

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  };
  const getTextColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600';
    if (pct >= 75) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Conformidade (NR-06)</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="mb-4 flex items-center gap-3 text-red-800">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-bold">Ações Críticas Necessárias</h3>
          </div>
          <ul className="space-y-4">
            {pendingDeliveries.map(d => {
              const worker = workers.find(w => w.id === d.workerId);
              return (
                <li key={d.id} className="flex flex-col gap-1 rounded-lg bg-white p-3 shadow-sm">
                  <span className="text-sm font-bold text-slate-900">{worker?.name || 'Desconhecido'}</span>
                  <span className="text-xs text-slate-600">EPI Vencido: {d.itemName}</span>
                  <button className="mt-2 text-left text-xs font-bold text-[#1241a1] hover:underline">Notificar Trabalhador</button>
                </li>
              );
            })}
            {pendingDeliveries.length === 0 && (
              <li className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Nenhuma ação crítica pendente.
              </li>
            )}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Status por Setor</h3>
            </div>
            <div className="p-6">
              {deptCompliance.length > 0 ? (
                <div className="space-y-6">
                  {deptCompliance.map(({ dept, pct }) => (
                    <div key={dept}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{dept}</span>
                        <span className={`font-bold ${getTextColor(pct)}`}>{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${getBarColor(pct)} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhum dado disponível. Cadastre trabalhadores e entregas para visualizar a conformidade.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
