import Tooltip from "./Tooltip";

export default function Checkbox({
  label,
  checked,
  onChange,
  tooltip = "",
  id,
  ...props
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  tooltip?: string;
  id: string;
}) {
  return (
    <div className="flex gap-4 justify-start items-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="bg-primary w-4 h-4 cursor-pointer"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer">
        {label}
      </label>
      {tooltip && <Tooltip tooltip={tooltip} />}
    </div>
  );
}
