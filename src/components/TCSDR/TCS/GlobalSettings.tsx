import React from "react";
import PLATFORM_FORMATS from "@/utils/constants/PLATFORM_FORMATS";
import RadioGroup from "@/components/form/RadioGroup";
import Paper from "@/components/form/Paper";
import Slider from "@/components/form/Slider";
import { useTCS } from "@/contexts/TCSContext";

export default function GlobalSettings() {
  const {
    state: { errorRate, platformFormat },
    setState,
  } = useTCS();

  return (
    <Paper>
      <div className="flex flex-col gap-12 text-center items-center mb-4 my-2">
        <RadioGroup
          direction="row"
          wrap
          wrapClassName="basis-1/3 min-w-[180px]"
          label="MiSeq Format"
          value={platformFormat}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              platformFormat: parseInt(e.target.value, 10),
            }))
          }
          radios={PLATFORM_FORMATS}
          data-cy="miseq-radio-input"
          uniqueKey="platformFormat"
        />
        <Slider
          label="Platform Error Rate"
          min={0.02}
          max={0.05}
          step={0.01}
          value={errorRate}
          onChange={(newValue) =>
            setState((s) => ({ ...s, errorRate: newValue }))
          }
          minLabel="0.02"
          maxLabel="0.05"
          showValueBadge
          dataCy="errorRateSlider"
        />
      </div>
    </Paper>
  );
}
