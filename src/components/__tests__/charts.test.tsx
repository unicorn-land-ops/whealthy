import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeterministicChart } from "@/components/deterministic-chart";
import { MonteCarloChart } from "@/components/monte-carlo-chart";

describe("charts", () => {
  it("renders deterministic chart", () => {
    const { container } = render(
      <DeterministicChart
        currency="$"
        data={[
          { age: 45, wealth: 10_000_000 },
          { age: 46, wealth: 10_500_000 },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders Monte Carlo chart", () => {
    const { container } = render(
      <MonteCarloChart
        currency="$"
        data={[
          { age: 45, p5: 8_000_000, p25: 9_000_000, p50: 10_000_000, p75: 11_000_000, p95: 12_000_000 },
          { age: 46, p5: 7_500_000, p25: 8_500_000, p50: 9_800_000, p75: 10_800_000, p95: 11_800_000 },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

