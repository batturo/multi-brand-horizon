import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const KEYS = ["DEMO_CATALOG", "NETLIFY", "VERCEL", "CI", "CONTEXT", "DEPLOY_URL", "SITE_ID", "AWS_LAMBDA_FUNCTION_NAME",
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

async function modeWith(env: Record<string, string>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  const { backendMode } = await import("@/lib/backend");
  return backendMode();
}

describe("backendMode", () => {
  it("allows the no-login preview only on a local machine", async () => {
    expect(await modeWith({ DEMO_CATALOG: "samples" })).toBe("local");
  });
  it.each(["NETLIFY", "VERCEL", "CI", "CONTEXT", "SITE_ID", "AWS_LAMBDA_FUNCTION_NAME"])(
    "refuses the preview when %s is set",
    async (k) => {
      expect(await modeWith({ DEMO_CATALOG: "samples", [k]: "true" })).toBe("none");
    },
  );
  it("uses Supabase whenever it is configured", async () => {
    expect(
      await modeWith({ DEMO_CATALOG: "samples", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" }),
    ).toBe("supabase");
  });
});
