import { config } from "@/lib/config";

/**
 * Plausible analytics. Cookieloos en AVG-vriendelijk — geen banner nodig.
 * Wordt alleen ingeladen als NEXT_PUBLIC_PLAUSIBLE_DOMAIN gezet is.
 *
 * Self-hosten? Zet ook NEXT_PUBLIC_PLAUSIBLE_SRC naar je eigen script-url.
 */
export default function Plausible() {
  if (!config.plausibleDomain) return null;
  return (
    <script
      defer
      data-domain={config.plausibleDomain}
      src={config.plausibleSrc}
    />
  );
}
