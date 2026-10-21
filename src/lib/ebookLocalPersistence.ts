// Store complete books outside localStorage's small quota (generated images can be large).
const DATABASE = "real-creator-ebooks";
const STORE = "books";

async function withBooks<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
    transaction.onabort = () => { database.close(); reject(transaction.error); };
  });
}

export const readLocalEbooks = <T>() => withBooks<T[]>("readonly", store => store.getAll());
export const saveLocalEbook = <T extends { id: string }>(book: T) => withBooks("readwrite", store => store.put(book));
export const removeLocalEbook = (id: string) => withBooks("readwrite", store => store.delete(id));