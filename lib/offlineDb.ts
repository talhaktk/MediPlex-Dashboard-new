// IndexedDB cache for offline patient record access
const DB_NAME    = 'mediplex-offline';
const DB_VERSION = 2; // bumped: added lab_orders, lab_results, prescriptions stores

type Store = 'appointments' | 'patients' | 'sync_meta' | 'lab_orders' | 'lab_results' | 'prescriptions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('appointments'))  db.createObjectStore('appointments',  { keyPath: 'id' });
      if (!db.objectStoreNames.contains('patients'))      db.createObjectStore('patients',      { keyPath: 'mr_number' });
      if (!db.objectStoreNames.contains('sync_meta'))     db.createObjectStore('sync_meta',     { keyPath: 'key' });
      if (!db.objectStoreNames.contains('lab_orders'))    db.createObjectStore('lab_orders',    { keyPath: 'id' });
      if (!db.objectStoreNames.contains('lab_results'))   db.createObjectStore('lab_results',   { keyPath: 'id' });
      if (!db.objectStoreNames.contains('prescriptions')) db.createObjectStore('prescriptions', { keyPath: 'id' });
    };
    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => reject(req.error);
  });
}

export async function cacheList(store: Store, items: any[]): Promise<void> {
  if (typeof window === 'undefined' || !items?.length) return;
  try {
    const db = await openDb();
    const tx = db.transaction(store, 'readwrite');
    const s  = tx.objectStore(store);
    items.forEach(item => s.put(item));
  } catch {}
}

export async function getCached(store: Store): Promise<any[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => resolve([]);
    });
  } catch { return []; }
}

export async function setSyncMeta(key: string, value: any): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    const tx = db.transaction('sync_meta', 'readwrite');
    tx.objectStore('sync_meta').put({ key, value });
  } catch {}
}

export async function getSyncMeta(key: string): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx  = db.transaction('sync_meta', 'readonly');
      const req = tx.objectStore('sync_meta').get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}
