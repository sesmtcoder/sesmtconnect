'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  Search,
  UserSearch,
  UserPlus,
  HardHat,
  Factory,
  AlertTriangle,
  PackagePlus,
  PenTool,
  FileText,
  Undo2,
  History,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Trash2
} from 'lucide-react';
import { Worker, Delivery, InventoryItem } from '@/lib/data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { gerarFichaEPI } from '@/lib/pdfGenerator';
import ConfirmDialog from './ConfirmDialog';
import type { ToastType } from './Toast';

export default function WorkersTab({
  workers,
  setWorkers,
  deliveries,
  inventory,
  setDeliveries,
  setInventory,
  showToast
}: {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  deliveries: Delivery[];
  inventory: InventoryItem[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [searchWorker, setSearchWorker] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isNewWorkerModalOpen, setIsNewWorkerModalOpen] = useState(false);
  const [newWorkerData, setNewWorkerData] = useState<Partial<Worker>>({
    status: 'Ativo',
    risks: [],
    imageUrl: 'https://picsum.photos/seed/newworker/200/200'
  });

  // Form state
  const [selectedEpiId, setSelectedEpiId] = useState('');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('Entrega Inicial');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Paginação de entregas
  const [deliveryPage, setDeliveryPage] = useState(1);
  const DELIVERIES_PER_PAGE = 10;

  // Assinatura digital
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCanvasPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const pos = getCanvasPos(e.nativeEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e.nativeEvent, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1241a1';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }, []);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  // Reset paginação e assinatura ao mudar de trabalhador
  useEffect(() => {
    setDeliveryPage(1);
    clearSignature();
  }, [selectedWorker, clearSignature]);

  // Confirmation Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });

  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(searchWorker.toLowerCase()) ||
    w.cpf.includes(searchWorker)
  );

  const handleSelectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setSearchWorker('');
    setIsSearchFocused(false);
    setDeliveryPage(1);
  };

  const handleSearchSubmit = () => {
    if (filteredWorkers.length > 0) {
      handleSelectWorker(filteredWorkers[0]);
    } else {
      showToast('Trabalhador não encontrado.', 'warning');
    }
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    const newWorker: Worker = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      name: newWorkerData.name || '',
      cpf: newWorkerData.cpf || '',
      reg: newWorkerData.reg || '',
      role: newWorkerData.role || '',
      dept: newWorkerData.dept || '',
      status: (newWorkerData.status as 'Ativo' | 'Inativo') || 'Ativo',
      risks: newWorkerData.risks || [],
      imageUrl: newWorkerData.imageUrl || 'https://picsum.photos/seed/newworker/200/200'
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('workers').insert([{
          name: newWorker.name,
          cpf: newWorker.cpf,
          reg: newWorker.reg,
          role: newWorker.role,
          dept: newWorker.dept,
          status: newWorker.status,
          risks: newWorker.risks,
          image_url: newWorker.imageUrl
        }]).select();

        if (error) throw error;
        if (data) newWorker.id = data[0].id;
      } catch (error) {
        showToast('Erro ao salvar trabalhador no banco de dados.', 'error');
        return;
      }
    }

    setWorkers([...workers, newWorker]);
    setSelectedWorker(newWorker);
    setIsNewWorkerModalOpen(false);
    setNewWorkerData({ status: 'Ativo', risks: [], imageUrl: 'https://picsum.photos/seed/newworker/200/200' });
    showToast('Trabalhador cadastrado com sucesso!', 'success');
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !selectedEpiId) return;

    const epi = inventory.find(i => i.id === selectedEpiId);
    if (!epi) return;

    if (epi.stock < qty) {
      showToast('Estoque insuficiente para esta entrega!', 'error');
      return;
    }

    const newDelivery: Delivery = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      workerId: selectedWorker.id,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      itemName: epi.name,
      ca: epi.ca,
      qty: `${qty < 10 ? '0' + qty : qty} Un`,
      responsible: 'Sistema (Auto)',
      status: 'Em Uso'
    };

    if (isSupabaseConfigured()) {
      try {
        const newStock = epi.stock - qty;
        const epiStatus = newStock <= epi.minStock ? 'Reposição Necessária' : 'Estoque OK';

        const { error: invError } = await supabase.from('inventory')
          .update({ stock: newStock, status: epiStatus })
          .eq('id', epi.id);

        if (invError) throw invError;

        const { data: delData, error: delError } = await supabase.from('deliveries').insert([{
          worker_id: selectedWorker.id,
          date: newDelivery.date,
          item_name: newDelivery.itemName,
          ca: newDelivery.ca,
          qty: newDelivery.qty,
          responsible: newDelivery.responsible,
          status: newDelivery.status
        }]).select();

        if (delError) throw delError;
        if (delData) newDelivery.id = delData[0].id;
      } catch (error) {
        showToast('Erro ao processar entrega no banco de dados.', 'error');
        return;
      }
    }

    setInventory(inventory.map(item => {
      if (item.id === epi.id) {
        const newStock = item.stock - qty;
        const status: 'Estoque OK' | 'Reposição Necessária' = newStock <= item.minStock ? 'Reposição Necessária' : 'Estoque OK';
        return { ...item, stock: newStock, status };
      }
      return item;
    }));

    setDeliveries([newDelivery, ...deliveries]);
    setSelectedEpiId('');
    setQty(1);
    clearSignature();
    showToast('Entrega registrada com sucesso!', 'success');
  };

  const handleReturnItem = async (deliveryId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Confirmar Devolução',
      message: 'Deseja registrar a devolução deste item de EPI?',
      variant: 'warning',
      onConfirm: async () => {
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('deliveries')
              .update({ status: 'Devolvido' })
              .eq('id', deliveryId);
            if (error) throw error;
          } catch (error) {
            showToast('Erro ao registrar devolução no banco de dados.', 'error');
            return;
          }
        }
        setDeliveries(deliveries.map(d =>
          d.id === deliveryId ? { ...d, status: 'Devolvido' } : d
        ));
        showToast('Devolução registrada com sucesso!', 'success');
      }
    });
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Registro',
      message: 'Tem certeza que deseja excluir permanentemente este registro de entrega? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('deliveries')
              .delete()
              .eq('id', deliveryId);
            if (error) throw error;
          } catch (error) {
            showToast('Erro ao excluir registro de entrega.', 'error');
            return;
          }
        }
        setDeliveries(deliveries.filter(d => d.id !== deliveryId));
        showToast('Registro excluído.', 'warning');
      }
    });
  };

  const handleDeleteWorker = async (workerId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Trabalhador',
      message: `Tem certeza que deseja excluir permanentemente o trabalhador ${selectedWorker?.name}? Todos os registros vinculados serão perdidos.`,
      variant: 'danger',
      onConfirm: async () => {
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('workers')
              .delete()
              .eq('id', workerId);
            if (error) throw error;
          } catch (error) {
            showToast('Erro ao excluir trabalhador do banco de dados.', 'error');
            return;
          }
        }
        const updatedWorkers = workers.filter(w => w.id !== workerId);
        setWorkers(updatedWorkers);
        setSelectedWorker(updatedWorkers.length > 0 ? updatedWorkers[0] : null);
        showToast('Trabalhador excluído permanentemente.', 'warning');
      }
    });
  };

  const handleExportCSV = () => {
    if (!selectedWorker) return;

    const workerDeliveriesToExport = deliveries.filter(d => d.workerId === selectedWorker.id);
    if (workerDeliveriesToExport.length === 0) {
      showToast('Nenhuma entrega para exportar.', 'warning');
      return;
    }

    const headers = ['Data', 'Item', 'CA', 'Quantidade', 'Status', 'Responsável'];
    const rows = workerDeliveriesToExport.map(d => [
      d.date,
      d.itemName,
      d.ca,
      d.qty,
      d.status,
      d.responsible
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `entregas_${selectedWorker.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const workerDeliveries = selectedWorker
    ? deliveries.filter(d => d.workerId === selectedWorker.id)
      .filter(d => filterStatus === 'Todos' || d.status === filterStatus)
    : [];

  const totalDeliveryPages = Math.max(1, Math.ceil(workerDeliveries.length / DELIVERIES_PER_PAGE));
  const pagedDeliveries = workerDeliveries.slice(
    (deliveryPage - 1) * DELIVERIES_PER_PAGE,
    deliveryPage * DELIVERIES_PER_PAGE
  );

  return (
    <>
      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-2xl font-bold text-slate-900">Ficha de Entrega de EPI</h2>
        <button
          onClick={() => setIsNewWorkerModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-700"
        >
          <UserPlus className="h-4 w-4" />
          Novo Trabalhador
        </button>
      </div>

      {/* 1. Worker Selector Section */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Buscar Trabalhador</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 focus:border-[#1241a1] focus:ring-[#1241a1] dark:text-white"
                placeholder="Buscar por Nome ou CPF..."
                type="text"
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              />

              {/* Dropdown de Resultados */}
              {isSearchFocused && (searchWorker.length > 0 || filteredWorkers.length > 0) && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="max-h-60 overflow-y-auto">
                    {filteredWorkers.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => handleSelectWorker(w)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-slate-200">
                          <Image src={w.imageUrl} alt={w.name} fill className="object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{w.name}</span>
                          <span className="text-[10px] font-medium uppercase tracking-tight text-slate-500">CPF: {w.cpf} • {w.role}</span>
                        </div>
                      </button>
                    ))}
                    {filteredWorkers.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">
                        Nenhum trabalhador encontrado para &quot;{searchWorker}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearchSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1241a1] px-6 py-2 font-semibold text-white transition-all hover:bg-[#1241a1]/90 md:w-auto"
            >
              <UserSearch className="h-5 w-5" />
              Selecionar Trabalhador
            </button>
          </div>
        </div>
      </section>

      {selectedWorker && (
        <>
          {/* 2. Worker Profile Header */}
          <section className="mb-8 flex flex-col items-start gap-6 lg:flex-row">
            <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:w-2/3">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <Image
                    alt="Perfil do Trabalhador"
                    className="object-cover"
                    src={selectedWorker.imageUrl}
                    fill
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">{selectedWorker.name}</h1>
                      <p className="font-medium text-slate-500">CPF: {selectedWorker.cpf} • Reg: {selectedWorker.reg}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider
                      ${selectedWorker.status === 'Ativo' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-red-200 bg-red-100 text-red-700'}
                    `}>
                      {selectedWorker.status}
                    </span>
                    <button
                      onClick={() => handleDeleteWorker(selectedWorker.id)}
                      className="ml-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Excluir Trabalhador"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <HardHat className="h-5 w-5 text-[#1241a1]" />
                      <span><strong>Cargo:</strong> {selectedWorker.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Factory className="h-5 w-5 text-[#1241a1]" />
                      <span><strong>Depto:</strong> {selectedWorker.dept}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Riscos Identificados (PPRA/PGR)</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorker.risks.map(risk => (
                        <span key={risk} className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          {risk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Replacement Alerts Section */}
            <div className="flex w-full flex-col gap-4 lg:w-1/3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-bold">Substituições de EPI Vencendo</h3>
                </div>
                <ul className="space-y-3">
                  {workerDeliveries.filter(d => d.status === 'Vencendo').map((d, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate pr-2">{d.itemName}</span>
                      <span className="font-bold text-amber-600 flex-shrink-0">Vencido</span>
                    </li>
                  ))}
                  {workerDeliveries.filter(d => d.status === 'Vencendo').length === 0 && (
                    <li className="text-sm text-slate-500">Nenhuma substituição pendente.</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* 4. New Delivery Form Section (Left Column) */}
            <div className="flex flex-col gap-6 lg:col-span-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <PackagePlus className="h-6 w-6 text-[#1241a1]" />
                  Registrar Nova Entrega
                </h3>
                <form onSubmit={handleConfirmDelivery} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Selecionar EPI</label>
                    <select
                      required
                      value={selectedEpiId}
                      onChange={(e) => setSelectedEpiId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                    >
                      <option value="">Selecionar do estoque...</option>
                      {inventory.filter(i => i.stock > 0).map(item => (
                        <option key={item.id} value={item.id}>{item.name} - CA {item.ca} ({item.stock} un)</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                      >
                        <option>Entrega Inicial</option>
                        <option>Desgaste Normal</option>
                        <option>Danificado</option>
                        <option>Perda</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      <PenTool className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                      Assinatura Digital do Trabalhador
                    </label>
                    <div
                      className={`relative overflow-hidden rounded-lg border-2 bg-white transition-colors ${hasSignature ? 'border-[#1241a1]' : 'border-dashed border-slate-300'
                        }`}
                    >
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={128}
                        className="h-32 w-full cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      {!hasSignature && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                          <PenTool className="mb-1 h-5 w-5" />
                          <p className="text-xs">Assine aqui com o mouse ou dedo</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex justify-between">
                      <button
                        className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 hover:text-red-500"
                        type="button"
                        onClick={clearSignature}
                      >Limpar</button>
                      <span className={`text-[10px] font-medium ${hasSignature ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                        {hasSignature ? '✓ Assinatura capturada' : 'Aguardando assinatura...'}
                      </span>
                    </div>
                  </div>
                  <button
                    disabled={!selectedEpiId}
                    className="w-full rounded-lg bg-[#1241a1] py-3 font-bold text-white shadow-md shadow-[#1241a1]/20 transition-all hover:bg-[#1241a1]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                  >
                    Confirmar Entrega
                  </button>
                </form>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedWorker) return;
                    const allDeliveries = deliveries.filter(d => d.workerId === selectedWorker.id);
                    if (allDeliveries.length === 0) {
                      showToast('Nenhuma entrega registrada para gerar a ficha.', 'warning');
                      return;
                    }
                    gerarFichaEPI(selectedWorker, allDeliveries);
                    showToast('Ficha NR-06 gerada com sucesso!', 'success');
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#1241a1] bg-[#1241a1]/5 px-4 py-3 font-bold text-[#1241a1] transition-colors hover:bg-[#1241a1]/10"
                >
                  <FileText className="h-5 w-5" />
                  Gerar Ficha PDF (NR-06)
                </button>
              </div>
            </div>

            {/* 3. Delivery Log (Right Column) */}
            <div className="lg:col-span-8">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <History className="h-5 w-5 text-[#1241a1]" />
                    Histórico de Entregas de Itens
                  </h3>
                  <div className="flex gap-2 relative">
                    <div className="relative">
                      <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`p-1 transition-colors hover:text-[#1241a1] ${filterStatus !== 'Todos' ? 'text-[#1241a1]' : 'text-slate-400'}`}
                        title="Filtrar por status"
                      >
                        <Filter className="h-5 w-5" />
                      </button>

                      {isFilterOpen && (
                        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                          <div className="p-2">
                            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtrar por Status</p>
                            {['Todos', 'Em Uso', 'Vencendo', 'Devolvido'].map((status) => (
                              <button
                                key={status}
                                onClick={() => {
                                  setFilterStatus(status);
                                  setIsFilterOpen(false);
                                  setDeliveryPage(1);
                                }}
                                className={`flex w-full items-center px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 ${filterStatus === status ? 'font-bold text-[#1241a1]' : 'text-slate-600'}`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="p-1 text-slate-400 hover:text-[#1241a1]"
                      title="Exportar CSV"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Descrição do Item EPI</th>
                        <th className="px-6 py-4">CA</th>
                        <th className="px-6 py-4">Qtd</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm text-slate-600">{delivery.date}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{delivery.itemName}</td>
                          <td className="px-6 py-4 font-mono text-sm text-slate-500">{delivery.ca}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{delivery.qty}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap
                              ${delivery.status === 'Em Uso' ? 'border-blue-200 bg-blue-100 text-blue-700' : ''}
                              ${delivery.status === 'Vencendo' ? 'border-amber-200 bg-amber-100 text-amber-700' : ''}
                              ${delivery.status === 'Devolvido' ? 'border-slate-200 bg-slate-100 text-slate-500' : ''}
                            `}>
                              {delivery.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {delivery.status !== 'Devolvido' && (
                                <button
                                  onClick={() => handleReturnItem(delivery.id)}
                                  title="Registrar Devolução"
                                  className="p-1 text-slate-400 hover:text-[#1241a1]"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteDelivery(delivery.id)}
                                title="Excluir Registro"
                                className="p-1 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {workerDeliveries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">Nenhum registro de entrega encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Paginação */}
                {totalDeliveryPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                    <span className="text-xs text-slate-500">
                      Página {deliveryPage} de {totalDeliveryPages} • {workerDeliveries.length} registros
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeliveryPage(p => Math.max(1, p - 1))}
                        disabled={deliveryPage === 1}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >← Anterior</button>
                      <button
                        onClick={() => setDeliveryPage(p => Math.min(totalDeliveryPages, p + 1))}
                        disabled={deliveryPage === totalDeliveryPages}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >Próximo →</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Worker Modal */}
      {isNewWorkerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Cadastrar Novo Trabalhador</h3>
              <button onClick={() => setIsNewWorkerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveWorker} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={newWorkerData.name || ''}
                    onChange={(e) => setNewWorkerData({ ...newWorkerData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">CPF</label>
                  <input
                    required
                    type="text"
                    placeholder="000.000.000-00"
                    value={newWorkerData.cpf || ''}
                    onChange={(e) => setNewWorkerData({ ...newWorkerData, cpf: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Matrícula (Reg)</label>
                  <input
                    required
                    type="text"
                    placeholder="#0000"
                    value={newWorkerData.reg || ''}
                    onChange={(e) => setNewWorkerData({ ...newWorkerData, reg: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Cargo</label>
                  <input
                    required
                    type="text"
                    value={newWorkerData.role || ''}
                    onChange={(e) => setNewWorkerData({ ...newWorkerData, role: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Departamento</label>
                <input
                  required
                  type="text"
                  value={newWorkerData.dept || ''}
                  onChange={(e) => setNewWorkerData({ ...newWorkerData, dept: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Riscos (Separados por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: Ruído, Poeira, Altura"
                  onChange={(e) => setNewWorkerData({ ...newWorkerData, risks: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewWorkerModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">CANCELAR</button>
                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90">CADASTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </>
  );
}
