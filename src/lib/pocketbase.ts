import PocketBase from 'pocketbase';

let pb: PocketBase | null = null;

export function getPocketBase(): PocketBase {
  if (!pb) {
    let raw = import.meta.env.PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';
    raw = raw.replace(/\/$/, '');
    if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`;
    pb = new PocketBase(raw);
  }
  return pb;
}

export function isAuthenticated(): boolean {
  return getPocketBase().authStore.isValid;
}

export function clearAuth(): void {
  getPocketBase().authStore.clear();
}
