import { render, screen } from "@testing-library/react";
import { CollectorRow } from "~/components/CollectorRow";

vi.mock("@remix-run/react", () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

const baseProps = {
  rank: 1,
  userId: "user-42",
  name: "María García",
  picture: null,
  stat: "100 piezas",
};

describe("CollectorRow — rank medals", () => {
  it("shows 🥇 for rank 1", () => {
    render(<CollectorRow {...baseProps} rank={1} />);
    expect(screen.getByText("🥇")).toBeInTheDocument();
  });

  it("shows 🥈 for rank 2", () => {
    render(<CollectorRow {...baseProps} rank={2} />);
    expect(screen.getByText("🥈")).toBeInTheDocument();
  });

  it("shows 🥉 for rank 3", () => {
    render(<CollectorRow {...baseProps} rank={3} />);
    expect(screen.getByText("🥉")).toBeInTheDocument();
  });

  it("shows '#4' for rank 4", () => {
    render(<CollectorRow {...baseProps} rank={4} />);
    expect(screen.getByText("#4")).toBeInTheDocument();
  });

  it("shows '#10' for rank 10", () => {
    render(<CollectorRow {...baseProps} rank={10} />);
    expect(screen.getByText("#10")).toBeInTheDocument();
  });

  it("does not show a medal emoji for rank 4+", () => {
    render(<CollectorRow {...baseProps} rank={5} />);
    expect(screen.queryByText("🥇")).not.toBeInTheDocument();
    expect(screen.queryByText("🥈")).not.toBeInTheDocument();
    expect(screen.queryByText("🥉")).not.toBeInTheDocument();
  });
});

describe("CollectorRow — link behavior", () => {
  it("renders the user name as a link", () => {
    render(<CollectorRow {...baseProps} />);
    expect(screen.getByRole("link", { name: "María García" })).toBeInTheDocument();
  });

  it("link points to /collection/:userId without from param", () => {
    render(<CollectorRow {...baseProps} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/collection/user-42");
  });

  it("link includes ?from=:slug when fromCategory is provided", () => {
    render(<CollectorRow {...baseProps} fromCategory="most-pieces" />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/collection/user-42?from=most-pieces"
    );
  });

  it("link has no 'from' param when fromCategory is not provided", () => {
    render(<CollectorRow {...baseProps} />);
    const href = screen.getByRole("link").getAttribute("href") ?? "";
    expect(href).not.toContain("from");
  });

  it("link uses fromCategory slug correctly", () => {
    render(<CollectorRow {...baseProps} fromCategory="veteran" />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/collection/user-42?from=veteran"
    );
  });
});

describe("CollectorRow — avatar", () => {
  it("shows the first uppercase letter of name when picture is null", () => {
    render(<CollectorRow {...baseProps} name="Diana" picture={null} />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders an img when picture is provided", () => {
    render(<CollectorRow {...baseProps} picture="https://p.com/img.jpg" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://p.com/img.jpg");
    expect(img).toHaveAttribute("alt", "María García");
  });

  it("does not render an img when picture is null", () => {
    render(<CollectorRow {...baseProps} picture={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("CollectorRow — stat", () => {
  it("renders the stat text", () => {
    render(<CollectorRow {...baseProps} stat="342 piezas" />);
    expect(screen.getByText("342 piezas")).toBeInTheDocument();
  });

  it("renders different stat formats", () => {
    render(<CollectorRow {...baseProps} stat="Desde 1895" />);
    expect(screen.getByText("Desde 1895")).toBeInTheDocument();
  });
});
