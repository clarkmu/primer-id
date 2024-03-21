import { useState } from "react";
import Image from "next/image";

export default function ImageWithOverlay({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority: boolean;
}) {
  const [open, setOpen] = useState(false);

  const ImageComponent = () => (
    <Image
      priority={priority}
      alt={alt}
      src={src}
      unoptimized
      fill
      className="object-contain"
    />
  );

  const Overlay = () =>
    !open ? null : (
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.75)] flex items-center justify-center z-[999]">
        <div className="absolute text-red-500 top-8 right-8 bg-white cursor-pointer size-8 rounded-full flex items-center justify-center">
          X
        </div>
        <div className="relative rounded-lg w-[90vw] h-[90vh]">
          <ImageComponent />
        </div>
      </div>
    );

  return (
    <div onClick={() => setOpen((b) => !b)} className="cursor-pointer">
      <Overlay />
      <div className="relative rounded-lg max-w-[600px] w-[80vw] h-[50vh]">
        <ImageComponent />
      </div>
    </div>
  );
}
