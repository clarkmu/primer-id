import Tooltip from "./Tooltip";

export default function Checkbox({
  label,
  checked,
  onChange,
  tooltip = "",
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  tooltip: string;
}) {
  return (
    <div className="flex gap-4 justify-start items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="bg-primary w-4 h-4"
      />
      <div className="">{label}</div>
      {tooltip && <Tooltip tooltip={tooltip} />}
    </div>
  );
}
