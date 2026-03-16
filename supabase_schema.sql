-- ==============================================================================
-- SESMT Connect - Supabase PostgreSQL Schema Integration
-- File generated based on current application data structures (lib/data.ts)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Workers (Colaboradores)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cpf TEXT,
    reg TEXT,
    role TEXT,
    dept TEXT,
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    risks TEXT[] DEFAULT '{}',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Inventory (Estoque Geral / EPIs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ca TEXT,
    ca_validity_date DATE,
    cod_mv TEXT,
    category TEXT,
    unit TEXT DEFAULT 'Unidade',
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Estoque OK' CHECK (status IN ('Estoque OK', 'Reposição Necessária')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Inventory Movements (Movimentações de Estoque)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Entrada', 'Saída')),
    qty INTEGER NOT NULL,
    date DATE NOT NULL,
    target TEXT, -- Motivo ou destino da movimentação
    responsible TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. Deliveries (Entregas de EPI)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    item_name TEXT NOT NULL,
    ca TEXT,
    qty VARCHAR(50) NOT NULL,
    responsible TEXT,
    status TEXT DEFAULT 'Em Uso' CHECK (status IN ('Em Uso', 'Vencendo', 'Devolvido')),
    validity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. ERP Service Tasks (Controle de Serviços internos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.erp_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'A Fazer' CHECK (status IN ('A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído')),
    due_date DATE,
    priority TEXT DEFAULT 'Média' CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Urgente')),
    assignee TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.erp_task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.erp_tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.erp_task_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.erp_tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_size TEXT,
    file_path TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. Legal Processes (Perícias e Processos Legais)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_number TEXT NOT NULL,
    court TEXT,
    claimant_name TEXT,
    expert_name TEXT,
    type TEXT,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    deadline_date TIMESTAMP WITH TIME ZONE,
    status TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'A FAZER' CHECK (status IN ('A FAZER', 'FAZENDO', 'CONCLUÍDO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_size TEXT,
    file_path TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. Trainings (Treinamentos e Capacitações)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    nr TEXT,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    worker_name TEXT NOT NULL,
    date DATE NOT NULL,
    validity_months INTEGER DEFAULT 12,
    validity_date DATE,
    instructor TEXT,
    status TEXT DEFAULT 'Válido' CHECK (status IN ('Válido', 'Vencendo', 'Vencido', 'Pendente')),
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. Health Records (ASO / PCMSO / Saúde Ocupacional)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    worker_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Admissional', 'Periódico', 'Retorno ao Trabalho', 'Mudança de Função', 'Demissional')),
    date DATE NOT NULL,
    validity_date DATE,
    doctor TEXT,
    crm TEXT,
    status TEXT DEFAULT 'Apto' CHECK (status IN ('Apto', 'Apto com Restrição', 'Inapto')),
    restrictions TEXT,
    exams TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. Accidents (Registro de Acidentes / CAT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    time TIME NOT NULL,
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL, -- Caso excluído, manter o registro do acidente se necessário, mas pode user CASCADE
    worker_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Acidente de Trajeto', 'Acidente de Trabalho', 'Doença Ocupacional')),
    situacao TEXT DEFAULT 'Inicial' CHECK (situacao IN ('Inicial', 'Retificação', 'Reabertura')),
    severity TEXT NOT NULL CHECK (severity IN ('Leve', 'Moderado', 'Grave', 'Fatal')),
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    body_part TEXT,
    days_off INTEGER DEFAULT 0,
    cid TEXT,
    cat_number TEXT,
    cat_pdf_url TEXT,
    root_cause TEXT,
    action_plan TEXT,
    status TEXT DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Em Investigação', 'Concluído')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. Notifications
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('epi_vencido', 'aso_vencendo', 'treinamento_vencendo', 'estoque_critico', 'servico_prazo', 'acidente')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_id UUID, -- Opcional: Link genérico (pode ser o ID de um worker, EPI, ou processo)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- Buckets de Armazenamento (Supabase Storage) - IMPORTANTE
-- ==============================================================================
-- Instruções manuais para criação no Painel do Supabase:
-- 1. Acesse o menu "Storage" no Supabase e crie os seguintes buckets PÚBLICOS:
--    - "process-docs" (Para documentos de processos e perícias)
--    - "erp-docs" (Para documentos de tarefas do Kanban/ERP)
--    - "accidents" (Para os PDFs da CAT e imagens relativas ao acidente)
--    - "certificates" (Opcional - para certificados de treinamento)
