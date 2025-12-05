import React from 'react';
import { Download, X, Bell, Zap } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWA();
  const { isSupported, permission, requestPermission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = React.useState(false);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      await subscribe();
    }
  };

  if (dismissed || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50 space-y-2">
      {/* Prompt de instalação */}
      {isInstallable && (
        <div className="bg-gray-900 border border-primary rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
              
              <Zap className="w-5 h-5 text-dark" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">
                Instalar <span className="text-primary">HBLACK</span> BOLT
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Instale o app para acesso rápido e uso offline
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={install}
                  className="bg-primary text-dark font-semibold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 transition"
                >
                  Instalar
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white transition"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-500 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Prompt de notificações */}
      {isSupported && permission === 'default' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Ativar Notificações</h3>
              <p className="text-sm text-gray-400 mt-1">
                Receba alertas sobre suas entregas
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleEnableNotifications}
                  className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition"
                >
                  Ativar
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white transition"
                >
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAInstallPrompt;