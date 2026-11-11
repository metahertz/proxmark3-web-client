import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Ban, Eye, KeyRound, Search } from "lucide-react";
import type { LibraryKeySource } from "@/features/keys/libraryKeyCommands";
import { ALL_LIBRARY_KEYS_SOURCE } from "@/features/keys/libraryKeyCommands";
import { HF_CARD_OPERATIONS, HF_CARD_TYPES, getIcon } from "../config";
import { RibbonStrip, RibbonDivider, RibbonGroup, RibbonButton } from "../primitives";

interface HFTabProps {
  commandsEnabled: boolean;
  selectedHFCardType: string;
  onSelectedHFCardTypeChange: (value: string) => void;
  onCommand: (cmd: string) => void;
  /** Try dumping the card with a chosen Library key source (a card, or all). */
  onDumpWithLibraryKeys?: (sourceId: string, options?: { skipDefaults?: boolean }) => void;
  /** Selectable key sources: whole Library plus each saved card/session. */
  libraryKeySources?: LibraryKeySource[];
}

export function HFTab({
  commandsEnabled,
  selectedHFCardType,
  onSelectedHFCardTypeChange,
  onCommand,
  onDumpWithLibraryKeys,
  libraryKeySources = [],
}: HFTabProps) {
  const [keySourceId, setKeySourceId] = useState<string>(ALL_LIBRARY_KEYS_SOURCE);
  const [skipDefaults, setSkipDefaults] = useState(false);
  const selectedSource =
    libraryKeySources.find((source) => source.id === keySourceId) ?? libraryKeySources[0];
  const activeSourceId = selectedSource?.id ?? ALL_LIBRARY_KEYS_SOURCE;
  const sourceKeyCount = selectedSource?.count ?? 0;
  const keySourceOptions = libraryKeySources.map((source) => ({
    value: source.id,
    label: `${source.label} (${source.count})`,
  }));
  return (
    <RibbonStrip>
      <RibbonGroup title="Search">
        <RibbonButton
          icon={<Search />}
          label="Search"
          onClick={() => onCommand("hf search")}
          disabled={!commandsEnabled}
          variant="default"
        />
        <RibbonButton
          icon={<Search />}
          label="14A Info"
          onClick={() => onCommand("hf 14a info")}
          disabled={!commandsEnabled}
        />
        <RibbonButton
          icon={<Eye />}
          label="Sniff"
          onClick={() => onCommand("hf sniff")}
          disabled={!commandsEnabled}
        />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup title="Card Type">
        <Select
          value={selectedHFCardType}
          onValueChange={onSelectedHFCardTypeChange}
          options={HF_CARD_TYPES}
          className="w-40"
          size="sm"
        />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup
        title={
          HF_CARD_TYPES.find((card) => card.value === selectedHFCardType)?.label || "Operations"
        }
      >
        {(HF_CARD_OPERATIONS[selectedHFCardType] || []).map((op) => (
          <RibbonButton
            key={op.label}
            icon={getIcon(op.icon)}
            label={op.label}
            onClick={() => onCommand(op.command)}
            disabled={!commandsEnabled}
            variant={op.variant || "outline"}
          />
        ))}
      </RibbonGroup>

      <RibbonDivider />

      {/* MIFARE Classic key reuse: pick a key source (the whole Library, or one
          specific card — e.g. another card from the same installation) and try
          those keys against the card on the reader. Check-only dump, so it reads
          what the reused keys unlock without a full key-recovery run. */}
      <RibbonGroup title="Library Keys">
        <Select
          value={activeSourceId}
          onValueChange={setKeySourceId}
          options={keySourceOptions}
          className="w-52"
          size="sm"
          disabled={libraryKeySources.length === 0}
        />
        <RibbonButton
          icon={<KeyRound />}
          label="Try Keys → Dump"
          onClick={() => onDumpWithLibraryKeys?.(activeSourceId, { skipDefaults })}
          disabled={!commandsEnabled || !onDumpWithLibraryKeys || sourceKeyCount === 0}
          title={
            sourceKeyCount > 0
              ? `Try ${sourceKeyCount} key${sourceKeyCount === 1 ? "" : "s"} from "${selectedSource?.label}" against this card (check-only dump, no cracking)`
              : "No keys saved in the Library yet — dump or Autopwn a card first"
          }
        />
        <RibbonButton
          icon={<Ban />}
          label="Skip defaults"
          onClick={() => setSkipDefaults((value) => !value)}
          variant={skipDefaults ? "default" : "outline"}
          title={
            skipDefaults
              ? "Skipping the client's built-in default keys — only the selected source's keys are tried"
              : "Also trying the client's 64 built-in default keys (click to try only the selected source's keys)"
          }
        />
      </RibbonGroup>
    </RibbonStrip>
  );
}

export default HFTab;
