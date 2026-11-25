import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getUnreadNotificationsCount } from '../services/notificationsService';
import type { AppNotification } from '../types/database';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface NotificationsContextValue {
  unreadNotificationsCount: number;
  notificationsRevision: number;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsRevision, setNotificationsRevision] = useState(0);

  const seenToastIdsRef = useRef<Set<string>>(new Set());

  const refreshUnread = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setUnreadNotificationsCount(0);
      return;
    }
    const count = await getUnreadNotificationsCount();
    setUnreadNotificationsCount(count);
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    setNotificationsRevision((prev) => prev + 1);
    await refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setUnreadNotificationsCount(0);
      return;
    }

    void refreshUnread();

    const channel = supabase
      .channel(`notifications-global-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const item = payload.new as Partial<AppNotification>;
          setNotificationsRevision((prev) => prev + 1);
          void refreshUnread();

          if (
            item.id &&
            item.type !== 'new_message' &&
            item.type !== 'account_welcome' &&
            !seenToastIdsRef.current.has(item.id)
          ) {
            seenToastIdsRef.current.add(item.id);
            showToast(item.title || 'اعلان جدیدی ثبت شد.', 'info');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setNotificationsRevision((prev) => prev + 1);
          void refreshUnread();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setNotificationsRevision((prev) => prev + 1);
          void refreshUnread();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refreshUnread();
        }
      });

    const handleOnline = () => {
      setNotificationsRevision((prev) => prev + 1);
      void refreshUnread();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      void supabase.removeChannel(channel);
    };
  }, [user, refreshUnread, showToast]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadNotificationsCount,
        notificationsRevision,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
