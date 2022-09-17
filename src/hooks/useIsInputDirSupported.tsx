import { useState, useEffect } from "react";

export default function useIsInputDirSupported() {
  const [isInputDirSupported, setIsInputDirSupported] = useState(true); // checkDirSupport();

  useEffect(() => {
    const tmpInput = document.createElement("input");
    const isSupported =
      "webkitdirectory" in tmpInput ||
      "mozdirectory" in tmpInput ||
      "odirectory" in tmpInput ||
      "msdirectory" in tmpInput ||
      "directory" in tmpInput;
    setIsInputDirSupported(isSupported);
  }, []);

  return [isInputDirSupported];
}
