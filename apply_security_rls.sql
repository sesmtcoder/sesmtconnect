-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas para a tabela 'workers'
-- Apenas usuários autenticados via login podem ver ou mexer nos dados
CREATE POLICY "Authenticated users can read workers" ON workers
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert workers" ON workers
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update workers" ON workers
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete workers" ON workers
FOR DELETE TO authenticated USING (true);

-- 3. Criar políticas para a tabela 'inventory'
CREATE POLICY "Authenticated users can read inventory" ON inventory
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert inventory" ON inventory
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory" ON inventory
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete inventory" ON inventory
FOR DELETE TO authenticated USING (true);

-- 4. Criar políticas para a tabela 'deliveries'
CREATE POLICY "Authenticated users can read deliveries" ON deliveries
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert deliveries" ON deliveries
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update deliveries" ON deliveries
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete deliveries" ON deliveries
FOR DELETE TO authenticated USING (true);

-- 5. Criar políticas para a tabela 'movements'
CREATE POLICY "Authenticated users can read movements" ON movements
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert movements" ON movements
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update movements" ON movements
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete movements" ON movements
FOR DELETE TO authenticated USING (true);
