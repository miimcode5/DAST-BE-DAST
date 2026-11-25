import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ConversationItem,
  HelpCategory,
  HelpRequestFeedItem,
  HelpType,
  PlatformStats,
  Profile,
} from '../types/database';

export interface PendingCreateRequest {
  clientMutationId: string;
  userId: string;
  payload: {
    title: string;
    description: string;
    category: HelpCategory;
    help_type: HelpType;
    province: string;
    city: string;
    area: string;
    needed_at: string;
  };
  createdAt: string;
  syncStatus: 'pending_sync' | 'failed';
  lastError?: string;
}

interface DastBeDastDB extends DBSchema {
  requests_cache: {
    key: string;
    value: {
      key: string;
      items: HelpRequestFeedItem[];
      updatedAt: string;
    };
  };
  stats_cache: {
    key: string;
    value: {
      key: string;
      stats: PlatformStats;
      updatedAt: string;
    };
  };
  profiles_cache: {
    key: string;
    value: {
      id: string;
      profile: Profile;
      updatedAt: string;
    };
  };
  conversations_cache: {
    key: string;
    value: {
      userId: string;
      items: ConversationItem[];
      updatedAt: string;
    };
  };
  pending_requests: {
    key: string;
    value: PendingCreateRequest;
    indexes: { 'by-user': string };
  };
}

let dbPromise: Promise<IDBPDatabase<DastBeDastDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DastBeDastDB>('dast-be-dast-offline-v1', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('requests_cache')) {
          db.createObjectStore('requests_cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('stats_cache')) {
          db.createObjectStore('stats_cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('profiles_cache')) {
          db.createObjectStore('profiles_cache', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('conversations_cache')) {
          db.createObjectStore('conversations_cache', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('pending_requests')) {
          const store = db.createObjectStore('pending_requests', { keyPath: 'clientMutationId' });
          store.createIndex('by-user', 'userId');
        }
      },
    });
  }
  return dbPromise;
}

export async function cachePublicRequests(items: HelpRequestFeedItem[], key = 'latest'): Promise<void> {
  try {
    const db = await getDb();
    await db.put('requests_cache', {
      key,
      items: items.slice(0, 80),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Ignore storage quota or private mode IndexedDB limitations
  }
}

export async function getCachedPublicRequests(key = 'latest'): Promise<{
  items: HelpRequestFeedItem[];
  updatedAt: string | null;
}> {
  try {
    const db = await getDb();
    const record = await db.get('requests_cache', key);
    return {
      items: record?.items ?? [],
      updatedAt: record?.updatedAt ?? null,
    };
  } catch {
    return { items: [], updatedAt: null };
  }
}

export async function cachePlatformStats(stats: PlatformStats): Promise<void> {
  try {
    const db = await getDb();
    await db.put('stats_cache', {
      key: 'global',
      stats,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}

export async function getCachedPlatformStats(): Promise<PlatformStats | null> {
  try {
    const db = await getDb();
    const record = await db.get('stats_cache', 'global');
    return record?.stats ?? null;
  } catch {
    return null;
  }
}

export async function cacheProfile(profile: Profile): Promise<void> {
  try {
    const db = await getDb();
    await db.put('profiles_cache', {
      id: profile.id,
      profile,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}

export async function getCachedProfile(id: string): Promise<Profile | null> {
  try {
    const db = await getDb();
    const record = await db.get('profiles_cache', id);
    return record?.profile ?? null;
  } catch {
    return null;
  }
}

export async function enqueueOfflineRequest(
  userId: string,
  payload: PendingCreateRequest['payload']
): Promise<PendingCreateRequest> {
  const db = await getDb();
  const record: PendingCreateRequest = {
    clientMutationId: crypto.randomUUID(),
    userId,
    payload,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending_sync',
  };
  await db.put('pending_requests', record);
  return record;
}

export async function getPendingOfflineRequests(userId?: string): Promise<PendingCreateRequest[]> {
  try {
    const db = await getDb();
    if (userId) {
      return await db.getAllFromIndex('pending_requests', 'by-user', userId);
    }
    return await db.getAll('pending_requests');
  } catch {
    return [];
  }
}

export async function markPendingOfflineRequestFailed(clientMutationId: string, message: string): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.get('pending_requests', clientMutationId);
    if (!existing) return;
    await db.put('pending_requests', {
      ...existing,
      syncStatus: 'failed',
      lastError: message,
    });
  } catch {
    // ignore
  }
}

export async function removePendingOfflineRequest(clientMutationId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('pending_requests', clientMutationId);
  } catch {
    // ignore
  }
}

export async function getOfflineCacheStats(): Promise<{
  cachedRequestsCount: number;
  cachedRequestsUpdatedAt: string | null;
  pendingSyncCount: number;
}> {
  try {
    const db = await getDb();
    const cached = await db.get('requests_cache', 'latest');
    const pending = await db.getAll('pending_requests');
    return {
      cachedRequestsCount: cached?.items.length ?? 0,
      cachedRequestsUpdatedAt: cached?.updatedAt ?? null,
      pendingSyncCount: pending.length,
    };
  } catch {
    return {
      cachedRequestsCount: 0,
      cachedRequestsUpdatedAt: null,
      pendingSyncCount: 0,
    };
  }
}

export async function clearOfflineCache(): Promise<void> {
  const db = await getDb();
  await db.clear('requests_cache');
  await db.clear('stats_cache');
  await db.clear('profiles_cache');
  await db.clear('conversations_cache');
}

export async function cacheUserConversations(userId: string, items: ConversationItem[]): Promise<void> {
  try {
    const db = await getDb();
    await db.put('conversations_cache', {
      userId,
      items: items.slice(0, 60),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}

export async function getCachedUserConversations(userId: string): Promise<ConversationItem[]> {
  try {
    const db = await getDb();
    const record = await db.get('conversations_cache', userId);
    return record?.items ?? [];
  } catch {
    return [];
  }
}
