import { splice } from "@prisma/client";
import Input from "../form/Input";
import { Dispatch, SetStateAction, useState } from "react";
import MyCollapse from "../form/MyCollapse";
import Button from "../form/Button";

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
      <div className="text-center">
        <span className=" underline">NL43</span> Consensus B
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
