import Collapse from "@/components/form/Collapse";
import Input from "@/components/form/Input";
import RadioGroup from "@/components/form/RadioGroup";
import Switch from "@/components/form/Switch";
import { usePrimerContext } from "@/contexts/PrimerContext";
import GENOMES from "@/utils/constants/GENOMES";

export default function Trim() {
  const { primer, updatePrimer, errors } = usePrimerContext();

  return (
    <div className="flex flex-col gap-4" data-cy="trimContainer">
      <Switch
        checked={primer.trim}
        onChange={(e) => updatePrimer("trim", !!e)}
        tooltip="Use reference coordinates to trim the TCS."
        title="Need trimming to a reference genome?"
        data-cy="trim"
      />
      <Collapse open={primer.trim}>
        <div className="flex flex-col gap-4">
          <RadioGroup
            label="Choose reference genome:"
            value={primer.trimGenome}
            error={errors.trimGenome}
            onChange={(e) => updatePrimer("trimGenome", e.target.value)}
            radios={GENOMES}
            uniqueKey="trim_refGenome"
          />
          <Input
            label="reference 5'end ref position or positon range, 0 if no need to match this end"
            value={primer.trimStart}
            onChange={(e) => updatePrimer("trimStart", e.target.value.trim())}
            error={errors.trimStart}
            data-cy="trimStart"
          />
          <Input
            label="reference 3'end ref position or positon range, 0 if no need to match this end"
            value={primer.trimEnd}
            onChange={(e) => updatePrimer("trimEnd", e.target.value.trim())}
            error={errors.trimEnd}
            data-cy="trimEnd"
          />
        </div>
      </Collapse>
    </div>
  );
}
