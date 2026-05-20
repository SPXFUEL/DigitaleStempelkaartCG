/**
 * Offline-queue voor de barista-scanner. Bij wifi-storing worden stempel-
 * acties in IndexedDB opgeslagen en automatisch opnieuw gespeeld zodra het
 * netwerk terug is.
 *
 * Bewust simpel gehouden: één IDB store, FIFO, geen background-sync API
 * (die werkt niet betrouwbaar genoeg op iOS PWAs). De UI luistert naar
 * `online`-events en spoelt de queue dan handmatig leeg.
 */

const DB_NAME = "cg-offline";
const STORE = "queue";
const DB_VERSION = 1;

export interface QueuedAction {
  id?: number;
  /** Welke endpoint. */
  endpoint: "/api/stamp" | "/api/redeem" | "/api/redeem-birthday";
  body: Record<string, unknown>;
  /** ISO-timestamp van toevoeging. */
  queuedAt: string;
  /** Aantal mislukte replay-pogingen. */
  attempts: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(
  item: Omit<QueuedAction, "id" | "queuedAt" | "attempts">
): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      ...item,
      queuedAt: new Date().toISOString(),
      attempts: 0,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listQueued(): Promise<QueuedAction[]> {
  const db = await open();
  const items = await new Promise<QueuedAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedAction[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items;
}

export async function remove(id: number): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function markAttempt(id: number, attempts: number): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as QueuedAction | undefined;
      if (item) {
        item.attempts = attempts;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Speelt de queue af. Returnt { drained, failed }. Mislukte items met
 * < MAX_ATTEMPTS blijven staan; daarboven gooien we 'm weg om geen
 * eindeloze retry-loop te krijgen.
 */
const MAX_ATTEMPTS = 5;

export async function drain(): Promise<{
  drained: number;
  failed: number;
  remaining: number;
}> {
  let drained = 0;
  let failed = 0;
  const items = await listQueued();
  for (const item of items) {
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        if (item.id !== undefined) await remove(item.id);
        drained++;
        continue;
      }
      // 4xx anders dan 401/429 = blijvende fout (geen klant, dubbele actie etc).
      // Geen retry — laat 'm vallen en log.
      if (
        res.status >= 400 &&
        res.status < 500 &&
        res.status !== 401 &&
        res.status !== 429
      ) {
        if (item.id !== undefined) await remove(item.id);
        failed++;
        continue;
      }
      // 5xx / netwerk → retry
      if (item.id !== undefined) {
        const nextAttempts = (item.attempts ?? 0) + 1;
        if (nextAttempts >= MAX_ATTEMPTS) {
          await remove(item.id);
          failed++;
        } else {
          await markAttempt(item.id, nextAttempts);
        }
      }
    } catch {
      // Offline / fetch threw — laat 'm staan, probeer later.
      if (item.id !== undefined) {
        const nextAttempts = (item.attempts ?? 0) + 1;
        if (nextAttempts >= MAX_ATTEMPTS) {
          await remove(item.id);
          failed++;
        } else {
          await markAttempt(item.id, nextAttempts);
        }
      }
    }
  }
  const remaining = (await listQueued()).length;
  return { drained, failed, remaining };
}
