import Input from "@/components/form/Input";
import { usePrimerContext } from "@/contexts/PrimerContext";

export default function Region() {
  const { primer, updatePrimer, errors } = usePrimerContext();

  return (
    <div className="flex flex-col gap-16 p-8">
      <div className="flex gap-8">
        <Input
          label="Region"
          tooltip="Name for the target sequencing region."
          value={primer.region}
          onChange={(e) => updatePrimer("region", e.target.value.trim())}
          error={errors.region}
          data-cy="region"
        />
        <Input
          label="Supermajority Cut Off"
          type="number"
          min={0.5}
          max={0.9}
          step={0.1}
          tooltip={
            <>
              Cut-off for creating consensus sequences.
              <br />
              {`0.5: simple majority, > 0.5: supermajority`}
            </>
          }
          value={primer.supermajority}
          onChange={(e) => updatePrimer("supermajority", e.target.value.trim())}
          error={errors.supermajority}
          data-cy="supermajority"
        />
      </div>
      <Input
        textArea={true}
        value={primer.forward}
        label="Forward Primer Sequence"
        tooltip="The entire forward primer for 1st round PCR, including adaptor sequences and random bases."
        onChange={(e) =>
          updatePrimer("forward", e.target.value.trim().toUpperCase())
        }
        error={errors.forward}
        data-cy="forward"
      />
      <Input
        textArea={true}
        value={primer.cdna}
        label="cDNA Primer Sequence"
        tooltip="The entire forward primer for Primer ID cDNA primer. Must have the Primer ID (Ns)."
        onChange={(e) =>
          updatePrimer("cdna", e.target.value.trim().toUpperCase())
        }
        error={errors.cdna}
        data-cy="cdna"
      />
    </div>
  );
}
