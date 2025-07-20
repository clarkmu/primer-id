import Collapse from "@/components/form/Collapse";
import Input from "@/components/form/Input";
import RadioGroup from "@/components/form/RadioGroup";
import Switch from "@/components/form/Switch";
import { usePrimerContext } from "@/contexts/PrimerContext";

export default function EndJoin() {
  const { primer, updatePrimer, errors } = usePrimerContext();

  return (
    <div className="flex flex-col gap-8 p-8">
      <Switch
        checked={primer.endJoin}
        onChange={(e) => updatePrimer("endJoin", !!e)}
        tooltip="End-join for TCS."
        title="End-join?"
        data-cy="endJoin"
      />
      <Collapse open={primer.endJoin}>
        <RadioGroup
          label="End Join"
          uniqueKey="endJoinOption"
          showLabel={false}
          value={primer.endJoinOption}
          error={errors.endJoinOption}
          onChange={(e) =>
            updatePrimer("endJoinOption", parseInt(e.target.value))
          }
          radios={[
            "Simple join, no overlap",
            "Known overlap",
            "Unknow overlap, use sample consensus to determine overlap, all sequence pairs have same overlap",
            "Unknow overlap, determine overlap by individual sequence pairs, sequence pairs can have different overlap",
          ].map((overlap, i) => ({
            value: i + 1,
            label: `${i + 1}) ${overlap}`,
          }))}
        />
      </Collapse>
      <Collapse open={primer.endJoinOption === 2}>
        <Input
          label="Overlap Bases"
          tooltip="The length of R1 and R2 TCS overlapping."
          value={primer.endJoinOverlap}
          onChange={(e) =>
            updatePrimer("endJoinOverlap", e.target.value.trim())
          }
          error={errors.endJoinOverlap}
          data-cy="endJoinOverlap"
        />
      </Collapse>
    </div>
  );
}
