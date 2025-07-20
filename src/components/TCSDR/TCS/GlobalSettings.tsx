import React from "react";
import PLATFORM_FORMATS from "@/utils/constants/PLATFORM_FORMATS";
import RadioGroup from "@/components/form/RadioGroup";
import Paper from "@/components/form/Paper";
import Input from "@/components/form/Input";
import { useTCS } from "@/contexts/TCSContext";

export default function GlobalSettings() {
  const {
    state: { errorRate, platformFormat },
    setState,
  } = useTCS();

  return (
    <Paper>
      <div className="flex flex-col gap-8 text-center items-center mb-4 my-2">
        <RadioGroup
          row={true}
          label="MiSeq Format"
          value={platformFormat}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              platformFormat: parseInt(e.target.value),
            }))
          }
          radios={PLATFORM_FORMATS}
          data-cy="miseq-radio-input"
          uniqueKey="platformFormat"
        />
        <Input
          label="Platform Error Rate"
          tooltip="Estimated raw sequence error rate"
          data-cy="errorRate"
          value={errorRate}
          onChange={(v) =>
            setState((s) => ({ ...s, errorRate: parseFloat(v.target.value) }))
          }
          type="number"
          step={0.01}
        />
      </div>
    </Paper>
  );
}
