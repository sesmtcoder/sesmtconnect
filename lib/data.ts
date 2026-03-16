// ─── Tipos de Dados ──────────────────────────────────────────────────────────

export type InventoryItem = {
  id: string;
  name: string;
  ca: string;
  caValidityDate?: string; // #4 — Validade do CA
  codMv: string;
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
  validityDate?: string; // #5 — Data de vencimento do EPI
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
  documents: ProcessDocument[];
  assignee?: string;
  isArchived?: boolean;
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
  url?: string;
  filePath?: string;
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
  isArchived: boolean;
};

// ─── #3 — Treinamentos e Capacitações ────────────────────────────────────────
export type TrainingStatus = 'Válido' | 'Vencendo' | 'Vencido' | 'Pendente';

export type Training = {
  id: string;
  name: string;
  nr: string;
  workerId: string;
  workerName: string;
  date: string;
  validityMonths: number;
  validityDate: string;
  instructor: string;
  status: TrainingStatus;
  certificateUrl?: string;
};

// ─── #2 — Saúde Ocupacional (ASO / PCMSO) ────────────────────────────────────
export type ASOType = 'Admissional' | 'Periódico' | 'Retorno ao Trabalho' | 'Mudança de Função' | 'Demissional';
export type ASOStatus = 'Apto' | 'Apto com Restrição' | 'Inapto';

export type HealthRecord = {
  id: string;
  workerId: string;
  workerName: string;
  type: ASOType;
  date: string;
  validityDate: string;
  doctor: string;
  crm: string;
  status: ASOStatus;
  restrictions?: string;
  exams: string[];
};

// ─── #7 — Registro de Acidentes / CAT ────────────────────────────────────────
export type AccidentType = 'Acidente de Trajeto' | 'Acidente de Trabalho' | 'Doença Ocupacional';
export type AccidentSeverity = 'Leve' | 'Moderado' | 'Grave' | 'Fatal';
export type AccidentSituacao = 'Inicial' | 'Retificação' | 'Reabertura';

export type Accident = {
  id: string;
  date: string;
  time: string;
  workerId: string;
  workerName: string;
  type: AccidentType;
  situacao?: AccidentSituacao;
  severity: AccidentSeverity;
  location: string;
  description: string;
  bodyPart?: string;
  daysOff: number;
  cid?: string;
  catNumber?: string;
  catPdfUrl?: string;
  rootCause?: string;
  actionPlan?: string;
  status: 'Aberto' | 'Em Investigação' | 'Concluído';
  createdAt: string;
};


// ─── #10 — Sistema de Notificações ───────────────────────────────────────────
export type NotificationType = 'epi_vencido' | 'aso_vencendo' | 'treinamento_vencendo' | 'estoque_critico' | 'servico_prazo' | 'acidente';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
};
