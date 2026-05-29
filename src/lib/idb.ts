import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Grl019Report } from "./types";

interface JmDB extends DBSchema {
  reports: {
    key: string;
    value: Grl019Report;
  };
}

const CURRENT_KEY = "current";
let dbPromise: Promise<IDBPDatabase<JmDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<JmDB>("modelo-nota-jm", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("reports")) {
          db.createObjectStore("reports");
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
