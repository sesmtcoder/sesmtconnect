'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  Search,
  XCircle,
  Briefcase,
  Calendar,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import DashboardTab from '@/components/DashboardTab';
import WorkersTab from '@/components/WorkersTab';
import InventoryTab from '@/components/InventoryTab';
import KanbanTab from '@/components/KanbanTab';
import ServiceControlTab from '@/components/ServiceControlTab';
import TrainingTab from '@/components/TrainingTab';
import ASOTab from '@/components/ASOTab';
import AccidentsTab from '@/components/AccidentsTab';
import LoginPage from '@/components/LoginPage';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

import {
  Worker,
  Delivery,
  InventoryItem,
  Movement,
  ServiceTask,
  LegalProcess,
  Training,
  HealthRecord,
  Accident
} from '@/lib/data';
import { supabase } from '@/lib/supabase';

// Inactivity timeout: 60 minutes
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

export default function Page() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(true);
  const [userEmail, setUserEmail] = useState('admin@sesmt.com');
  const [userName, setUserName] = useState('Administrador');
  const [userInitials, setUserInitials] = useState('AD');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Global State — empty by default (populated from Supabase)
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [processes, setProcesses] = useState<LegalProcess[]>([]);
  // New SST Modules
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [accidents, setAccidents] = useState<Accident[]>([]);

  const { toasts, showToast, removeToast } = useToast();
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Inactivity Timeout ─────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      await supabase.auth.signOut();
      showToast('Sessão encerrada por inatividade.', 'warning');
    }, INACTIVITY_TIMEOUT_MS);
  }, [showToast]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  // ─── Supabase Auth Session ───────────────────────────────────────
  const fetchUserInfo = useCallback((email: string, metadata?: any) => {
    setUserEmail(email);
    const name = metadata?.name || '';
    setUserName(name);

    setSettingsName(name);

    const displayString = name || email;
    const initials = displayString
      .split('@')[0]
      .split(/[._-\s]/)
      .filter(Boolean)
      .map((s: string) => s[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('');
    setUserInitials(initials || 'AD');
  }, []);

  const fetchSupabaseData = useCallback(async () => {
    const results = await Promise.allSettled([
      supabase.from('workers').select('*'),
      supabase.from('inventory').select('*'),
      supabase.from('deliveries').select('*'),
      supabase.from('movements').select('*'),
      supabase.from('processes').select('*, documents:process_documents(*), tasks:process_tasks(*).'),
      supabase.from('erp_tasks').select('*, comments:erp_task_comments(*), documents:erp_task_documents(*)')
    ]);

    const [workersRes, inventoryRes, deliveriesRes, movementsRes, processesRes, erpTasksRes] = results;

    if (workersRes.status === 'fulfilled' && workersRes.value.data) {
      setWorkers(workersRes.value.data.map(w => ({
        id: w.id,
        name: w.name || '',
        cpf: w.cpf || '',
        reg: w.reg || '',
        role: w.role || '',
        dept: w.dept || '',
        status: w.status || 'Ativo',
        risks: Array.isArray(w.risks) ? w.risks : (w.risks ? [w.risks] : []),
        imageUrl: w.image_url || 'https://picsum.photos/seed/worker/200/200'
      })));
    }

    if (inventoryRes.status === 'fulfilled' && inventoryRes.value.data) {
      setInventory(inventoryRes.value.data.map(i => ({
        id: i.id,
        name: i.name || '',
        ca: i.ca || '',
        codMv: i.cod_mv || '',
        category: i.category || '',
        unit: i.unit || 'Unidade',
        stock: i.stock || 0,
        minStock: i.min_stock || 0,
        status: i.status || 'Estoque OK'
      })));
    }

    if (deliveriesRes.status === 'fulfilled' && deliveriesRes.value.data) {
      setDeliveries(deliveriesRes.value.data.map(d => ({
        id: d.id,
        workerId: d.worker_id || '',
        date: d.date || '',
        itemName: d.item_name || '',
        ca: d.ca || '',
        qty: d.qty || '',
        responsible: d.responsible || '',
        status: d.status || 'Em Uso'
      })));
    }

    if (movementsRes.status === 'fulfilled' && movementsRes.value.data) {
      setMovements(movementsRes.value.data.map(m => ({
        id: m.id,
        itemId: m.item_id || '',
        itemName: m.item_name || '',
        type: m.type || 'Entrada',
        qty: m.qty || 0,
        date: m.date || '',
        target: m.target || '',
        responsible: m.responsible || ''
      })));
    }

    if (processesRes?.status === 'fulfilled' && processesRes.value.data) {
      setProcesses(processesRes.value.data.map((p: any) => ({
        id: p.id,
        processNumber: p.process_number || '',
        court: p.court || '',
        claimantName: p.claimant_name || '',
        expertName: p.expert_name || '',
        type: p.type || '',
        scheduledDate: p.scheduled_date || '',
        deadlineDate: p.deadline_date || '',
        status: p.status || '',
        documents: (p.documents || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          date: new Date(d.created_at).toLocaleDateString(),
          size: d.file_size || '0 KB',
          url: d.file_url,
          filePath: d.file_path
        })),
        tasks: (p.tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status
        })),
        isArchived: p.is_archived || false
      })));
    }

    if (erpTasksRes?.status === 'fulfilled' && erpTasksRes.value.data) {
      setTasks(erpTasksRes.value.data.map((t: any) => ({
        id: t.id,
        title: t.title || '',
        description: t.description || '',
        status: t.status || 'A Fazer',
        dueDate: t.due_date || '',
        priority: t.priority || 'Média',
        assignee: t.assignee || 'Não atribuído',
        isArchived: t.is_archived || false,
        createdAt: t.created_at || '',
        comments: (t.comments || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((c: any) => ({
          id: c.id,
          text: c.text,
          author: c.author,
          createdAt: c.created_at
        })),
        documents: (t.documents || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          date: new Date(d.created_at).toLocaleDateString(),
          size: d.file_size || '0 KB',
          url: d.file_url,
          filePath: d.file_path
        }))
      })));
    }
  }, []);

  useEffect(() => {
    // Check for existing session on load (Optional now, but keeping for data fetching)
    supabase.auth.getSession().then(({ data, error }) => {
      const session = data?.session;
      
      if (session) {
        setIsAuthenticated(true);
        if (session.user?.email) {
          fetchUserInfo(session.user.email, session.user.user_metadata);
        }
      } else {
        setIsAuthenticated(false);
      }
      
      fetchSupabaseData();
    }).catch(err => {
      console.error('Erro inesperado na sessão:', err);
      setIsAuthenticated(false);
      fetchSupabaseData();
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        if (session.user?.email) {
          fetchUserInfo(session.user.email, session.user.user_metadata);
        }
        fetchSupabaseData();
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchUserInfo, fetchSupabaseData]);

  const handleLogin = useCallback(() => {
    // Auth state change listener handles this
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
    showToast('Você saiu do sistema com segurança.', 'success');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const updates: any = {};

      if (settingsName.trim() !== userName) {
        updates.data = { name: settingsName.trim() };
      }
      if (settingsPassword.trim().length >= 6) {
        updates.password = settingsPassword.trim();
      } else if (settingsPassword.trim().length > 0) {
        showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
        setSettingsLoading(false);
        return;
      }

      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase.auth.updateUser(updates);
        if (error) throw error;

        showToast('Configurações atualizadas com sucesso!', 'success');
        if (data?.user?.email) {
          fetchUserInfo(data.user.email, data.user.user_metadata);
        }
        setIsSettingsOpen(false);
        setSettingsPassword('');
      } else {
        setIsSettingsOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao atualizar. Tente novamente.', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Painel' },
    { id: 'workers', label: 'Trabalhadores' },
    { id: 'inventory', label: 'Estoque' },
    { id: 'kanban', label: 'Projetos (ERP)' },
    { id: 'processes', label: 'Controle de Serviços' },
    { id: 'training', label: 'Treinamentos' },
    { id: 'aso', label: 'Saúde Ocup.' },
    { id: 'accidents', label: 'Acidentes / CAT' },
  ];

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1241a1] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f6f6f8] text-slate-900">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white px-4 py-3 lg:px-10">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 text-[#1241a1]">
              <ShieldCheck className="h-8 w-8" />
              <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-900">
                Gerenciador de Segurança de EPI
              </h2>
            </div>
            <nav className="hidden items-center gap-6 md:flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'border-b-2 border-[#1241a1] font-bold text-[#1241a1]'
                    : 'text-slate-600 hover:text-[#1241a1]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 pr-2 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1241a1] text-xs font-bold text-white">
                  {userInitials}
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 z-[60] mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                  >
                    <div className="border-b border-slate-100 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1241a1] text-sm font-bold text-white">
                          {userInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{userName || userEmail}</p>
                          <p className="truncate text-xs text-slate-500">{userName ? userEmail : 'Usuário autenticado'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-1 space-y-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setIsSettingsOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#1241a1]"
                      >
                        <Settings className="h-4 w-4" />
                        Configurações da Conta
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair do Sistema
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] flex-1 p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <DashboardTab workers={workers} deliveries={deliveries} inventory={inventory} movements={movements} processes={processes} />
        )}
        {activeTab === 'workers' && (
          <WorkersTab
            workers={workers}
            setWorkers={setWorkers}
            deliveries={deliveries}
            inventory={inventory}
            setDeliveries={setDeliveries}
            setInventory={setInventory}
            showToast={showToast}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab
            inventory={inventory}
            setInventory={setInventory}
            movements={movements}
            setMovements={setMovements}
            showToast={showToast}
          />
        )}
        {activeTab === 'kanban' && (
          <KanbanTab
            tasks={tasks}
            setTasks={setTasks}
            userEmail={userEmail}
            showToast={showToast}
          />
        )}
        {activeTab === 'processes' && (
          <ServiceControlTab
            processes={processes}
            setProcesses={setProcesses}
            showToast={showToast}
          />
        )}
        {activeTab === 'training' && (
          <TrainingTab
            trainings={trainings}
            setTrainings={setTrainings}
            workers={workers}
            showToast={showToast}
          />
        )}
        {activeTab === 'aso' && (
          <ASOTab
            healthRecords={healthRecords}
            setHealthRecords={setHealthRecords}
            workers={workers}
            showToast={showToast}
          />
        )}
        {activeTab === 'accidents' && (
          <AccidentsTab
            accidents={accidents}
            setAccidents={setAccidents}
            showToast={showToast}
          />
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#1241a1] px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 opacity-80" /> Configurações da Conta
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="rounded-full bg-white/10 p-1.5 text-white/80 hover:bg-white/20 transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome de Exibição</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-4 focus:ring-[#1241a1]/10 outline-none transition-all"
                  placeholder="Como você quer ser chamado?"
                />
                <p className="mt-1.5 text-[10px] text-slate-400">Este nome aparecerá no sistema ao invés do email.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nova Senha (Opcional)</label>
                <input
                  type="password"
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-[#1241a1] focus:bg-white focus:ring-4 focus:ring-[#1241a1]/10 outline-none transition-all"
                  placeholder="Digite para alterar..."
                  minLength={6}
                />
                <p className="mt-1.5 text-[10px] text-slate-400">Deixe em branco para manter a senha atual.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  VOLTAR
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="flex-1 rounded-xl bg-[#1241a1] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#1241a1]/30 hover:bg-[#1241a1]/90 transition-all disabled:opacity-50"
                >
                  {settingsLoading ? 'SALVANDO...' : 'SALVAR DADOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-6 text-center">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Sistemas de Segurança Industrial v2.5.0 • Conforme NR-06 e LGPD • Dados protegidos por RLS
        </p>
      </footer>
    </div>
  );
}
