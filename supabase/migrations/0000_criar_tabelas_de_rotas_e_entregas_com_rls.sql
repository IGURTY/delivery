-- Tabela de rotas
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_cep TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  total_deliveries INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de entregas
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  nome TEXT,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue', 'nao-entregue')),
  image_url TEXT,
  proof_image_url TEXT,
  notes TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_deliveries_route_id ON deliveries(route_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at DESC);

-- Habilitar RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para routes
CREATE POLICY "routes_select_policy" ON routes 
FOR SELECT USING (true);

CREATE POLICY "routes_insert_policy" ON routes 
FOR INSERT WITH CHECK (true);

CREATE POLICY "routes_update_policy" ON routes 
FOR UPDATE USING (true);

CREATE POLICY "routes_delete_policy" ON routes 
FOR DELETE USING (true);

-- Políticas de acesso para deliveries
CREATE POLICY "deliveries_select_policy" ON deliveries 
FOR SELECT USING (true);

CREATE POLICY "deliveries_insert_policy" ON deliveries 
FOR INSERT WITH CHECK (true);

CREATE POLICY "deliveries_update_policy" ON deliveries 
FOR UPDATE USING (true);

CREATE POLICY "deliveries_delete_policy" ON deliveries 
FOR DELETE USING (true);