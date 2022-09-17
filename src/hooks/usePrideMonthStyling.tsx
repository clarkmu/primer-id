import { useState } from "react";

const d = new Date();
const isPrideMonth = d.getMonth() === 5;

export default function usePrideMonthStyling() {
  const titleStyle = useState(isPrideMonth ? "animatedBackground_a" : "");
  const titleTextStyle = useState(isPrideMonth ? "animated_rainbow_1" : "");

  return [titleStyle, titleTextStyle];
}
