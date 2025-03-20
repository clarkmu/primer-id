import Input from "../form/Input";

export default function HTSF({ state, setState }) {
  return (
    <div className="flex flex-col gap-6" data-cy="htsfContainer">
      <Input
        label="HTSF Location"
        placeholder="/path/to/files"
        value={state.htsf}
        onChange={(e) =>
          setState((s) => ({ ...s, htsf: e.target.value.trim() }))
        }
        data-cy="htsf"
      />
      <Input
        label="Pool Name"
        placeholder="Pool Name"
        value={state.poolName}
        onChange={(e) =>
          setState((s) => ({ ...s, poolName: e.target.value.trim() }))
        }
        data-cy="poolName"
      />
    </div>
  );
}
