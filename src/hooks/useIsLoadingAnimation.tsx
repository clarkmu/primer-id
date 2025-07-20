import { useEffect, useState, useRef } from "react";

const frames = [
  "🐱🐭    ",
  "🐱 🐭   ",
  " 🐱🐭   ",
  " 🐱 🐭  ",
  "  🐱🐭  ",
  "  🐱 🐭 ",
  "   🐱🐭 ",
  "    🐱🐭",
  "    🐭🐱",
  "   🐭 🐱",
  "  🐭🐱  ",
  " 🐭 🐱  ",
  " 🐭🐱   ",
  "🐭 🐱   ",
  "🐭🐱    ",
];

const framesLength = frames.length;

export function useIsLoadingAnimation(isShowing: boolean, interval = 300) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!isShowing) return;

    const id = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % framesLength;
      setFrameIndex(frameRef.current);
    }, interval);

    return () => clearInterval(id);
  }, [isShowing, interval]);

  return isShowing ? frames[frameIndex] : "";
}
