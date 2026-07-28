/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { DonutChart } from "./donut-chart";

afterEach(cleanup);

/** The ring is the only element carrying a conic-gradient background. */
function gradientOf(container: HTMLElement): string {
  const ring = Array.from(container.querySelectorAll<HTMLElement>("div")).find((d) =>
    d.style.background.includes("conic-gradient")
  );
  if (!ring) throw new Error("no element with a conic-gradient background");
  return ring.style.background;
}

/**
 * Pulls the "start% end%" pair out of each colour stop. Asserting on the
 * percentages rather than the whole string keeps these tests about the
 * arithmetic — jsdom rewrites `#0f0` to `rgb(0, 255, 0)`, which is irrelevant
 * to what the chart has to get right.
 */
function stopsOf(container: HTMLElement): Array<[number, number]> {
  return Array.from(gradientOf(container).matchAll(/([\d.]+)%\s+([\d.]+)%/g)).map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

describe("DonutChart gradient stops", () => {
  // Regression guard for the bug fixed on 2026-07-28: the stops used to be
  // built by mutating a `let acc` inside .map(), which react-hooks/immutability
  // rejects. The replacement computes each offset from scratch, so this pins
  // the arithmetic it has to keep producing.
  it("lays segments end to end without gaps or overlap", () => {
    const { container } = render(
      <DonutChart
        segments={[
          { label: "Low", value: 1, color: "#00ff00" },
          { label: "Medium", value: 1, color: "#ffff00" },
          { label: "High", value: 2, color: "#ff0000" },
        ]}
        centerValue="4"
        centerLabel="reports"
      />
    );

    expect(stopsOf(container)).toEqual([
      [0, 25],
      [25, 50],
      [50, 100],
    ]);
  });

  it("keeps each segment's arc proportional to its share of the total", () => {
    const { container } = render(
      <DonutChart
        segments={[
          { label: "A", value: 7, color: "#111111" },
          { label: "B", value: 3, color: "#222222" },
        ]}
        centerValue="10"
        centerLabel="reports"
      />
    );

    const stops = stopsOf(container);
    expect(stops).toEqual([
      [0, 70],
      [70, 100],
    ]);
    // Every segment starts exactly where the previous one ended.
    stops.forEach(([start], i) => {
      if (i > 0) expect(start).toBe(stops[i - 1][1]);
    });
  });

  // Found by this test: CSS gradients need two or more colour stops, so a
  // one-segment donut used to emit `conic-gradient(<one stop>)`, which browsers
  // reject outright — the ring rendered blank. Reachable whenever a single plan
  // has revenue or every report shares a status. Now a solid ring.
  it("falls back to a solid ring for a single segment", () => {
    const { container } = render(
      <DonutChart
        segments={[{ label: "Only", value: 7, color: "#123456" }]}
        centerValue="7"
        centerLabel="reports"
      />
    );

    const ring = Array.from(container.querySelectorAll<HTMLElement>("div")).find(
      (d) => d.className.includes("rounded-full") && d.style.background
    );
    expect(ring, "the ring must still have a background").toBeTruthy();
    expect(ring!.style.background).not.toContain("conic-gradient");
    expect(ring!.style.background).toBe("rgb(18, 52, 86)"); // #123456
  });

  // `total` falls back to 1 when every value is 0, otherwise the percentages
  // would divide by zero and render as NaN%.
  it("does not emit NaN when every segment is zero", () => {
    const { container } = render(
      <DonutChart
        segments={[
          { label: "Low", value: 0, color: "#00ff00" },
          { label: "High", value: 0, color: "#ff0000" },
        ]}
        centerValue="0"
        centerLabel="reports"
      />
    );

    expect(gradientOf(container)).not.toContain("NaN");
    expect(stopsOf(container)).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it("renders the centre figures and one legend row per segment", () => {
    const { container, getByText } = render(
      <DonutChart
        segments={[
          { label: "Low", value: 3, color: "#00ff00" },
          { label: "High", value: 1, color: "#ff0000" },
        ]}
        centerValue="4"
        centerLabel="reports"
      />
    );

    expect(getByText("4")).toBeTruthy();
    expect(getByText("reports")).toBeTruthy();
    expect(getByText("Low")).toBeTruthy();
    expect(getByText("High")).toBeTruthy();
    // One colour swatch per legend row.
    const swatches = Array.from(container.querySelectorAll<HTMLElement>("span")).filter((s) =>
      s.className.includes("rounded-[3px]")
    );
    expect(swatches).toHaveLength(2);
  });
});
