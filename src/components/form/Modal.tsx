export default function Modal({
  children,
  open,
  onClose,
}: {
  children: Element;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className={`z-10 absolute inset-0 hidden ${open ? " !block" : ""}`}
    >
      <div className="z-10 relative h-full w-full">
        <div
          className={
            "absolute inset-0 z-20 bg-black opacity-0 transition-all duration-500 " +
            (open ? "!opacity-60 !block" : "")
          }
        ></div>
        <div
          className={
            "z-30 absolute inset-0 transition-all duration-500 mx-auto hidden justify-center items-center " +
            (open ? "!opacity-100 !flex" : "")
          }
        >
          <div className="bg-white container">{children}</div>
        </div>
      </div>
    </div>
  );
}
