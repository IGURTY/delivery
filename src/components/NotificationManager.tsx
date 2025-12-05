import React, { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Delivery } from './DeliveryCard';

interface Props {
  deliveries: Delivery[];
}

const NotificationManager: React.FC<Props> = ({ deliveries }) => {
  const { permission, sendLocalNotification } = usePushNotifications();

  // Notifica quando todas as entregas forem concluídas
  useEffect(() => {
    if (permission !== 'granted' || deliveries.length === 0) return;

    const pendentes = deliveries.filter(d => d.status === 'pendente').length;
    const entregues = deliveries.filter(d => d.status === 'entregue').length;
    const total = deliveries.length;

    if (entregues === total && total > 0) {
      sendLocalNotification(
        '🎉 Parabéns!',
        `Todas as ${total} entregas foram concluídas!`
      );
    } else if (pendentes === 1 && total > 1) {
      sendLocalNotification(
        '📦 Quase lá!',
        'Falta apenas 1 entrega para finalizar!'
      );
    }
  }, [deliveries, permission, sendLocalNotification]);

  return null;
};

export default NotificationManager;