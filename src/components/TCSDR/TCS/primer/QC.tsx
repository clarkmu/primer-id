import Checkbox from "@/components/form/Checkbox";
import Collapse from "@/components/form/Collapse";
import Input from "@/components/form/Input";
import RadioGroup from "@/components/form/RadioGroup";
import Switch from "@/components/form/Switch";
import { usePrimerContext } from "@/contexts/PrimerContext";
import GENOMES from "@/utils/constants/GENOMES";

export default function QC() {
  const { primer, updatePrimer, errors } = usePrimerContext();

  return (
    <div className="flex flex-col gap-2 p-4">
      <Switch
        checked={primer.qc}
        onChange={(e) => updatePrimer("qc", !!e)}
        tooltip="Use reference coordinates for QC."
        title="Need QC for TCS?(support for HIV-1 and SIV)?"
      />
      <Collapse open={primer.qc}>
        <div className="flex flex-col gap-2">
          <RadioGroup
            label="Choose reference genome:"
            value={primer.refGenome}
            error={errors.refGenome}
            onChange={(e) => updatePrimer("refGenome", e.target.value)}
            radios={GENOMES}
          />
          <Input
            label="reference 5'end ref position or positon range, 0 if no need to match this end"
            value={primer.refStart}
            onChange={(e) => updatePrimer("refStart", e.target.value.trim())}
            error={errors.refStart}
          />
          <Input
            label="reference 3'end ref position or positon range, 0 if no need to match this end"
            value={primer.refEnd}
            onChange={(e) => updatePrimer("refEnd", e.target.value.trim())}
            error={errors.refEnd}
          />
          <Checkbox
            id={`primer_${primer.region}`}
            label="Allow indels?"
            tooltip="If indels are not allowed TCS with indels when aligned with reference genomes will be discarded."
            checked={!!primer.allowIndels}
            onChange={(v) => updatePrimer("allowIndels", v)}
          />
        </div>
      </Collapse>
    </div>
  );
}
