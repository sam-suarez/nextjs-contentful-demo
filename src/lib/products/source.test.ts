import "server-only";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { selectProductSource } from "@/lib/products/source";

const VARS = ["CONTENTFUL_SPACE_ID", "CONTENTFUL_ENVIRONMENT", "CONTENTFUL_DELIVERY_TOKEN"] as const;
type Var = (typeof VARS)[number];

const SPACE = "space-id-secret-abc123";
const ENVIRONMENT = "env-secret-xyz789";
const TOKEN = "delivery-token-secret-0123456789";
const SESSION_SECRET = "session-secret-0123456789-abcdefghijklmnop";

const ALL_SET: Record<Var, string> = {
  CONTENTFUL_SPACE_ID: SPACE,
  CONTENTFUL_ENVIRONMENT: ENVIRONMENT,
  CONTENTFUL_DELIVERY_TOKEN: TOKEN,
};

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug", "trace"] as const;

/** Spies on every console method (silenced) and returns the spies keyed by method. */
function spyConsole() {
  return Object.fromEntries(
    CONSOLE_METHODS.map((m) => [m, vi.spyOn(console, m).mockImplementation(() => {})]),
  ) as Record<(typeof CONSOLE_METHODS)[number], ReturnType<typeof vi.spyOn>>;
}

function stubContentfulEnv(values: Partial<Record<Var, string>>) {
  for (const name of VARS) vi.stubEnv(name, values[name] ?? "");
}

/** Fresh module instance, so the memoized first call can be observed. */
async function freshSource() {
  vi.resetModules();
  return import("@/lib/products/source");
}

const unsetCases = VARS.flatMap((name) =>
  (["missing", "empty", "whitespace"] as const).map((kind) => ({ name, kind })),
);

function envWith(name: Var, kind: "missing" | "empty" | "whitespace") {
  const env: Record<string, string | undefined> = { ...ALL_SET };
  if (kind === "missing") delete env[name];
  if (kind === "empty") env[name] = "";
  if (kind === "whitespace") env[name] = "  ";
  return env;
}

describe("products/source", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("R1: all three CONTENTFUL_* vars set selects contentful", () => {
    expect(selectProductSource({ ...ALL_SET })).toBe("contentful");
  });

  it("R1: set values with surrounding whitespace still select contentful", () => {
    expect(
      selectProductSource({
        CONTENTFUL_SPACE_ID: `  ${SPACE} `,
        CONTENTFUL_ENVIRONMENT: ` ${ENVIRONMENT}`,
        CONTENTFUL_DELIVERY_TOKEN: `${TOKEN}  `,
      }),
    ).toBe("contentful");
  });

  it.each(unsetCases)("R1: $name $kind (other two set) selects mock", ({ name, kind }) => {
    expect(selectProductSource(envWith(name, kind))).toBe("mock");
  });

  it("R1: an empty env {} selects mock", () => {
    expect(selectProductSource({})).toBe("mock");
  });

  it("R1: the .env.example shape (environment=master, other two empty) selects mock", () => {
    expect(
      selectProductSource({
        CONTENTFUL_SPACE_ID: "",
        CONTENTFUL_ENVIRONMENT: "master",
        CONTENTFUL_DELIVERY_TOKEN: "",
      }),
    ).toBe("mock");
  });

  it("R1: selectProductSource does not log", () => {
    const spies = spyConsole();
    selectProductSource({ ...ALL_SET });
    selectProductSource({});
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();
  });

  it("R1: selectProductSource ignores process.env when it is fully set", () => {
    stubContentfulEnv(ALL_SET);
    expect(selectProductSource({})).toBe("mock");
  });

  it("R1: selectProductSource ignores process.env when it is blank", () => {
    stubContentfulEnv({});
    expect(selectProductSource({ ...ALL_SET })).toBe("contentful");
  });

  it("R2: getProductSource returns mock when process.env CONTENTFUL_* vars are empty", async () => {
    spyConsole();
    stubContentfulEnv({});
    const { getProductSource } = await freshSource();
    expect(getProductSource()).toBe("mock");
  });

  it("R2: getProductSource returns contentful when process.env has all three vars", async () => {
    spyConsole();
    stubContentfulEnv(ALL_SET);
    const { getProductSource } = await freshSource();
    expect(getProductSource()).toBe("contentful");
  });

  it("R2: first call logs exactly one console.info line '[products] source: mock'", async () => {
    const spies = spyConsole();
    stubContentfulEnv({});
    const { getProductSource } = await freshSource();
    getProductSource();
    expect(spies.info.mock.calls).toStrictEqual([["[products] source: mock"]]);
  });

  it("R2: first call logs exactly one console.info line '[products] source: contentful'", async () => {
    const spies = spyConsole();
    stubContentfulEnv(ALL_SET);
    const { getProductSource } = await freshSource();
    getProductSource();
    expect(spies.info.mock.calls).toStrictEqual([["[products] source: contentful"]]);
  });

  it("R2: no console method other than info is called on the first call", async () => {
    const spies = spyConsole();
    stubContentfulEnv(ALL_SET);
    const { getProductSource } = await freshSource();
    getProductSource();
    for (const m of CONSOLE_METHODS) {
      if (m !== "info") expect(spies[m]).not.toHaveBeenCalled();
    }
  });

  it("R2: later calls write nothing to the console", async () => {
    const spies = spyConsole();
    stubContentfulEnv({});
    const { getProductSource } = await freshSource();
    getProductSource();
    for (const spy of Object.values(spies)) spy.mockClear();
    getProductSource();
    getProductSource();
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();
  });

  it("R2: the first result is reused even if process.env changes later", async () => {
    spyConsole();
    stubContentfulEnv({});
    const { getProductSource } = await freshSource();
    expect(getProductSource()).toBe("mock");
    stubContentfulEnv(ALL_SET);
    expect(getProductSource()).toBe("mock");
  });

  it("R2: no console output contains a CONTENTFUL_* value or SESSION_SECRET", async () => {
    const spies = spyConsole();
    stubContentfulEnv(ALL_SET);
    const { getProductSource } = await freshSource();
    getProductSource();
    getProductSource();
    const printed = Object.values(spies)
      .flatMap((spy) => spy.mock.calls.flat())
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg) ?? String(arg)))
      .join("\n");
    for (const secret of [SPACE, ENVIRONMENT, TOKEN, SESSION_SECRET]) {
      expect(printed).not.toContain(secret);
    }
  });
});
