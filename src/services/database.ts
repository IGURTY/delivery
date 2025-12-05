import { supabase, DbRoute, DbDelivery } from '@/lib/supabase';
import { Delivery, DeliveryStatus } from '@/components/DeliveryCard';

// ==================== UPLOAD DE IMAGENS ====================

export async function uploadImage(base64: string, folder: string = 'labels'): Promise<string | null> {
  try {
    // Converter base64 para blob
    const base64Data = base64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Nome único para o arquivo
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('delivery-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('Erro no upload:', error);
      return null;
    }

    // Retornar URL pública
    const { data: urlData } = supabase.storage
      .from('delivery-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    return null;
  }
}

// ==================== ROTAS ====================

export async function createRoute(startCep: string): Promise<DbRoute | null> {
  const { data, error } = await supabase
    .from('routes')
    .insert({
      start_cep: startCep,
      status: 'active',
      total_deliveries: 0,
      completed_deliveries: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar rota:', error);
    return null;
  }

  return data;
}

export async function getActiveRoute(): Promise<DbRoute | null> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar rota ativa:', error);
  }

  return data || null;
}

export async function getAllRoutes(): Promise<DbRoute[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar rotas:', error);
    return [];
  }

  return data || [];
}

export async function getRouteById(routeId: string): Promise<DbRoute | null> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('id', routeId)
    .single();

  if (error) {
    console.error('Erro ao buscar rota:', error);
    return null;
  }

  return data;
}

export async function updateRouteStatus(routeId: string, status: DbRoute['status']): Promise<boolean> {
  const { error } = await supabase
    .from('routes')
    .update({ status })
    .eq('id', routeId);

  if (error) {
    console.error('Erro ao atualizar status da rota:', error);
    return false;
  }

  return true;
}

export async function updateRouteStats(routeId: string): Promise<boolean> {
  // Buscar contagem de entregas
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('status')
    .eq('route_id', routeId);

  if (error) {
    console.error('Erro ao buscar entregas:', error);
    return false;
  }

  const total = deliveries?.length || 0;
  const completed = deliveries?.filter(d => d.status === 'entregue').length || 0;

  // Atualizar rota
  const { error: updateError } = await supabase
    .from('routes')
    .update({
      total_deliveries: total,
      completed_deliveries: completed,
      status: total > 0 && completed === total ? 'completed' : 'active'
    })
    .eq('id', routeId);

  if (updateError) {
    console.error('Erro ao atualizar stats da rota:', updateError);
    return false;
  }

  return true;
}

export async function deleteRoute(routeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('id', routeId);

  if (error) {
    console.error('Erro ao deletar rota:', error);
    return false;
  }

  return true;
}

// ==================== ENTREGAS ====================

export async function createDelivery(
  routeId: string,
  delivery: Delivery,
  orderIndex: number
): Promise<DbDelivery | null> {
  // Upload da imagem da etiqueta
  let imageUrl: string | null = null;
  if (delivery.image) {
    imageUrl = await uploadImage(delivery.image, 'labels');
  }

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      route_id: routeId,
      order_index: orderIndex,
      nome: delivery.nome || null,
      rua: delivery.rua || null,
      numero: delivery.numero || null,
      bairro: delivery.bairro || null,
      cep: delivery.cep || null,
      cidade: delivery.cidade || null,
      estado: delivery.estado || null,
      status: delivery.status,
      image_url: imageUrl
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar entrega:', error);
    return null;
  }

  // Atualizar stats da rota
  await updateRouteStats(routeId);

  return data;
}

export async function getDeliveriesByRoute(routeId: string): Promise<DbDelivery[]> {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('route_id', routeId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Erro ao buscar entregas:', error);
    return [];
  }

  return data || [];
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  proofImage?: string
): Promise<boolean> {
  const updates: Partial<DbDelivery> = {
    status,
    delivered_at: status === 'entregue' ? new Date().toISOString() : null
  };

  // Upload da prova de entrega se fornecida
  if (proofImage) {
    const proofUrl = await uploadImage(proofImage, 'proofs');
    if (proofUrl) {
      updates.proof_image_url = proofUrl;
    }
  }

  const { data, error } = await supabase
    .from('deliveries')
    .update(updates)
    .eq('id', deliveryId)
    .select('route_id')
    .single();

  if (error) {
    console.error('Erro ao atualizar status da entrega:', error);
    return false;
  }

  // Atualizar stats da rota
  if (data?.route_id) {
    await updateRouteStats(data.route_id);
  }

  return true;
}

