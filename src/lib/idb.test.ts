import { beforeEach, describe, expect, it, vi } from "vitest";

const stores = vi.hoisted(() => new Map<string, Map<string, unknown>>());

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    put: async (store: string, value: unknown, key: string) => {
      const entries = stores.get(store) ?? new Map<string, unknown>();
      entries.set(key, value);
      stores.set(store, entries);
    },
    get: async (store: string, key: string) => stores.get(store)?.get(key),
    delete: async (store: string, key: string) => stores.get(store)?.delete(key),
  })),
}));

import { clearRft006Report, loadReport, loadRft006Report, saveReport, saveRft006Report } from "./idb";
import type { Grl019Report } from "./types";
import type { Rft006Report } from "./rft006";

describe("armazenamento local RFT006", () => {
  beforeEach(() => stores.clear());

  it("salva e limpa o RFT006 sem sobrescrever reports/current do GRL019", async () => {
    const grl019 = { fileName: "grl019.xlsx" } as Grl019Report;
    const rft006 = { fileName: "rft006.xlsx", rows: [], notas: [] } as unknown as Rft006Report;

    await saveReport(grl019);
    await saveRft006Report(rft006);

    expect(await loadReport()).toBe(grl019);
    expect(await loadRft006Report()).toBe(rft006);

    await clearRft006Report();

    expect(await loadRft006Report()).toBeUndefined();
    expect(await loadReport()).toBe(grl019);
  });
});
