-- Habilitar a extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Trabalhadores (Workers)
CREATE TABLE workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    reg TEXT,
    role TEXT,
    dept TEXT,
    status TEXT DEFAULT 'Ativo',
    risks TEXT[] DEFAULT '{}',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Estoque (Inventory)
CREATE TABLE inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    ca TEXT,
    category TEXT,
    unit TEXT DEFAULT 'Unidade',
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Estoque OK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Entregas (Deliveries)
CREATE TABLE deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    ca TEXT,
    qty TEXT,
    responsible TEXT,
    status TEXT DEFAULT 'Em Uso',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Movimentações (Movements)
CREATE TABLE movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    date TEXT NOT NULL,
    target TEXT,
    responsible TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Configuração de Segurança (RLS)
-- Como o aplicativo usa um sistema de login próprio (simulado no frontend) 
-- e acessa o Supabase usando a chave anônima (anon key), precisamos 
-- garantir que o RLS (Row Level Security) permita leitura e escrita públicas.

ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE movements DISABLE ROW LEVEL SECURITY;

-- Opcional: Inserir alguns dados de exemplo iniciais para testar
INSERT INTO inventory (name, ca, category, unit, stock, min_stock, status) VALUES
('Luva de Raspa Premium', '12345', 'Proteção Manual', 'Par', 150, 50, 'Estoque OK'),
('Capacete de Segurança Aba Frontal', '54321', 'Proteção Cabeça', 'Unidade', 45, 50, 'Reposição Necessária'),
('Óculos de Proteção Antirrisco', '98765', 'Proteção Visual', 'Unidade', 200, 30, 'Estoque OK');