export async function updateDeliveryOrder(routeId: string, deliveryIds: string[]): Promise<boolean> {
  // Atualizar ordem de cada entrega
  const updates = deliveryIds.map((id, index) =>
    supabase
      .from('deliveries')
      .update({ order_index: index })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);

  if (hasError) {
    console.error('Erro ao atualizar ordem das entregas');
    return false;
  }

  return true;
}

export async function deleteDelivery(deliveryId: string): Promise<boolean> {
  // Buscar route_id antes de deletar
  const { data: delivery } = await supabase
    .from('deliveries')
    .select('route_id')
    .eq('id', deliveryId)
    .single();

  const { error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', deliveryId);

  if (error) {
    console.error('Erro ao deletar entrega:', error);
    return false;
  }

  // Atualizar stats da rota
  if (delivery?.route_id) {
    await updateRouteStats(delivery.route_id);
  }

  return true;
}

// ==================== CONVERSÃO ====================

export function dbDeliveryToDelivery(dbDelivery: DbDelivery): Delivery {
  return {
    id: dbDelivery.id,
    nome: dbDelivery.nome || '',
    rua: dbDelivery.rua || '',
    numero: dbDelivery.numero || '',
    bairro: dbDelivery.bairro || '',
    cep: dbDelivery.cep || '',
    cidade: dbDelivery.cidade || '',
    estado: dbDelivery.estado ||Vou executar o SQL para criar as tabelas no banco de dados:

<dyad-execute-sql description="Criar tabelas de rotas e entregas com RLS">
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
</dyad-execute-sql>

Agora vou finalizar o serviço de banco de dados:

<dyad-write path="src/services/database.ts" description="Serviço completo de banco de dados">
import { supabase } from '@/integrations/supabase/client';
import { Delivery, DeliveryStatus } from '@/components/DeliveryCard';

// Tipos do banco de dados
export type DbRoute = {
  id: string;
  user_id: string | null;
  start_cep: string;
  status: 'active' | 'completed' | 'cancelled';
  total_deliveries: number;
  completed_deliveries: number;
  created_at: string;
  updated_at: string;
};

export type DbDelivery = {
  id: string;
  route_id: string;
  order_index: number;
  nome: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  status: 'pendente' | 'entregue' | 'nao-entregue';
  image_url: string | null;
  proof_image_url: string | null;
  notes: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

// ==================== UPLOAD DE IMAGENS ====================

export async function uploadImage(base64: string, folder: string = 'labels'): Promise<string | null> {
  try {
    const base64Data = base64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

    const { data, error } = await supabase.storage
      .from('delivery-images')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

    if (error) {
      console.error('Erro no upload:', error);
      return base64; // Retorna base64 como fallback
    }

    const { data: urlData } = supabase.storage
      .from('delivery-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return base64; // Retorna base64 como fallback
  }
}

// ==================== ROTAS ====================

export async function createRoute(startCep: string): Promise<DbRoute | null> {
  const { data, error } = await supabase
    .from('routes')
    .insert({ start_cep: startCep, status: 'active', total_deliveries: 0, completed_deliveries: 0 })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar rota:', error);
    return null;
  }
  return data as DbRoute;
}

export async function getActiveRoute(): Promise<DbRoute | null> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar rota ativa:', error);
    return null;
  }
  return data as DbRoute | null;
}

export async function getAllRoutes(): Promise<DbRoute[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar rotas:', error);
    return [];
  }
  return (data || []) as DbRoute[];
}

export async function updateRouteStatus(routeId: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('routes')
    .update({ status })
    .eq('id', routeId);

  if (error) {
    console.error('Erro ao atualizar rota:', error);
    return false;
  }
  return true;
}

export async function updateRouteStats(routeId: string): Promise<boolean> {
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('status')
    .eq('route_id', routeId);

  const total = deliveries?.length || 0;
  const completed = deliveries?.filter((d: any) => d.status === 'entregue').length || 0;

  const { error } = await supabase
    .from('routes')
    .update({
      total_deliveries: total,
      completed_deliveries: completed,
      status: total > 0 && completed === total ? 'completed' : 'active'
    })
    .eq('id', routeId);

  if (error) {
    console.error('Erro ao atualizar stats:', error);
    return false;
  }
  return true;
}

export async function deleteRoute(routeId: string): Promise<boolean> {
  const { error } = await supabase.from('routes').delete().eq('id', routeId);
  if (error) {
    console.error('Erro ao deletar rota:', error);
    return false;
  }
  return true;
}

// ==================== ENTREGAS ====================

export async function createDelivery(routeId: string, delivery: Delivery, orderIndex: number): Promise<DbDelivery | null> {
  const imageUrl = delivery.image ? await uploadImage(delivery.image, 'labels') : null;

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      route_id: routeId,
      order_index: orderIndex,
      nome: delivery.nome || null,
      rua: delivery.rua || null,
      numero: delivery.numero || null,
      bairro: delivery.bairro || null,
      cep: delivery.cep || null,
      cidade: delivery.cidade || null,
      estado: delivery.estado || null,
      status: delivery.status,
      image_url: imageUrl
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar entrega:', error);
    return null;
  }

  await updateRouteStats(routeId);
  return data as DbDelivery;
}

