import useDRParams from "@/hooks/useDRParams";
import Paper from "../form/Paper";
import Button from "../form/Button";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import { drVersionType } from "@/utils/constants/INITIAL_TCSDR";

export default function DRVersion() {
  const { params } = useDRParams();

  const {
    state: {
      pipeline: { drVersion },
    },
    setState,
  } = useTCSDRContext();

  const onChange = (drVersion: drVersionType) =>
    setState((s) => ({ ...s, pipeline: { ...s.pipeline, drVersion } }));

  const drV = params[drVersion];

  return (
    <Paper className="flex flex-col gap-4">
      <div className="flex justify-around gap-8 mx-8">
        {["v1", "v2"].map((v) => (
          <Button
            key={`button_drv${v}`}
            onClick={() => onChange(v)}
            variant={drVersion === v ? "primary" : "outlined"}
            fullWidth
          >
            {v.toUpperCase()}
          </Button>
        ))}
      </div>
      <div className="">
        {/* <pre className="max-h-[8rem] overflow-auto">
          {JSON.stringify(params[drVersion] || "Loading...", undefined, 2)}
        </pre> */}
        {!drV ? (
          "Loading..."
        ) : (
          <>
            <div className="w-full text-center text-lg">
              {drVersion.toUpperCase()} uses the following primer sequences:
            </div>
            <div className="flex flex-col gap-2 m-4 overflow-auto max-h-[10rem]">
              <span className="">
                Platform Error Rate: {drV.platform_error_rate}
              </span>
              {drV.primer_pairs.map((p) => (
                <div
                  key={`${drVersion}_${p.region}`}
                  className="grid gap-x-2 grid-cols-[min-content_1fr] justify-start"
                >
                  <span className="underline col-span-2">{p.region}</span>
                  <span>Forward:</span>
                  <span>{p.forward}</span>
                  <span>cDNA:</span>
                  <span>{p.cdna}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="">
        <Button
          fullWidth
          onClick={() => {
            setState((s) => ({ ...s, showUploads: true }));
          }}
        >
          Continue
        </Button>
      </div>
    </Paper>
  );
}
