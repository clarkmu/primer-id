export default function ConfirmationDisplay({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <span>
      {label}: <span className="underline">{value}</span>
    </span>
  );
}
