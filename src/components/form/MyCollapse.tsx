import Collapse from "@/components/form/Collapse";
import Paper from "@/components/form/Paper";

export default function MyCollapse({
  show,
  children,
  className = "",
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Collapse open={show}>
      {show ? (
        <Paper className={className}>{children}</Paper>
      ) : (
        <div className="w-full h-[400px] animate-pulse bg-grey rounded"></div>
      )}
    </Collapse>
  );
}
