// ─── Tipos de Dados ──────────────────────────────────────────────────────────

export type InventoryItem = {
  id: string;
  name: string;
  ca: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  status: 'Estoque OK' | 'Reposição Necessária';
};

export type Movement = {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Entrada' | 'Saída';
  qty: number;
  date: string;
  target?: string;
  responsible: string;
};

export type Worker = {
  id: string;
  name: string;
  cpf: string;
  reg: string;
  role: string;
  dept: string;
  status: 'Ativo' | 'Inativo';
  risks: string[];
  imageUrl: string;
};

export type Delivery = {
  id: string;
  workerId: string;
  date: string;
  itemName: string;
  ca: string;
  qty: string;
  responsible: string;
  status: 'Em Uso' | 'Vencendo' | 'Devolvido';
};

export type TaskComment = {
  id: string;
  text: string;
  createdAt: string;
  author: string;
};

export type TaskStatus = 'A Fazer' | 'Em Andamento' | 'Em Revisão' | 'Concluído';

export type ServiceTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  comments: TaskComment[];
  assignee?: string;
  createdAt: string;
};

export type DemandStatus = 'Pendente' | 'Em Análise' | 'Implementado' | 'Recusado';

export type Demand = {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  status: DemandStatus;
  createdAt: string;
  implementedAt?: string;
};

export type ProcessTaskStatus = 'A FAZER' | 'FAZENDO' | 'CONCLUÍDO';

export type ProcessTask = {
  id: string;
  title: string;
  status: ProcessTaskStatus;
};

export type ProcessDocument = {
  id: string;
  name: string;
  date: string;
  size: string;
};

export type LegalProcess = {
  id: string;
  processNumber: string;
  court: string;
  claimantName: string;
  expertName: string;
  type: string;
  scheduledDate?: string;
  deadlineDate: string;
  status: string;
  documents: ProcessDocument[];
  tasks: ProcessTask[];
};
