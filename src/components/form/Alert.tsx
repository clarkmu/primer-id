import {
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/solid";

export default function Alert({
  severity = "error",
  msg,
  ...props
}: {
  severity?: "info" | "success" | "error";
  msg: string;
}) {
  const Icon = (props: { className: string }) =>
    severity === "error" ? (
      <ExclamationCircleIcon {...props} />
    ) : severity === "info" ? (
      <InformationCircleIcon {...props} />
    ) : (
      <CheckCircleIcon {...props} />
    );

  const bg =
    severity === "error"
      ? "bg-red"
      : severity === "info"
      ? "bg-darkgreen"
      : "bg-green";

  return msg?.length < 1 ? null : (
    <div
      {...props}
      className={`${bg} flex gap-4 justify-start items-center py-4 px-8 text-white w-full`}
    >
      <Icon className="text-white h-6 w-6" />
      <div className="font-lg text-lg">{msg}</div>
    </div>
  );
}
