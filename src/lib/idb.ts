import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Grl019Report } from "./types";
import type { Rft006Report } from "./rft006";

interface JmDB extends DBSchema {
  reports: {
    key: string;
    value: Grl019Report;
  };
  rft006Reports: {
    key: string;
    value: Rft006Report;
  };
}

const CURRENT_KEY = "current";
let dbPromise: Promise<IDBPDatabase<JmDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<JmDB>("modelo-nota-jm", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("reports")) {
          db.createObjectStore("reports");
        }
        // Store independente: a evolucao do banco local preserva integralmente o GRL019 atual.
        if (!db.objectStoreNames.contains("rft006Reports")) {
          db.createObjectStore("rft006Reports");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveReport(report: Grl019Report): Promise<void> {
  const db = await getDB();
  await db.put("reports", report, CURRENT_KEY);
}

export async function loadReport(): Promise<Grl019Report | undefined> {
  const db = await getDB();
  return db.get("reports", CURRENT_KEY);
}

export async function clearReport(): Promise<void> {
  const db = await getDB();
  await db.delete("reports", CURRENT_KEY);
}

export async function saveRft006Report(report: Rft006Report): Promise<void> {
  const db = await getDB();
  await db.put("rft006Reports", report, CURRENT_KEY);
}

export async function loadRft006Report(): Promise<Rft006Report | undefined> {
  const db = await getDB();
  return db.get("rft006Reports", CURRENT_KEY);
}

export async function clearRft006Report(): Promise<void> {
  const db = await getDB();
  await db.delete("rft006Reports", CURRENT_KEY);
}
