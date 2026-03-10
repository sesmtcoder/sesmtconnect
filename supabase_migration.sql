-- Migrations for EPI Management System

-- 1. Workers Table
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    reg TEXT NOT NULL,
    role TEXT NOT NULL,
    dept TEXT NOT NULL,
    status TEXT DEFAULT 'Ativo',
    risks TEXT[] DEFAULT '{}',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ca TEXT,
    category TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'Unidade',
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Estoque OK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    ca TEXT,
    qty TEXT NOT NULL,
    responsible TEXT NOT NULL,
    status TEXT DEFAULT 'Em Uso',
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Movements Table (Inventory History)
CREATE TABLE IF NOT EXISTS movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Entrada' or 'Saída'
    qty INTEGER NOT NULL,
    target TEXT NOT NULL,
    responsible TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS) - Optional but recommended
-- For this demo, we can start with simple policies or keep it open if needed.
-- ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
-- CREATE POLICY "Public Access" ON workers FOR ALL USING (true);
-- CREATE POLICY "Public Access" ON inventory FOR ALL USING (true);
-- CREATE POLICY "Public Access" ON deliveries FOR ALL USING (true);
-- CREATE POLICY "Public Access" ON movements FOR ALL USING (true);
