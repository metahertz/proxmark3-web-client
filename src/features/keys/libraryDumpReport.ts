import type { KeyGroup } from "@/components/panels/library/types";

/** One sector's recovered keys, parsed from `hf mf chk`'s result table. */
export interface SectorKeys {
  sector: number;
  /** 12-hex Key A, or null if `res` was 0 (not found). */
  keyA: string | null;
  /** 12-hex Key B, or null if `res` was 0 (not found). */
  keyB: string | null;
}

// A row of `hf mf chk`'s table (ANSI already stripped), tolerant of the log
// prefix: " 000 | 003 | A0A1A2A3A4A5 | 1 | ------------ | 0".
const ROW = /(\d{1,3})\s*\|\s*\d+\s*\|\s*([0-9A-Fa-f]{12}|-{12})\s*\|\s*([01])\s*\|\s*([0-9A-Fa-f]{12}|-{12})\s*\|\s*([01])/;

/**
 * Parse the per-sector key table `hf mf chk` prints. A key is reported only when
 * its `res` flag is 1, so a default-key hit and an unrecovered sector are never
 * confused (both would otherwise read as FFFFFFFFFFFF).
 */
export function parseChkKeyTable(outputLines: string[]): SectorKeys[] {
  const rows: SectorKeys[] = [];
  for (const line of outputLines) {
    const m = ROW.exec(line);
    if (!m) continue;
    const [, sec, keyA, resA, keyB, resB] = m;
    rows.push({
      sector: Number.parseInt(sec, 10),
      keyA: resA === "1" && keyA[0] !== "-" ? keyA.toUpperCase() : null,
      keyB: resB === "1" && keyB[0] !== "-" ? keyB.toUpperCase() : null,
    });
  }
  return rows.sort((a, b) => a.sector - b.sector);
}

/** Map each known key value to the Library card/session titles that hold it. */
export function buildKeyOwnerIndex(groups: KeyGroup[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const group of groups) {
    for (const key of group.keys) {
      const value = key.value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
      if (value.length !== 12) continue;
      const owners = index.get(value) ?? [];
      if (!owners.includes(group.title)) owners.push(group.title);
      index.set(value, owners);
    }
  }
  return index;
}

/**
 * Label where a recovered key came from. A found key was either in the Library
 * dictionary we supplied (→ its source card) or one of the client's built-in
 * default keys (→ "PM3 default"); with defaults skipped, the only source is the
 * Library, so an unindexed value is just "recovered".
 */
export function describeKeyOrigin(
  value: string | null,
  ownerIndex: Map<string, string[]>,
  skipDefaults: boolean,
): { key: string; origin: string } {
  if (!value) return { key: "------------", origin: "not found" };
  const owners = ownerIndex.get(value);
  if (owners && owners.length > 0) return { key: value, origin: owners.join(", ") };
  return { key: value, origin: skipDefaults ? "recovered" : "PM3 default" };
}

/**
 * Render the per-sector "which key unlocked what" table as terminal lines
 * (no ANSI). Each line maps a dump sector to the Key A / Key B that opened it
 * and where that key came from.
 */
export function formatKeyUsageTable(
  sectors: SectorKeys[],
  ownerIndex: Map<string, string[]>,
  opts: { sourceLabel: string; skipDefaults: boolean },
): string[] {
  const rows = sectors.map((s) => {
    const a = describeKeyOrigin(s.keyA, ownerIndex, opts.skipDefaults);
    const b = describeKeyOrigin(s.keyB, ownerIndex, opts.skipDefaults);
    return {
      sec: String(s.sector).padStart(3, " "),
      keyA: a.key,
      fromA: a.origin,
      keyB: b.key,
      fromB: b.origin,
    };
  });

  const fromAW = Math.max(6, ...rows.map((r) => r.fromA.length));
  const fromBW = Math.max(6, ...rows.map((r) => r.fromB.length));
  const openA = rows.filter((r) => r.keyA[0] !== "-").length;
  const openB = rows.filter((r) => r.keyB[0] !== "-").length;

  const header = `Sec | Key A        | ${"from".padEnd(fromAW)} | Key B        | ${"from".padEnd(fromBW)}`;
  const rule = "-".repeat(header.length);
  const lines = [
    `Key usage for this dump — source: ${opts.sourceLabel}${opts.skipDefaults ? ", defaults skipped" : ""}`,
    rule,
    header,
    rule,
    ...rows.map(
      (r) =>
        `${r.sec} | ${r.keyA} | ${r.fromA.padEnd(fromAW)} | ${r.keyB} | ${r.fromB.padEnd(fromBW)}`,
    ),
    rule,
    `Opened ${openA}/${sectors.length} sectors with key A, ${openB}/${sectors.length} with key B`,
  ];
  return lines;
}
