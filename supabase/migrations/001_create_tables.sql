-- Tabela de rotas
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
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

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (ajuste conforme necessidade de autenticação)
CREATE POLICY "Allow all access to routes" ON routes FOR ALL USING (true);
CREATE POLICY "Allow all access to deliveries" ON deliveries FOR ALL USING (true);

-- Storage bucket para imagens
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-images', 'delivery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de acesso ao storage
CREATE POLICY "Allow public access to delivery images"
ON storage.objects FOR ALL
USING (bucket_id = 'delivery-images');