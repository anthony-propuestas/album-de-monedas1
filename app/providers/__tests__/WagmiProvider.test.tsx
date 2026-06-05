import { render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";

vi.mock("wagmi", () => ({
  WagmiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  createConfig: vi.fn(() => ({})),
  http: vi.fn(),
}));
vi.mock("wagmi/chains", () => ({ baseSepolia: { id: 84532 }, base: { id: 8453 } }));
vi.mock("@tanstack/react-query", () => ({
  QueryClient: vi.fn(function () { return {}; }),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Providers } from "~/providers/WagmiProvider";

describe("Providers", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("renders children", () => {
    render(
      <Providers>
        <div data-testid="child">test</div>
      </Providers>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("creates a new QueryClient per mount", () => {
    render(
      <Providers>
        <span />
      </Providers>
    );
    expect(QueryClient).toHaveBeenCalledTimes(1);
  });
});
