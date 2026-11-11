import { useMemo, useState } from "react";
import { CreditCard, FileSearch, ListTree, PlayCircle, ScanLine, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PanelHeader } from "@/components/panels/shared/PanelHeader";
import { PanelSection } from "@/components/panels/shared/PanelSection";
import { cn } from "@/lib/utils";

interface EmvPanelProps {
  onCommand: (cmd: string) => void;
  disabled?: boolean;
}

type Interface = "contactless" | "contact";
type TxnType = "msd" | "qvsdc" | "cda";

const TXN_LABEL: Record<TxnType, string> = {
  msd: "MSD",
  qvsdc: "qVSDC / M-Chip",
  cda: "qVSDC + CDA",
};

/** Default file the `emv scan` output is written to inside the WASM virtual FS. */
const SCAN_FILE = "emv_scan.json";

/**
 * EMV / contactless payment card panel.
 *
 * The Proxmark client already ships the full `emv` command family and its
 * `emv_defparams.json` terminal profile, but the web UI never surfaced it. This
 * panel exposes the useful shortcuts — identify, enumerate applications, run a
 * full transaction, dump to JSON, and the ROCA weak-key test — and folds the
 * common flags (interface, transaction type, APDU trace, TLV decode, terminal
 * params) into the command string so a tap issues the right thing.
 *
 * Everything here is read-only against the card: no key is written and no
 * payment is authorised. A full PAN and Track-2 appear in the terminal output,
 * so treat the log as sensitive.
 */
export function EmvPanel({ onCommand, disabled = false }: EmvPanelProps) {
  const [iface, setIface] = useState<Interface>("contactless");
  const [txn, setTxn] = useState<TxnType>("qvsdc");
  const [tlv, setTlv] = useState(true);
  const [apdu, setApdu] = useState(false);
  const [params, setParams] = useState(true);

  // Flags shared by the record-reading commands (reader/search/exec/scan).
  const flags = useMemo(() => {
    const f: string[] = [];
    if (iface === "contact") f.push("-w");
    if (tlv) f.push("-t");
    if (apdu) f.push("-a");
    return f;
  }, [iface, tlv, apdu]);

  const run = (base: string, extra: string[] = []) => {
    const parts = [base, ...flags, ...extra].filter(Boolean);
    onCommand(parts.join(" "));
  };

  const runExec = () => {
    const extra: string[] = ["-s"];
    if (params) extra.push("-j");
    if (txn === "qvsdc") extra.push("--qvsdc");
    else if (txn === "cda") extra.push("-c");
    run("emv exec", extra);
  };

  const runScan = () => {
    const extra: string[] = ["-e"];
    if (params) extra.push("-j");
    if (txn === "qvsdc") extra.push("--qvsdc");
    else if (txn === "cda") extra.push("-c");
    // Scan takes the output filename as a positional argument, last.
    run("emv scan", [...extra, SCAN_FILE]);
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        icon={CreditCard}
        title="EMV / Payment"
        tag="Contactless"
        actions={
          <Button
            size="sm"
            variant="default"
            className="gap-1"
            disabled={disabled}
            onClick={() => run("emv reader", ["-v"])}
          >
            <CreditCard className="h-3 w-3" />
            Read Card
          </Button>
        }
      />
      <CardContent className="flex-1 space-y-4 overflow-auto p-4">
        {/* Options fold into every command below. */}
        <PanelSection title="Options" icon={<CreditCard className="h-3 w-3" />}>
          <div className="space-y-3">
            <ToggleRow
              label="Interface"
              options={[
                { value: "contactless", label: "Contactless" },
                { value: "contact", label: "Contact (7816)" },
              ]}
              value={iface}
              onChange={(v) => setIface(v as Interface)}
              disabled={disabled}
            />
            <ToggleRow
              label="Transaction"
              options={[
                { value: "msd", label: "MSD" },
                { value: "qvsdc", label: "qVSDC" },
                { value: "cda", label: "CDA" },
              ]}
              value={txn}
              onChange={(v) => setTxn(v as TxnType)}
              disabled={disabled}
            />
            <div className="flex flex-wrap gap-2">
              <TogglePill label="TLV decode" active={tlv} onClick={() => setTlv((v) => !v)} disabled={disabled} />
              <TogglePill label="APDU trace" active={apdu} onClick={() => setApdu((v) => !v)} disabled={disabled} />
              <TogglePill
                label="Terminal params (-j)"
                active={params}
                onClick={() => setParams((v) => !v)}
                disabled={disabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Terminal params load <code>emv_defparams.json</code>; leave on if a transaction fails at
              GPO with "conditions of use not satisfied".
            </p>
          </div>
        </PanelSection>

        <PanelSection title="Identify" icon={<FileSearch className="h-3 w-3" />}>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={<CreditCard className="h-3 w-3" />} label="Reader" onClick={() => run("emv reader")} disabled={disabled} />
            <ActionButton icon={<CreditCard className="h-3 w-3" />} label="Reader (logs)" onClick={() => run("emv reader", ["-v"])} disabled={disabled} />
            <ActionButton icon={<ListTree className="h-3 w-3" />} label="PPSE Directory" onClick={() => run("emv pse", ["-s", "-2"])} disabled={disabled} />
            <ActionButton icon={<FileSearch className="h-3 w-3" />} label="Search Applets" onClick={() => run("emv search", ["-s"])} disabled={disabled} />
          </div>
        </PanelSection>

        <PanelSection title="Read / Transaction" icon={<PlayCircle className="h-3 w-3" />}>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              icon={<PlayCircle className="h-3 w-3" />}
              label={`Transaction (${TXN_LABEL[txn]})`}
              onClick={runExec}
              disabled={disabled}
              variant="default"
              className="col-span-2"
            />
            <ActionButton icon={<ScanLine className="h-3 w-3" />} label="Scan → JSON" onClick={runScan} disabled={disabled} className="col-span-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            Scan writes <code>{SCAN_FILE}</code> to the client's virtual filesystem (emulator-ready).
          </p>
        </PanelSection>

        <PanelSection title="Security Tests" icon={<ShieldAlert className="h-3 w-3" />}>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={<ShieldAlert className="h-3 w-3" />} label="ROCA Weak-Key" onClick={() => run("emv roca")} disabled={disabled} />
            <ActionButton icon={<ShieldAlert className="h-3 w-3" />} label="Crypto Self-Test" onClick={() => onCommand("emv test")} disabled={disabled} />
          </div>
          <p className="text-xs text-muted-foreground">
            Read-only: no keys are written and no payment is authorised. Output contains the full PAN
            and Track-2 — treat the log as sensitive.
          </p>
        </PanelSection>
      </CardContent>
    </Card>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline";
  className?: string;
}

function ActionButton({ icon, label, onClick, disabled, variant = "outline", className }: ActionButtonProps) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} disabled={disabled} className={cn("gap-1", className)}>
      {icon}
      {label}
    </Button>
  );
}

interface ToggleRowProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ToggleRow({ label, options, value, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <TogglePill
            key={opt.value}
            label={opt.label}
            active={value === opt.value}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface TogglePillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function TogglePill({ label, active, onClick, disabled }: TogglePillProps) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
      className="h-7 px-2.5 text-xs"
    >
      {label}
    </Button>
  );
}

export default EmvPanel;
