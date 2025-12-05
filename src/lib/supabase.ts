import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gkjyajysblgdxujbdwxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdranlhanlzYmxnZHh1amJkd3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTg2ODksImV4cCI6MjA2MzI3NDY4OX0.gxPhyFqpVVLOvFCaFfuxRFrPnPOST3XLOjWCPC_3U_0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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