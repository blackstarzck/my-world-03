export const lightingPresets = {
  day: {
    sun: 4.1,
    sunColor: "#fff1d7",
    hemisphere: 0.58,
    environment: 0.42,
    exposure: 1.13,
    background: "#dddeda",
    daylight: 1,
    spot: 1,
    skylightGlow: 0.18,
  },
  evening: {
    sun: 0.06,
    sunColor: "#819ac7",
    hemisphere: 0.065,
    environment: 0.035,
    exposure: 1.02,
    background: "#111927",
    daylight: 0.018,
    spot: 2.8,
    skylightGlow: 0.008,
  },
};

export function renderQuality(width, overview, reduced = false) {
  return overview || width < 700 || reduced ? "balanced" : "high";
}
