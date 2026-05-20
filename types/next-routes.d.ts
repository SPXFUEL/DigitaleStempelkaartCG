/**
 * Fallback-typing voor de globale `RouteContext<P>` die Next.js 16
 * normaal in `.next/types/` genereert tijdens `next build`. Onze CI draait
 * `tsc --noEmit` los van `next build`, dus dan zou de globale type ontbreken.
 *
 * Deze stub is ruim genoeg om elk dynamic-route-handler te typen zonder
 * de gegenereerde types tegen te werken — Next overschrijft de juiste
 * shape tijdens build en die wint van deze fallback.
 */

declare global {
  type RouteContext<_Path extends string = string> = {
    params: Promise<Record<string, string>>;
  };
}

export {};
