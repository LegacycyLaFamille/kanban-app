import { useCallback, useState } from "react";

// "colorblind" swaps the status/priority palette for one that stays
// distinguishable with any colour-vision deficiency (Okabe-Ito based) and
// adds patterns, so meaning never rests on hue alone.
export type ColorVision = "default" | "colorblind";

const STORAGE_KEY = "kanban.colorVision";

export function readColorVision(): ColorVision {
  try {
    return localStorage.getItem(STORAGE_KEY) === "colorblind"
      ? "colorblind"
      : "default";
  } catch {
    return "default";
  }
}

// The palette lives in CSS (styles/index.css), keyed on this attribute.
export function applyColorVision(value: ColorVision): void {
  document.documentElement.setAttribute("data-color-vision", value);
}

/** Per-device preference: kept in this browser, applied on every page. */
export function useColorVision(): [ColorVision, (value: ColorVision) => void] {
  const [value, setValue] = useState<ColorVision>(readColorVision);

  const update = useCallback((next: ColorVision) => {
    setValue(next);
    applyColorVision(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode…): the choice lasts for this visit.
    }
  }, []);

  return [value, update];
}
