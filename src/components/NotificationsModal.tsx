import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import {
  Bell,
  X,
  CheckCircle,
  Package,
  MessageSquare,
  AlertTriangle,
  Radio,
  CheckCheck,
  Clock
} from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
  onSelectNotification: (notif: AppNotification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onSelectNotification
}) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAuth();

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'announcement':
        return <Radio className="w-4 h-4 text-purple-600" />;
      case 'inventory':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-stone-900 text-base">Activity Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto divide-y divide-stone-100 p-2 flex-1">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <Bell className="w-8 h-8 text-stone-300 mx-auto" />
              <p>You have no notifications right now.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationAsRead(notif.id);
                  onSelectNotification(notif);
                }}
                className={`p-3.5 rounded-2xl flex items-start gap-3 cursor-pointer transition-all ${
                  notif.read ? 'bg-white hover:bg-stone-50' : 'bg-emerald-50/60 hover:bg-emerald-50'
                }`}
              >
                <div className="p-2 rounded-xl bg-white border border-stone-200 shadow-2xs shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs ${notif.read ? 'font-semibold text-stone-800' : 'font-bold text-stone-900'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-stone-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
