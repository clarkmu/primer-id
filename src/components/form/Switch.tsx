import { Switch as SwitchComponent } from "@headlessui/react";
import Tooltip from "./Tooltip";

export default function Switch({
  checked,
  onChange,
  title,
  tooltip,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  tooltip?: string;
}) {
  return (
    <div className="flex gap-2 items-center justify-center">
      <div className="">{title}</div>
      {tooltip && <Tooltip tooltip={tooltip} />}
      <div className="flex-1"></div>
      <div>
        <SwitchComponent
          checked={checked}
          onChange={onChange}
          className={`${
            checked ? "bg-primary" : "bg-grey border border-primary"
          } relative inline-flex h-6 w-11 items-center rounded-full`}
        >
          <span
            className={`${
              checked ? "translate-x-6 bg-white" : "translate-x-1 bg-primary"
            } inline-block h-4 w-4 transform rounded-full`}
          />
        </SwitchComponent>
      </div>
    </div>
  );
}
