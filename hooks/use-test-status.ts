"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ProductTestStatus, TestStatus, AutoTestStatus } from "@/lib/types";

const NOTES_DEBOUNCE_MS = 500;

const STORAGE_KEY = "ar-model-test-statuses";

export type DbVariantState = Record<
  number,
  { humanVerified: boolean; manualIncorrect: boolean; notes: string | null }
>;

async function persistVariantUpdate(
  variantId: number,
  payload: { humanVerified?: boolean; manualIncorrect?: boolean; notes?: string }
): Promise<void> {
  await fetch("/api/variants/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantId, ...payload }),
  });
}

export const useTestStatus = () => {
  const [statuses, setStatuses] = useState<Record<number, ProductTestStatus>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const notesDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setStatuses(JSON.parse(stored));
      } catch {
        setStatuses({});
      }
    }
    setIsLoaded(true);
  }, []);

  const saveStatuses = useCallback((newStatuses: Record<number, ProductTestStatus>) => {
    setStatuses(newStatuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatuses));
  }, []);

  const hydrateFromDb = useCallback((state: DbVariantState) => {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const [idStr, value] of Object.entries(state)) {
        const id = Number(idStr);
        if (Number.isNaN(id)) continue;
        const existing = next[id] || {
          productId: id,
          iosStatus: "not_tested" as TestStatus,
          androidStatus: "not_tested" as TestStatus,
          lastUpdated: new Date().toISOString(),
        };
        next[id] = {
          ...existing,
          humanVerified: value.humanVerified,
          manualIncorrect: value.manualIncorrect,
          notes: value.notes ?? undefined,
        };
      }
      return next;
    });
  }, []);

  const updateStatus = useCallback(
    (
      productId: number,
      platform: "ios" | "android",
      status: TestStatus,
      notes?: string
    ) => {
      const existing = statuses[productId] || {
        productId,
        iosStatus: "not_tested" as TestStatus,
        androidStatus: "not_tested" as TestStatus,
      };

      const updated: ProductTestStatus = {
        ...existing,
        [platform === "ios" ? "iosStatus" : "androidStatus"]: status,
        notes: notes ?? existing.notes,
        lastUpdated: new Date().toISOString(),
      };

      const newStatuses = { ...statuses, [productId]: updated };
      saveStatuses(newStatuses);
    },
    [statuses, saveStatuses]
  );

  const updateAutoStatus = useCallback(
    (productId: number, platform: "ios" | "android", autoStatus: AutoTestStatus) => {
      const existing = statuses[productId] || {
        productId,
        iosStatus: "not_tested" as TestStatus,
        androidStatus: "not_tested" as TestStatus,
      };

      const updated: ProductTestStatus = {
        ...existing,
        [platform === "ios" ? "iosAutoStatus" : "androidAutoStatus"]: autoStatus,
        lastUpdated: new Date().toISOString(),
      };

      const newStatuses = { ...statuses, [productId]: updated };
      saveStatuses(newStatuses);
    },
    [statuses, saveStatuses]
  );

  const updateHumanVerified = useCallback(
    (productId: number, verified: boolean) => {
      const existing = statuses[productId] || {
        productId,
        iosStatus: "not_tested" as TestStatus,
        androidStatus: "not_tested" as TestStatus,
      };

      const updated: ProductTestStatus = {
        ...existing,
        humanVerified: verified,
        // если помечаем как OK, снимаем флаг "некорректно"
        manualIncorrect: verified ? false : existing.manualIncorrect,
        lastUpdated: new Date().toISOString(),
      };

      const newStatuses = { ...statuses, [productId]: updated };
      saveStatuses(newStatuses);
      persistVariantUpdate(productId, {
        humanVerified: verified,
        manualIncorrect: verified ? false : existing.manualIncorrect,
      }).catch(
        (e) => console.error("[useTestStatus] persist humanVerified", e)
      );
    },
    [statuses, saveStatuses]
  );

  const updateNotes = useCallback(
    (productId: number, notes: string) => {
      const existing = statuses[productId] || {
        productId,
        iosStatus: "not_tested" as TestStatus,
        androidStatus: "not_tested" as TestStatus,
      };

      const updated: ProductTestStatus = {
        ...existing,
        notes: notes || undefined,
        lastUpdated: new Date().toISOString(),
      };

      const newStatuses = { ...statuses, [productId]: updated };
      saveStatuses(newStatuses);

      const prev = notesDebounceRef.current[productId];
      if (prev) clearTimeout(prev);
      notesDebounceRef.current[productId] = setTimeout(() => {
        delete notesDebounceRef.current[productId];
        persistVariantUpdate(productId, { notes }).catch((e) =>
          console.error("[useTestStatus] persist notes", e)
        );
      }, NOTES_DEBOUNCE_MS);
    },
    [statuses, saveStatuses]
  );

  const updateManualIncorrect = useCallback(
    (productId: number, incorrect: boolean) => {
      const existing = statuses[productId] || {
        productId,
        iosStatus: "not_tested" as TestStatus,
        androidStatus: "not_tested" as TestStatus,
      };

      const updated: ProductTestStatus = {
        ...existing,
        manualIncorrect: incorrect,
        // если ставим "некорректно", снимаем "проверено OK"
        humanVerified: incorrect ? false : existing.humanVerified,
        lastUpdated: new Date().toISOString(),
      };

      const newStatuses = { ...statuses, [productId]: updated };
      saveStatuses(newStatuses);
      persistVariantUpdate(productId, {
        manualIncorrect: incorrect,
        humanVerified: incorrect ? false : existing.humanVerified,
      }).catch((e) =>
        console.error("[useTestStatus] persist manualIncorrect", e)
      );
    },
    [statuses, saveStatuses]
  );

  const getStatus = useCallback(
    (productId: number): ProductTestStatus | undefined => {
      return statuses[productId];
    },
    [statuses]
  );

  const clearAllStatuses = useCallback(() => {
    setStatuses({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    statuses,
    isLoaded,
    hydrateFromDb,
    updateStatus,
    updateAutoStatus,
    updateHumanVerified,
    updateNotes,
    updateManualIncorrect,
    getStatus,
    clearAllStatuses,
  };
};
