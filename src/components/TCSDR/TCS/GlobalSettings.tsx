import React from "react";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import PLATFORM_FORMATS from "@/utils/constants/PLATFORM_FORMATS";
import RadioGroup from "@/components/form/RadioGroup";
import Paper from "@/components/form/Paper";
import Input from "@/components/form/Input";

export default function GlobalSettings() {
  const {
    state: {
      pipeline: { errorRate, platformFormat },
    },
    editPipeline,
  } = useTCSDRContext();

  return (
    <Paper>
      <div className="flex flex-col gap-8 text-center items-center mb-4 my-2">
        <RadioGroup
          row={true}
          label="MiSeq Format"
          value={platformFormat}
          onChange={(e) =>
            editPipeline({ platformFormat: parseInt(e.target.value) })
          }
          radios={PLATFORM_FORMATS}
          error={false}
          data-cy="miseq-radio-input"
        />
        <Input
          label="Platform Error Rate"
          tooltip="Estimated raw sequence error rate"
          name="errorRate"
          value={errorRate}
          onChange={(v) => editPipeline({ errorRate: v.target.value })}
          type="number"
          step={0.01}
        />
      </div>
    </Paper>
  );
}
