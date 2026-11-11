export function acceptsLibraryKeyDictionary(command: string): boolean {
  return /^\s*hf\s+mf\s+(?:autopwn|chk)\b/i.test(command);
}

export function hasKeyDictionary(command: string): boolean {
  return /(?:^|\s)-f(?:\s|=|$)/i.test(command);
}

export function appendKeyDictionary(command: string, path: string): string {
  const trimmed = command.trim();
  if (!acceptsLibraryKeyDictionary(trimmed) || hasKeyDictionary(trimmed) || !path.trim()) {
    return trimmed;
  }
  return `${trimmed} -f ${path}`;
}

export function libraryKeyDictionaryName(
  uid: string,
  mode: Exclude<LibraryKeyMode, "default"> = "all",
): string {
  const clean = uid.replace(/[^0-9A-F]/gi, "").toUpperCase();
  const scope = mode === "matching" ? "matching" : "library";
  return `hf-mf-${clean || "card"}-${scope}-keys.dic`;
}
export type LibraryKeyMode = "default" | "matching" | "all";

/** Sentinel source id meaning "every key in the Library", used by the HF strip's key-reuse dump. */
export const ALL_LIBRARY_KEYS_SOURCE = "__all__";

/**
 * A selectable set of keys for the HF strip's "try these keys" dump: either the
 * whole Library or one specific card/session's keys (so keys from another card
 * at the same installation can be tried against the card on the reader).
 */
export interface LibraryKeySource {
  /** Group id from {@link groupKeysBySource}, or {@link ALL_LIBRARY_KEYS_SOURCE}. */
  id: string;
  label: string;
  /** Optional origin detail (UID / source dump). */
  sublabel?: string;
  /** Count of distinct usable keys in this source. */
  count: number;
}

export function libraryKeyModeOptions(matchingCount: number, libraryCount: number) {
  return [
    { value: "default", label: "PM3 defaults" },
    { value: "matching", label: `Matching card (${matchingCount})` },
    { value: "all", label: `Entire Library (${libraryCount})` },
  ];
}
