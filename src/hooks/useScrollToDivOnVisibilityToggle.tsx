import { useEffect, useRef } from "react";

export default function useScrollToDivOnVisibilityToggle(
  toggle: boolean,
  block = "start"
) {
  const scrollToRef = useRef(null);

  useEffect(() => {
    if (toggle) {
      setTimeout(
        () =>
          scrollToRef?.current?.scrollIntoView({
            behavior: "smooth",
            block,
          }),
        500
      );
    }
  }, [toggle]);

  return [scrollToRef];
}
