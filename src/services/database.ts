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
  delivered_at: string | null;
  created_at: string;
};

export async function createRoute(startCep: string): Promise<DbRoute | null> {
  const { data, error } = await supabase.from('routes').insert({ start_cep: startCep, status: 'active', total_deliveries: 0, completed_deliveries: 0 }).select().single();
  return error ? null : data as DbRoute;
}

export async function getActiveRoute(): Promise<DbRoute | null> {
  const { data } = await supabase.from('routes').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
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

export async function updateRouteStats(routeId: string): Promise<void> {
  const { data } = await supabase.from('deliveries').select('status').eq('route_id', routeId);
  const total = data?.length || 0;
  const completed = data?.filter((d: any) => d.status === 'entregue').length || 0;
  await supabase.from('routes').update({ total_deliveries: total, completed_deliveries: completed }).eq('id', routeId);
}

export async function createDelivery(routeId: string, delivery: Delivery, orderIndex: number): Promise<DbDelivery | null> {
  const { data, error } = await supabase.from('deliveries').insert({ route_id: routeId, order_index: orderIndex, nome: delivery.nome, rua: delivery.rua, numero: delivery.numero, bairro: delivery.bairro, cep: delivery.cep, cidade: delivery.cidade, estado: delivery.estado, status: delivery.status, image_url: delivery.image }).select().single();
  if (!error) await updateRouteStats(routeId);
  return error ? null : data as DbDelivery;
}

export async function getDeliveriesByRoute(routeId: string): Promise<DbDelivery[]> {
  const { data } = await supabase.from('deliveries').select('*').eq('route_id', routeId).order('order_index', { ascending: true });
  return (data || []) as DbDelivery[];
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus, proofImage?: string): Promise<boolean> {
  const updates: any = { status, delivered_at: status === 'entregue' ? new Date().toISOString() : null };
  if (proofImage) updates.proof_image_url = proofImage;
  const { data, error } = await supabase.from('deliveries').update(updates).eq('id', deliveryId).select('route_id').single();
  if (!error && data?.route_id) await updateRouteStats(data.route_id);
  return !error;
}

export async function updateDeliveryOrder(routeId: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) await supabase.from('deliveries').update({ order_index: i }).eq('id', ids[i]);
}

export async function deleteDelivery(deliveryId: string): Promise<void> {
  const { data } = await supabase.from('deliveries').select('route_id').eq('id', deliveryId).single();
  await supabase.from('deliveries').delete().eq('id', deliveryId);
  if (data?.route_id) await updateRouteStats(data.route_id);
}

export function dbDeliveryToDelivery(d: DbDelivery): Delivery {
  return { id: d.id, nome: d.nome || '', rua: d.rua || '', numero: d.numero || '', bairro: d.bairro || '', cep: d.cep || '', cidade: d.cidade || '', estado: d.estado || '', image: d.image_url || '', status: d.status as DeliveryStatus, proofImage: d.proof_image_url || undefined };
}