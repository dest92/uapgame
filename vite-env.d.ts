/// <reference types="vite/client" />

declare module 'virtual:hero-assets' {
  /** Mapa osmKey (p.ej. "way-388495172") → URL del GLB hero. */
  const heroAssets: Readonly<Record<string, string>>;
  export default heroAssets;
}
