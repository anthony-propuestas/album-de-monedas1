import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonVariants } from "~/components/ui/button";

describe("Button component", () => {
  it("renders with text content", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("has data-slot='button' attribute", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-slot", "button");
  });

  it("applies default variant class (bg-primary)", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button").className).toContain("bg-primary");
  });

  it("applies outline variant classes", () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button").className).toContain("border-border");
  });

  it("applies secondary variant classes", () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button").className).toContain("bg-secondary");
  });

  it("applies ghost variant classes", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button").className).toContain("hover:bg-muted");
  });

  it("applies destructive variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button").className).toContain("bg-destructive");
  });

  it("applies link variant classes", () => {
    render(<Button variant="link">Link</Button>);
    expect(screen.getByRole("button").className).toContain("underline-offset-4");
  });

  it("applies sm size classes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("h-7");
  });

  it("applies lg size classes", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button").className).toContain("h-9");
  });

  it("applies icon size classes", () => {
    render(<Button size="icon">x</Button>);
    expect(screen.getByRole("button").className).toContain("size-8");
  });

  it("merges custom className without losing variant classes", () => {
    render(<Button className="my-custom">Custom</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("my-custom");
    expect(btn.className).toContain("bg-primary");
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders as type='submit' when specified", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

describe("buttonVariants", () => {
  const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
  const sizes = ["default", "sm", "lg", "icon"] as const;

  it.each(variants)("generates a string for variant '%s'", (variant) => {
    expect(buttonVariants({ variant })).toBeTypeOf("string");
    expect(buttonVariants({ variant }).length).toBeGreaterThan(0);
  });

  it.each(sizes)("generates a string for size '%s'", (size) => {
    expect(buttonVariants({ size })).toBeTypeOf("string");
    expect(buttonVariants({ size }).length).toBeGreaterThan(0);
  });

  it("returns default classes when called with no arguments", () => {
    const result = buttonVariants({});
    expect(result).toContain("bg-primary");
    expect(result).toContain("h-8");
  });
});
