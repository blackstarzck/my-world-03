// Opt-in, local development measurements; the exhibition UI stays unchanged.
export function createRenderDiagnostics(container) {
  if (!import.meta.env.DEV || !new URLSearchParams(location.search).has("perf"))
    return { record() {}, dispose() {} };
  const output = document.createElement("output");
  output.setAttribute("aria-label", "렌더링 성능");
  Object.assign(output.style, {
    position: "absolute", left: "12px", bottom: "100px", zIndex: "30",
    whiteSpace: "pre", color: "white", background: "#111d", padding: "10px",
    font: "11px monospace", pointerEvents: "none",
  });
  container.appendChild(output);
  let samples = [], lastReport = 0;
  return {
    record(interval, cpu, renderer, state) {
      samples.push({ interval, cpu });
      if (samples.length > 120) samples.shift();
      if (performance.now() - lastReport < 1000) return;
      lastReport = performance.now();
      const mean = (key) => samples.reduce((sum, s) => sum + s[key], 0) / samples.length;
      const sorted = samples.map((s) => s.interval).sort((a, b) => a - b);
      const result = {
        frames: samples.length, fps: +(1000 / mean("interval")).toFixed(1),
        frameMs: +mean("interval").toFixed(1),
        p95Ms: +sorted[Math.floor((sorted.length - 1) * 0.95)].toFixed(1),
        cpuMs: +mean("cpu").toFixed(1),
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        ...state,
      };
      output.textContent = JSON.stringify(result, null, 2);
    },
    dispose() { output.remove(); },
  };
}
