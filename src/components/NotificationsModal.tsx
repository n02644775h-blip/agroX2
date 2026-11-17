import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { pushNotificationService } from '../services/pushNotificationService';
import { LiquidGlassModal } from './glass';
import {
  Bell,
  X,
  Package,
  MessageSquare,
  AlertTriangle,
  Radio,
  CheckCheck,
  Clock,
  Megaphone,
  Sparkles,
  BellRing
} from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
  onSelectNotification: (notif: AppNotification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onSelectNotification
}) => {
  const { user, notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAuth();
  const [pushPerm, setPushPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    pushNotificationService.getPermissionStatus()
  );
  const [enablingPush, setEnablingPush] = useState(false);

  const handleEnablePush = async () => {
    if (!user?.id) return;
    setEnablingPush(true);
    try {
      pushNotificationService.setUserPushEnabled(true);
      const res = await pushNotificationService.initializeForUser(user.id, true);
      setPushPerm(res.permission);
    } finally {
      setEnablingPush(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-4 h-4 text-sky-700" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#145A38]" />;
      case 'request':
        return <Megaphone className="w-4 h-4 text-amber-700" />;
      case 'post':
        return <Sparkles className="w-4 h-4 text-[#145A38]" />;
      case 'announcement':
        return <Radio className="w-4 h-4 text-[#062B1F]" />;
      case 'inventory':
        return <AlertTriangle className="w-4 h-4 text-amber-700" />;
      default:
        return <Bell className="w-4 h-4 text-[#0B3D2B]" />;
    }
  };

  return (
    <LiquidGlassModal
      isOpen={true}
      onClose={onClose}
      hideHeader
      maxWidthClass="max-w-lg"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-[#062B1F] via-[#0B3D2B] to-[#145A38] text-white flex items-center justify-between border-b border-white/15 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/14 border border-white/25 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#A8E635]" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Activity Notifications</h2>
              <p className="text-[11px] text-[#DFF4E4]/75">Live order, message & marketplace updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="text-xs font-bold text-[#A8E635] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#DFF4E4] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {pushPerm === 'default' && user?.id && (
          <div className="px-4 py-2.5 bg-[#DFF4E4]/85 border-b border-[#145A38]/15 flex items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2 text-[#062B1F] font-semibold">
              <BellRing className="w-4 h-4 text-[#145A38] shrink-0" />
              <span>Turn on push alerts for instant order &amp; delivery updates</span>
            </div>
            <button
              type="button"
              disabled={enablingPush}
              onClick={handleEnablePush}
              className="px-3 py-1.5 rounded-xl bg-[#062B1F] text-[#A8E635] font-bold text-[11px] shrink-0 cursor-pointer hover:bg-[#0B3D2B] disabled:opacity-50"
            >
              {enablingPush ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto divide-y divide-[#062B1F]/10 p-3 flex-1 space-y-1.5">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#0B3D2B]/60 space-y-2">
              <Bell className="w-8 h-8 text-[#145A38]/35 mx-auto" />
              <p>You have no notifications right now.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <button
                key={notif.id}
                type="button"
                onClick={() => {
                  markNotificationAsRead(notif.id);
                  onSelectNotification(notif);
                }}
                className={`w-full text-left p-3.5 rounded-2xl flex items-start gap-3 cursor-pointer transition-all border ${
                  notif.read
                    ? 'bg-white/60 hover:bg-white border-transparent'
                    : 'bg-[#DFF4E4]/75 hover:bg-[#DFF4E4] border-[#145A38]/20 shadow-xs'
                }`}
              >
                <div className="p-2 rounded-xl bg-white border border-[#062B1F]/10 shadow-2xs shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs truncate ${notif.read ? 'font-semibold text-[#062B1F]' : 'font-extrabold text-[#062B1F]'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-[#0B3D2B]/55 flex items-center gap-1 shrink-0 tabular-nums">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#0B3D2B]/75 mt-0.5 leading-relaxed">{notif.message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </LiquidGlassModal>
  );
};
