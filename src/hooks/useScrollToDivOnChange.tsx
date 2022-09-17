import { useEffect, useRef } from "react";

export default function useScrollToDivOnChange(toggle: any, block = "start") {
  const scrollToRef = useRef(null);

  useEffect(() => {
    setTimeout(
      () =>
        scrollToRef?.current?.scrollIntoView({
          behavior: "smooth",
          block,
        }),
      150
    );
  }, [toggle]);

  return [scrollToRef];
}
