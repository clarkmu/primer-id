import Collapse from "@/components/form/Collapse";
import Paper from "@/components/form/Paper";

export default function MyCollapse({ show, children }) {
  return (
    <Collapse open={show}>
      {show ? (
        <Paper>{children}</Paper>
      ) : (
        <div className="w-full h-[400px] animate-pulse bg-grey rounded"></div>
      )}
    </Collapse>
  );
}
