-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_task_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas para todas as tabelas (Acesso apenas para usuários autenticados)
-- Usaremos uma função auxiliar ou repetiremos para clareza, seguindo o padrão anterior.

DO $$
DECLARE
    t text;
    tables_to_secure text[] := ARRAY[
        'workers', 'inventory', 'deliveries', 'movements', 
        'erp_tasks', 'erp_task_comments', 'erp_task_documents',
        'processes', 'process_tasks', 'process_documents',
        'trainings', 'health_records', 'accidents', 'app_notifications'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        -- SELECT
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can read %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Authenticated users can read %I" ON %I FOR SELECT TO authenticated USING (true)', t, t);
        
        -- INSERT
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Authenticated users can insert %I" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
        
        -- UPDATE
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Authenticated users can update %I" ON %I FOR UPDATE TO authenticated USING (true)', t, t);
        
        -- DELETE
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Authenticated users can delete %I" ON %I FOR DELETE TO authenticated USING (true)', t, t);
    END LOOP;
END $$;
