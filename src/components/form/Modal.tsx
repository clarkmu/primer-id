import { Dialog } from "@headlessui/react";

export default function Modal({ open, onClose, children }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white min-w-[50vw]">
          {children}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
