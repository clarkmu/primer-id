import { splice } from "@prisma/client";
import Input from "../form/Input";
import { Dispatch, SetStateAction, useState } from "react";
import MyCollapse from "../form/MyCollapse";
import Button from "../form/Button";
import spliceConfigValues from "./spliceConfigValues.json";

const { strains, assays } = spliceConfigValues;

export default function SpliceConfig({
  spliceConfig,
  setSpliceConfig,
}: {
  spliceConfig: splice;
  setSpliceConfig: Dispatch<SetStateAction<splice>>;
}) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-lg font-bold self-center">Strain Config</div>
      <div className="flex space-around justify-around">
        {strains.map(({ label, value }) => (
          <Button
            key={`strain_${value}`}
            variant={spliceConfig.strain === value ? "primary" : "outlined"}
            onClick={() => setSpliceConfig({ ...spliceConfig, strain: value })}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="text-lg font-bold self-center">Splicing Assay Design</div>
      <div className="flex space-around justify-around">
        {assays.map(({ label, value }) => (
          <Button
            key={`assay_${value}`}
            variant={spliceConfig.assay === value ? "primary" : "outlined"}
            onClick={() => setSpliceConfig({ ...spliceConfig, assay: value })}
          >
            {label}
          </Button>
        ))}
      </div>
      <Button
        onClick={() => setShowAdvancedSettings((b) => !b)}
        variant={showAdvancedSettings ? "none" : "outlined"}
      >
        Advanced Settings
      </Button>
      <MyCollapse show={showAdvancedSettings} className="flex flex-col gap-6">
        <Input
          label="Distance"
          value={spliceConfig.distance}
          onChange={(e) =>
            setSpliceConfig({ ...spliceConfig, distance: e.target.value })
          }
          placeholder="Distance"
          type="number"
          min={0}
        />
        <Input
          label="HIV Sequence (optional)"
          value={spliceConfig.sequence}
          onChange={(e) =>
            setSpliceConfig({ ...spliceConfig, sequence: e.target.value })
          }
          placeholder="Sequence"
          tooltip="Provide a sequence to find donor and acceptor sequences."
        />
      </MyCollapse>
    </div>
  );
}
