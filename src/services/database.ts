import { supabase } from '@/integrations/supabase/client';
import { Delivery, DeliveryStatus } from '@/components/DeliveryCard';

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

export async function uploadImage(base64: string, folder: string = 'labels'): Promise<string> {
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

    if (error) return base64;

    const { data: urlData } = supabase.storage.from('delivery-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch {
    return base64;
  }
}

export async function createRoute(startCep: string): Promise<DbRoute | null> {
  const { data, error } = await supabase
    .from('routes')
    .insert({ start_cep: startCep, status: 'active', total_deliveries: 0, completed_deliveries: 0 })
    .select()
    .single();
  if (error) return null;
  return data as DbRoute;
}

export async function getActiveRoute(): Promise<DbRoute | null> {
  const { data } = await supabase
    .from('routes')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as DbRoute | null;
}

export async function getAllRoutes(): Promise<DbRoute[]> {
  const { data } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
  return (data || []) as DbRoute[];
}

export async function updateRouteStatus(routeId: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('routes').update({ status }).eq('id', routeId);
  return !error;
}

export async function updateRouteStats(routeId: string): Promise<boolean> {
  const { data: deliveries } = await supabase.from('deliveries').select('status').eq('route_id', routeId);
  const total = deliveries?.length || 0;
  const completed = deliveries?.filter((d: any) => d.status === 'entregue').length || 0;
  const { error } = await supabase
    .from('routes')
    .update({ total_deliveries: total, completed_deliveries: completed, status: total > 0 && completed === total ? 'completed' : 'active' })
    .eq('id', routeId);
  return !error;
}

export async function deleteRoute(routeId: string): Promise<boolean> {
  const { error } = await supabase.from('routes').delete().eq('id', routeId);
  return !error;
}

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
  if (error) return null;
  await updateRouteStats(routeId);
  return data as DbDelivery;
}

export async function getDeliveriesByRoute(routeId: string): Promise<DbDelivery[]> {
  const { data } = await supabase.from('deliveries').select('*').eq('route_id', routeId).order('order_index', { ascending: true });
  return (data || []) as DbDelivery[];
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus, proofImage?: string): Promise<boolean> {
  const updates: any = { status, delivered_at: status === 'entregue' ? new Date().toISOString() : null };
  if (proofImage) {
    const proofUrl = await uploadImage(proofImage, 'proofs');
    updates.proof_image_url = proofUrl;
  }
  const { data, error } = await supabase.from('deliveries').update(updates).eq('id', deliveryId).select('route_id').single();
  if (error) return false;
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
  const { data: delivery } = await supabase.from('deliveries').select('route_id').eq('id', deliveryId).single();
  const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);
  if (error) return false;
  if (delivery?.route_id) await updateRouteStats(delivery.route_id);
  return true;
}

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