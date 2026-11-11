import { describe, expect, it } from "@voidzero-dev/vite-plus-test";
import type { KeyGroup, StoredKey } from "@/components/panels/library/types";
import {
  buildKeyOwnerIndex,
  describeKeyOrigin,
  formatKeyUsageTable,
  parseChkKeyTable,
} from "./libraryDumpReport";

function key(value: string): StoredKey {
  return {
    id: value,
    label: value,
    value,
    kind: "private",
    uidFilter: "",
    createdAt: 0,
    updatedAt: 0,
  };
}

const CHK_OUTPUT = [
  "[=] Start check for keys...",
  "[+] found keys:",
  "[+] -----+-----+--------------+---+--------------+----",
  "[+]  Sec | Blk | key A        |res| key B        |res",
  "[+] -----+-----+--------------+---+--------------+----",
  "[+]  000 | 003 | A0A1A2A3A4A5 | 1 | ------------ | 0 ",
  "[+]  001 | 007 | FFFFFFFFFFFF | 1 | FFFFFFFFFFFF | 1 ",
  "[+]  002 | 011 | ------------ | 0 | ------------ | 0 ",
  "[+] -----+-----+--------------+---+--------------+----",
];

describe("parseChkKeyTable", () => {
  it("extracts keys only where res is 1", () => {
    const rows = parseChkKeyTable(CHK_OUTPUT);
    expect(rows).toEqual([
      { sector: 0, keyA: "A0A1A2A3A4A5", keyB: null },
      { sector: 1, keyA: "FFFFFFFFFFFF", keyB: "FFFFFFFFFFFF" },
      { sector: 2, keyA: null, keyB: null },
    ]);
  });

  it("ignores the header and rule lines", () => {
    expect(parseChkKeyTable(["[+]  Sec | Blk | key A        |res| key B        |res"])).toEqual([]);
  });
});

describe("buildKeyOwnerIndex / describeKeyOrigin", () => {
  const groups: KeyGroup[] = [
    { id: "g1", title: "DE442730", subtitle: "", uid: "", sourceDumpId: null, kind: "card", keys: [key("A0A1A2A3A4A5")] },
  ];
  const index = buildKeyOwnerIndex(groups);

  it("labels a library key with its source card", () => {
    expect(describeKeyOrigin("A0A1A2A3A4A5", index, false)).toEqual({
      key: "A0A1A2A3A4A5",
      origin: "DE442730",
    });
  });

  it("labels an unindexed found key as a default, or recovered when defaults skipped", () => {
    expect(describeKeyOrigin("FFFFFFFFFFFF", index, false).origin).toBe("PM3 default");
    expect(describeKeyOrigin("FFFFFFFFFFFF", index, true).origin).toBe("recovered");
  });

  it("labels a missing key as not found", () => {
    expect(describeKeyOrigin(null, index, false)).toEqual({ key: "------------", origin: "not found" });
  });
});

describe("formatKeyUsageTable", () => {
  it("renders a header, per-sector rows and a summary", () => {
    const index = buildKeyOwnerIndex([
      { id: "g1", title: "DE442730", subtitle: "", uid: "", sourceDumpId: null, kind: "card", keys: [key("A0A1A2A3A4A5")] },
    ]);
    const lines = formatKeyUsageTable(parseChkKeyTable(CHK_OUTPUT), index, {
      sourceLabel: "DE442730",
      skipDefaults: false,
    });
    const text = lines.join("\n");
    expect(text).toContain("source: DE442730");
    expect(text).toContain("A0A1A2A3A4A5");
    expect(text).toContain("DE442730");
    expect(text).toContain("Opened 2/3 sectors with key A, 1/3 with key B");
  });
});
