import { PLACES } from "../askwakefield-places-data.js";
export const identityText = (value: unknown) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const postcodeOf = (value: unknown) =>
  String(value || "")
    .toUpperCase()
    .match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/)?.[0]
    ?.replace(/\s/g, "") || null;
const aliases: Record<string, string> = {
  haus: "Haus Coffee & Plants",
  "haus coffee and plants": "Haus Coffee & Plants",
  "bob berts wakefield": "Bob & Berts, Trinity Walk",
  "caffe nero": "Caffé Nero, Trinity Walk",
};
export function resolvePlace(raw: any) {
  const name = identityText(raw.name || raw.title || raw.displayName?.text);
  const explicit = PLACES.find(
    (p) =>
      p.id === raw.id ||
      identityText(p.name) === name ||
      p.name === aliases[name],
  );
  const code = postcodeOf(raw.postcode || raw.address || raw.formattedAddress);
  if (
    explicit &&
    (!code || code === postcodeOf(explicit.postcode) || raw.id === explicit.id)
  )
    return explicit;
  return code
    ? PLACES.find(
        (p) =>
          identityText(p.name).split(" ").slice(0, 2).join(" ") ===
            name.split(" ").slice(0, 2).join(" ") &&
          code === postcodeOf(p.postcode),
      )
    : undefined;
}
