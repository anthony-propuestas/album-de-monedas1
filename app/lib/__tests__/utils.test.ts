import { cn } from "~/lib/utils";

describe("cn", () => {
  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("concatenates simple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values (null, undefined, false)", () => {
    expect(cn("foo", null, undefined, false, "bar")).toBe("foo bar");
  });

  it("resolves tailwind conflicts — last class wins", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-white", "bg-black")).toBe("bg-black");
  });

  it("applies conditional object syntax", () => {
    expect(cn({ "font-bold": true, "text-sm": false })).toBe("font-bold");
  });

  it("flattens arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("combines object + string syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("deduplicates the same class", () => {
    expect(cn("flex", "flex")).toBe("flex");
  });
});
