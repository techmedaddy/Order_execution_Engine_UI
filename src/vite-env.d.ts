/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables
 * This ensures TypeScript recognizes import.meta.env properties
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
