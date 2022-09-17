import React from "react";
import Collapse from "@/components/form/Collapse";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import PRESET_PRIMERS from "@/utils/constants/PRESET_PRIMERS";
import Button from "@/components/form/Button";

export default function Presets({ SubmitPrimersButton }) {
  const { addPrimer, deletePrimerByRegion } = useTCSDRContext();

  const [added, setAdded] = React.useState([]);
  const regionInAdded = (r) => !!added.find((region) => region === r);

  return (
    <div className="flex flex-col gap-4">
      <div>Select one or more preset regions below:</div>
      <div className="flex justify-around">
        {PRESET_PRIMERS.map(({ region, ...primer }) => (
          <Button
            key={`preset_${region}`}
            color="secondary"
            variant={regionInAdded(region) ? "primary" : "outlined"}
            onClick={() => {
              if (regionInAdded(region)) {
                setAdded((a) => a.filter((r) => r !== region));
                deletePrimerByRegion(region);
              } else {
                addPrimer(primer);
                setAdded((a) => [...a, region]);
              }
            }}
          >
            {region}
          </Button>
        ))}
      </div>
      <Collapse open={added.length > 0}>
        <div className="font-lg text-lg text-center">
          You are using the following presets: {added.join(", ")}
        </div>
      </Collapse>
      <SubmitPrimersButton disabled={added.length === 0} />
    </div>
  );
}
