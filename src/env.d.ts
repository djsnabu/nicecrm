/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_POCKETBASE_URL: string;
  /** "admin" (default) or "users" – users = pb.collection(name).authWithPassword */
  readonly PUBLIC_POCKETBASE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
