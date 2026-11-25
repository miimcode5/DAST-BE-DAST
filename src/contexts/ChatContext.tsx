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
import { getTotalUnreadMessagesCount } from '../services/chatService';
import type { ChatMessage } from '../types/database';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface ChatContextValue {
  unreadCount: number;
  chatRevision: number;
  refreshUnreadCount: () => Promise<void>;
  notifyMessagesChanged: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [unreadCount, setUnreadCount] = useState(0);
  const [chatRevision, setChatRevision] = useState(0);

  const seenToastMessageIdsRef = useRef<Set<string>>(new Set());

  const refreshUnreadCount = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setUnreadCount(0);
      return;
    }
    const count = await getTotalUnreadMessagesCount();
    setUnreadCount(count);
  }, [user]);

  const notifyMessagesChanged = useCallback(() => {
    setChatRevision((prev) => prev + 1);
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setUnreadCount(0);
      return;
    }

    void refreshUnreadCount();

    const channel = supabase
      .channel(`chat-global-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Partial<ChatMessage>;
          setChatRevision((prev) => prev + 1);
          void refreshUnreadCount();

          if (
            newMsg.id &&
            newMsg.sender_id &&
            newMsg.sender_id !== user.id &&
            !seenToastMessageIdsRef.current.has(newMsg.id)
          ) {
            seenToastMessageIdsRef.current.add(newMsg.id);
            const activePath = window.location.pathname;
            const viewingSameChat =
              newMsg.conversation_id &&
              activePath.endsWith(`/messages/${newMsg.conversation_id}`);

            if (!viewingSameChat) {
              showToast('پیام جدیدی در گفت‌وگوهای شما دریافت شد.', 'info');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          setChatRevision((prev) => prev + 1);
          void refreshUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          setChatRevision((prev) => prev + 1);
          void refreshUnreadCount();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refreshUnreadCount();
        }
      });

    const handleOnline = () => {
      setChatRevision((prev) => prev + 1);
      void refreshUnreadCount();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      void supabase.removeChannel(channel);
    };
  }, [user, refreshUnreadCount, showToast]);

  return (
    <ChatContext.Provider
      value={{
        unreadCount,
        chatRevision,
        refreshUnreadCount,
        notifyMessagesChanged,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return ctx;
}
