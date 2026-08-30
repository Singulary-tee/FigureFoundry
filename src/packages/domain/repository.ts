import { FigureState, ProvenanceEvent } from '../../types';

const DB_NAME = 'FigureFoundryDB';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const PROVENANCE_STORE = 'provenance_events';

export class IndexedDbRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available in current environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PROVENANCE_STORE)) {
          db.createObjectStore(PROVENANCE_STORE, { keyPath: 'eventId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public async saveSnapshot(state: FigureState): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
      const store = tx.objectStore(SNAPSHOT_STORE);
      await new Promise<void>((resolve, reject) => {
        const req = store.put({ id: 'latest_state', state, updatedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {}
  }

  public async loadLatestSnapshot(): Promise<FigureState | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
      const store = tx.objectStore(SNAPSHOT_STORE);
      return await new Promise<FigureState | null>((resolve, reject) => {
        const req = store.get('latest_state');
        req.onsuccess = () => {
          if (req.result && req.result.state) {
            resolve(req.result.state);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return null;
    }
  }

  public async appendProvenanceEvent(event: ProvenanceEvent): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(PROVENANCE_STORE, 'readwrite');
      const store = tx.objectStore(PROVENANCE_STORE);
      await new Promise<void>((resolve, reject) => {
        const req = store.put(event);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {}
  }
}
