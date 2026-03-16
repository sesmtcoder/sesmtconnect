'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, X, ArrowUpCircle, ArrowDownCircle, FileText, Download, History, Package, AlertTriangle, Clock } from 'lucide-react';
import { InventoryItem, Movement } from '@/lib/data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { gerarRelatorioInventario } from '@/lib/pdfGenerator';
import ConfirmDialog from './ConfirmDialog';
import type { ToastType } from './Toast';

export default function InventoryTab({
  inventory,
  setInventory,
  movements,
  setMovements,
  showToast
}: {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  movements: Movement[];
  setMovements: React.Dispatch<React.SetStateAction<Movement[]>>;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'Entrada' | 'Saída'>('Entrada');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [movementFormData, setMovementFormData] = useState<Partial<Movement>>({ qty: 1 });
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  // Paginação do inventário
  const [inventoryPage, setInventoryPage] = useState(1);
  const INVENTORY_PER_PAGE = 10;

  // Confirmation Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ name: '', ca: '', codMv: '', category: '', unit: 'Unidade', stock: 0, minStock: 0, status: 'Estoque OK' });
    }
    setIsModalOpen(true);
  };

  const handleOpenMovementModal = (type: 'Entrada' | 'Saída') => {
    setMovementType(type);
    setMovementFormData({ type, qty: 1, date: new Date().toISOString().split('T')[0] });
    setIsMovementModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsMovementModalOpen(false);
    setEditingItem(null);
    setFormData({});
    setMovementFormData({ qty: 1 });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stock = Number(formData.stock) || 0;
    const minStock = Number(formData.minStock) || 0;
    const status = stock <= minStock ? 'Reposição Necessária' : 'Estoque OK';

    const itemToSave = { ...formData, stock, minStock, status } as InventoryItem;

    if (isSupabaseConfigured()) {
      try {
        if (editingItem) {
          const { error } = await supabase.from('inventory')
            .update({
              name: itemToSave.name,
              ca: itemToSave.ca,
              cod_mv: itemToSave.codMv,
              category: itemToSave.category,
              unit: itemToSave.unit,
              stock: itemToSave.stock,
              min_stock: itemToSave.minStock,
              status: itemToSave.status
            })
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from('inventory').insert([{
            name: itemToSave.name,
            ca: itemToSave.ca,
            cod_mv: itemToSave.codMv,
            category: itemToSave.category,
            unit: itemToSave.unit,
            stock: itemToSave.stock,
            min_stock: itemToSave.minStock,
            status: itemToSave.status
          }]).select();
          if (error) throw error;
          if (data) itemToSave.id = data[0].id;
        }
      } catch (error) {
        showToast('Erro ao salvar item no inventário.', 'error');
        return;
      }
    }

    if (editingItem) {
      setInventory(inventory.map(item => item.id === editingItem.id ? { ...item, ...itemToSave } : item));
    } else {
      if (!isSupabaseConfigured()) {
        itemToSave.id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      }
      setInventory([...inventory, itemToSave]);
    }
    showToast(editingItem ? 'Item atualizado!' : 'Item adicionado ao inventário!', 'success');
    handleCloseModal();
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { itemId, qty, target, responsible } = movementFormData;
    if (!itemId || !qty || !responsible) return;

    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const quantity = Number(qty);
    const newStock = movementType === 'Entrada' ? item.stock + quantity : item.stock - quantity;

    if (newStock < 0) {
      showToast('Estoque insuficiente para esta saída!', 'error');
      return;
    }

    const status = newStock <= item.minStock ? 'Reposição Necessária' : 'Estoque OK';

    const newMovement: Movement = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      itemId,
      itemName: item.name,
      type: movementType,
      qty: quantity,
      date: new Date().toISOString().split('T')[0],
      target,
      responsible
    };

    if (isSupabaseConfigured()) {
      try {
        // Update inventory
        const { error: invError } = await supabase.from('inventory')
          .update({ stock: newStock, status })
          .eq('id', itemId);
        if (invError) throw invError;

        // Add movement
        const { data, error: movError } = await supabase.from('movements').insert([{
          item_id: itemId,
          item_name: item.name,
          type: movementType,
          qty: quantity,
          target,
          responsible,
          date: newMovement.date
        }]).select();
        if (movError) throw movError;
        if (data) newMovement.id = data[0].id;
      } catch (error) {
        showToast('Erro ao processar movimentação no banco de dados.', 'error');
        return;
      }
    }

    setInventory(inventory.map(i => i.id === itemId ? { ...i, stock: newStock, status } : i));
    setMovements([newMovement, ...movements]);
    showToast(`Movimentação de ${movementType.toLowerCase()} registrada!`, 'success');
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Item',
      message: `Tem certeza que deseja excluir permanentemente o item "${item?.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (error) throw error;
          } catch (error) {
            showToast('Erro ao excluir item do inventário.', 'error');
            return;
          }
        }
        setInventory(inventory.filter(item => item.id !== id));
        showToast('Item excluído do inventário.', 'warning');
      }
    });
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.ca && item.ca.includes(search)) ||
    (item.codMv && item.codMv.toLowerCase().includes(search.toLowerCase())) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Reset página ao pesquisar
  useEffect(() => {
    setInventoryPage(1);
  }, [search]);

  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventory.length / INVENTORY_PER_PAGE));
  const pagedInventory = filteredInventory.slice(
    (inventoryPage - 1) * INVENTORY_PER_PAGE,
    inventoryPage * INVENTORY_PER_PAGE
  );

  const handleExportCSV = () => {
    if (inventory.length === 0) {
      showToast('Nenhum item no inventário para exportar.', 'warning');
      return;
    }
    const headers = ['Nome', 'CA', 'COD.MV', 'Categoria', 'Unidade', 'Estoque Atual', 'Mínimo', 'Status'];
    const rows = filteredInventory.map(item => [
      item.name,
      item.ca,
      item.codMv,
      item.category,
      item.unit,
      item.stock,
      item.minStock,
      item.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `inventario_epi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Inventário exportado com sucesso!', 'success');
  };

  const totalItems = inventory.length;
  const criticalItems = inventory.filter(i => i.status === 'Reposição Necessária').length;
  const monthlyOut = mounted ? movements.filter(m => m.type === 'Saída' && m.date.startsWith(new Date().toISOString().slice(0, 7))).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Controle de Estoque</h2>
          <p className="text-sm text-slate-500">Gestão de Inventário e Movimentações de EPI</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (inventory.length === 0) {
                showToast('Nenhum item no inventário para gerar relatório.', 'warning');
                return;
              }
              gerarRelatorioInventario(inventory);
              showToast('Relatório PDF gerado com sucesso!', 'success');
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            title="Gerar relatório de estoque em PDF"
          >
            <FileText className="h-4 w-4" />
            Relatório
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            title="Exportar inventário filtrado como CSV"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => handleOpenMovementModal('Entrada')}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Entrada
          </button>
          <button
            onClick={() => handleOpenMovementModal('Saída')}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <ArrowDownCircle className="h-4 w-4" />
            Baixa (Saída)
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-lg bg-[#1241a1] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1241a1]/90"
          >
            <Plus className="h-4 w-4" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-blue-100 p-3 text-[#1241a1]">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total em Inventário</p>
            <p className="text-2xl font-bold text-slate-900">{totalItems} Itens</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-red-100 p-3 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Estoque Crítico</p>
            <p className="text-2xl font-bold text-red-600">{criticalItems} Alertas</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-purple-100 p-3 text-purple-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Baixas do Mês</p>
            <p className="text-2xl font-bold text-slate-900">{monthlyOut}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 focus:border-[#1241a1] focus:ring-[#1241a1]"
              placeholder="Buscar no inventário..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">EPI / Material</th>
                    <th className="px-6 py-4 text-center">COD.MV</th>
                    <th className="px-6 py-4 text-center">C.A.</th>
                    <th className="px-6 py-4">Quant. Atual</th>
                    <th className="px-6 py-4">Mínimo</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedInventory.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{item.name}</span>
                          <span className="text-[10px] font-medium uppercase tracking-tight text-slate-500">{item.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-mono text-slate-600">
                        {item.codMv || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {item.ca || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${item.stock <= item.minStock ? 'text-red-600' : 'text-slate-900'}`}>
                          {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}s</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{item.minStock}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap
                          ${item.status === 'Estoque OK' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-red-200 bg-red-100 text-red-700'}
                        `}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(item)} className="p-1 text-slate-400 hover:text-[#1241a1]" title="Editar item">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600" title="Excluir item">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginação */}
            {totalInventoryPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                <span className="text-xs text-slate-500">
                  Página {inventoryPage} de {totalInventoryPages} • {filteredInventory.length} itens
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                    disabled={inventoryPage === 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >← Anterior</button>
                  <button
                    onClick={() => setInventoryPage(p => Math.min(totalInventoryPages, p + 1))}
                    disabled={inventoryPage === totalInventoryPages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >Próximo →</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Últimas Movimentações */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
              <History className="h-5 w-5 text-[#1241a1]" />
              Últimas Movimentações
            </h3>
            <div className="space-y-4">
              {movements.slice(0, 5).map((m) => (
                <div key={m.id} className="relative border-l-2 border-slate-100 pl-4 pb-4">
                  <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white bg-white flex items-center justify-center`}>
                    {m.type === 'Entrada' ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-amber-500" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{m.itemName}</span>
                      <span className={`text-sm font-bold ${m.type === 'Entrada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {m.type === 'Entrada' ? '+' : '-'}{m.qty}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-tight text-slate-500">
                      {m.type === 'Entrada' ? `Origem: ${m.target}` : `Saída para: ${m.target}`}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-400">Responsável: {m.responsible} • {m.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New/Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingItem ? 'Editar Item' : 'Novo Item no Inventário'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">COD.MV</label>
                  <input
                    placeholder="Ex: MV-001"
                    type="text"
                    value={formData.codMv || ''}
                    onChange={(e) => setFormData({ ...formData, codMv: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">C.A. (Certificado de Aprovação)</label>
                  <input
                    placeholder="Ex: 12345"
                    type="text"
                    value={formData.ca || ''}
                    onChange={(e) => setFormData({ ...formData, ca: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Nome do EPI / Material</label>
                <input
                  required
                  placeholder="Ex: Luva de Raspa Premium"
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Categoria</label>
                  <input
                    required
                    placeholder="Ex: Proteção Manual"
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Unidade</label>
                  <select
                    value={formData.unit || 'Unidade'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  >
                    <option>Unidade</option>
                    <option>Par</option>
                    <option>Kit</option>
                    <option>Caixa</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Estoque Atual</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.stock || 0}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Estoque Mínimo (Alerta)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.minStock || 0}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">CANCELAR</button>
                <button type="submit" className="rounded-lg bg-[#1241a1] px-6 py-2 text-sm font-bold text-white hover:bg-[#1241a1]/90">SALVAR ITEM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal (Entrada/Saída) */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${movementType === 'Entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {movementType === 'Entrada' ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {movementType === 'Entrada' ? 'Entrada em Estoque' : 'Baixa de Material (Saída)'}
                </h3>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Item / EPI</label>
                <select
                  required
                  value={movementFormData.itemId || ''}
                  onChange={(e) => setMovementFormData({ ...movementFormData, itemId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                >
                  <option value="">Selecione um item...</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (Saldo: {item.stock})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Quantidade</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={movementFormData.qty || 1}
                  onChange={(e) => setMovementFormData({ ...movementFormData, qty: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                  {movementType === 'Entrada' ? 'Origem / Fornecedor' : 'Quem Retirou (Colaborador)'}
                </label>
                <input
                  required
                  placeholder={movementType === 'Entrada' ? 'Nome do fornecedor' : 'Nome do colaborador'}
                  type="text"
                  value={movementFormData.target || ''}
                  onChange={(e) => setMovementFormData({ ...movementFormData, target: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 uppercase tracking-wider text-[10px] font-bold">Responsável (TST / Almoxarife)</label>
                <input
                  required
                  placeholder="Nome do responsável"
                  type="text"
                  value={movementFormData.responsible || ''}
                  onChange={(e) => setMovementFormData({ ...movementFormData, responsible: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-[#1241a1] focus:ring-[#1241a1]"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">CANCELAR</button>
                <button
                  type="submit"
                  className={`rounded-lg px-6 py-2 text-sm font-bold text-white transition-colors
                    ${movementType === 'Entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}
                  `}
                >
                  CONFIRMAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  );
}