export async function getDeliveriesByRoute(routeId: string): Promise<DbDelivery[]> {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('route_id', routeId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Erro ao buscar entregas:', error);
    return [];
  }
  return (data || []) as DbDelivery[];
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus, proofImage?: string): Promise<boolean> {
  const updates: any = {
    status,
    delivered_at: status === 'entregue' ? new Date().toISOString() : null
  };

  if (proofImage) {
    const proofUrl = await uploadImage(proofImage, 'proofs');
    if (proofUrl) updates.proof_image_url = proofUrl;
  }

  const { data, error } = await supabase
    .from('deliveries')
    .update(updates)
    .eq('id', deliveryId)
    .select('route_id')
    .single();

  if (error) {
    console.error('Erro ao atualizar entrega:', error);
    return false;
  }

  if (data?.route_id) await updateRouteStats(data.route_id);
  return true;
}

export async function updateDeliveryOrder(routeId: string, deliveryIds: string[]): Promise<boolean> {
  for (let i = 0; i < deliveryIds.length; i++) {
    await supabase.from('deliveries').update({ order_index: i }).eq('id', deliveryIds[i]);
  }
  return true;
}

export async function deleteDelivery(deliveryId: string): Promise<boolean> {
  const { data: delivery } = await supabase
    .from('deliveries')
    .select('route_id')
    .eq('id', deliveryId)
    .single();

  const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);

  if (error) {
    console.error('Erro ao deletar entrega:', error);
    return false;
  }

  if (delivery?.route_id) await updateRouteStats(delivery.route_id);
  return true;
}

// ==================== CONVERSÃO ====================

export function dbDeliveryToDelivery(db: DbDelivery): Delivery {
  return {
    id: db.id,
    nome: db.nome || '',
    rua: db.rua || '',
    numero: db.numero || '',
    bairro: db.bairro || '',
    cep: db.cep || '',
    cidade: db.cidade || '',
    estado: db.estado || '',
    image: db.image_url || '',
    status: db.status as DeliveryStatus,
    proofImage: db.proof_image_url || undefined
  };
}

export function deliveryToDbDelivery(delivery: Delivery, routeId: string, orderIndex: number): Partial<DbDelivery> {
  return {
    route_id: routeId,
    order_index: orderIndex,
    nome: delivery.nome,
    rua: delivery.rua,
    numero: delivery.numero,
    bairro: delivery.bairro,
    cep: delivery.cep,
    cidade: delivery.cidade,
    estado: delivery.estado,
    status: delivery.status,
    image_url: delivery.image,
    proof_image_url: delivery.proofImage
  };
}