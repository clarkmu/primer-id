import useDRParams from "@/hooks/useDRParams";
import Paper from "../form/Paper";
import Button from "../form/Button";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import { drVersionType } from "@/utils/constants/INITIAL_TCSDR";
import dynamic from "next/dynamic";

const ReactJson = dynamic(() => import("react-json-view"), {
  ssr: false,
});

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

  const versionKeys = Object.keys(params);

  return (
    <Paper className="flex flex-col gap-4">
      <div className="flex justify-around gap-8 mx-8">
        {versionKeys.map((v) => (
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
      <div className="border-2 b-primary max-h-[33vh] overflow-y-auto text-sm">
        {!versionKeys.length ? (
          "Loading..."
        ) : (
          <ReactJson
            src={params[drVersion]}
            // collapsed={1}
            name={drVersion.toUpperCase()}
            enableClipboard={false}
            displayDataTypes={false}
            displayObjectSize={false}
            style={{ margin: "0.5rem 1rem" }}
          />
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
