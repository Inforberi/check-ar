"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import { Loader2, AlertCircle, RefreshCw, Box } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductFilters, type FilterStatus } from "@/components/product-filters";
import { useTestStatus } from "@/hooks/use-test-status";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { NormalizedResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Ключи для localStorage
const STORAGE_KEYS = {
  SEARCH_QUERY: "ar-dashboard-search-query",
  URL_SEARCH: "ar-dashboard-url-search",
  STATUS_FILTER: "ar-dashboard-status-filter",
};

// Extract product IDs from Strapi Admin URLs
const extractIdsFromUrls = (urlText: string): number[] => {
  const lines = urlText.split("\n").filter((l) => l.trim());
  const ids: number[] = [];
  for (const line of lines) {
    // Match patterns like /123? or /123 at the end
    const match = line.match(/\/(\d+)(?:\?|$)/);
    if (match) {
      ids.push(parseInt(match[1], 10));
    }
  }
  return ids;
};

export const ArDashboard = () => {
  // Загружаем сохраненные значения из localStorage при инициализации
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || "";
    }
    return "";
  });
  const [urlSearch, setUrlSearch] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEYS.URL_SEARCH) || "";
    }
    return "";
  });
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.STATUS_FILTER);
      if (saved && ["all", "with_ar", "tested", "not_tested", "failed", "failed_filled", "failed_empty", "human_verified", "manual_incorrect"].includes(saved)) {
        return saved as FilterStatus;
      }
    }
    return "all";
  });

  // Сохраняем в localStorage при изменении
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.URL_SEARCH, urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.STATUS_FILTER, statusFilter);
    }
  }, [statusFilter]);

  const {
    statuses,
    isLoaded,
    hydrateFromDb,
    updateHumanVerified,
    updateManualIncorrect,
    updateNotes,
  } = useTestStatus();

  const { data, error, isLoading, mutate } = useSWR<NormalizedResponse>(
    "/api/products?pageSize=200",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const products = data?.data || [];

  // Sync variants to DB and hydrate humanVerified/notes from DB (only when products loaded)
  useEffect(() => {
    if (!products.length) return;
    const run = async () => {
      try {
        await fetch("/api/variants/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: products }),
        });
        const variantIds = products.flatMap((p) => (p.childrens ?? []).map((c) => c.id));
        if (variantIds.length === 0) return;
        const res = await fetch(
          `/api/variants/state?ids=${variantIds.join(",")}`
        );
        if (!res.ok) return;
        const state = await res.json();
        hydrateFromDb(state);
      } catch (e) {
        console.error("[ArDashboard] sync/hydrate", e);
      }
    };
    run();
  }, [products, hydrateFromDb]);

  // Parse URL search IDs
  const urlSearchIds = useMemo(() => extractIdsFromUrls(urlSearch), [urlSearch]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // URL search filter (takes priority)
    if (urlSearchIds.length > 0) {
      result = result.filter((p) => {
        const children = p.childrens || [];
        return children.some((c) => urlSearchIds.includes(c.id));
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          (p.childrens || []).some((c) => c.name?.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => {
        const children = p.childrens || [];
        const hasAr = children.some(
          (c) => c.ar_model_ios || c.ar_model_and
        );

        if (statusFilter === "with_ar") {
          return hasAr;
        }

        if (statusFilter === "human_verified") {
          return children.some((c) => statuses[c.id]?.humanVerified);
        }

        if (statusFilter === "manual_incorrect") {
          return children.some((c) => statuses[c.id]?.manualIncorrect);
        }

        // Хоть 1 с AR и хоть 1 без AR: смешанные карточки
        if (statusFilter === "failed_filled") {
          const hasAnyWithAr = children.some((c) => c.ar_model_ios || c.ar_model_and);
          const hasAnyWithoutAr = children.some((c) => !c.ar_model_ios && !c.ar_model_and);
          return hasAnyWithAr && hasAnyWithoutAr;
        }
        // Ни одного с AR: у VarProduct ни у одного варианта нет AR (все без iOS и Android AR)
        if (statusFilter === "failed_empty") {
          return (
            children.length > 0 &&
            children.every((c) => !c.ar_model_ios && !c.ar_model_and)
          );
        }

        if (!hasAr) return false;

        const childrenWithAr = children.filter(
          (c) => c.ar_model_ios || c.ar_model_and
        );

        if (statusFilter === "tested") {
          return childrenWithAr.some((c) => {
            const status = statuses[c.id];
            return (
              status &&
              (status.iosStatus !== "not_tested" ||
                status.androidStatus !== "not_tested")
            );
          });
        }

        if (statusFilter === "not_tested") {
          return childrenWithAr.some((c) => {
            const status = statuses[c.id];
            return (
              !status ||
              ((c.ar_model_ios && status.iosStatus === "not_tested") ||
                (c.ar_model_and && status.androidStatus === "not_tested"))
            );
          });
        }

        if (statusFilter === "failed") {
          const hasFailedTest = childrenWithAr.some((c) => {
            const status = statuses[c.id];
            return (
              status &&
              (status.iosStatus === "failed" || status.androidStatus === "failed")
            );
          });
          const hasNoAr = children.some(
            (c) => !c.ar_model_ios && !c.ar_model_and
          );
          return hasFailedTest || hasNoAr;
        }

        return true;
      });
    }

    return result;
  }, [products, searchQuery, urlSearchIds, statusFilter, statuses]);

  const filteredChildrenCount = useMemo(() => {
    const visibleIds = new Set<number>();
    for (const p of filteredProducts) {
      for (const c of p.childrens ?? []) {
        visibleIds.add(c.id);
      }
    }

    const lines = urlSearch.split("\n").map((l) => l.trim()).filter(Boolean);

    // Если URL-фильтра нет — считаем все варианты во всех показанных VarProduct
    if (lines.length === 0) {
      return filteredProducts.reduce(
        (acc, p) => acc + (p.childrens ? p.childrens.length : 0),
        0
      );
    }

    // Если есть URL-фильтр — считаем КОЛИЧЕСТВО ССЫЛОК, для которых найден видимый вариант
    let matched = 0;
    for (const line of lines) {
      const match = line.match(/\/(\d+)(?:\?|$)/);
      if (!match) continue;
      const id = parseInt(match[1], 10);
      if (!Number.isNaN(id) && visibleIds.has(id)) {
        matched += 1;
      }
    }
    return matched;
  }, [filteredProducts, urlSearch]);

  const unmatchedUrls = useMemo(() => {
    const visibleIds = new Set<number>();
    for (const p of filteredProducts) {
      for (const c of p.childrens ?? []) {
        visibleIds.add(c.id);
      }
    }

    const lines = urlSearch.split("\n").map((l) => l.trim()).filter(Boolean);
    const bad: string[] = [];

    for (const line of lines) {
      const match = line.match(/\/(\d+)(?:\?|$)/);
      if (!match) {
        bad.push(line);
        continue;
      }
      const id = parseInt(match[1], 10);
      if (Number.isNaN(id) || !visibleIds.has(id)) {
        bad.push(line);
      }
    }

    return bad;
  }, [filteredProducts, urlSearch]);

  const exportCsv = useCallback(() => {
    const STRAPI_ADMIN_URL =
      "https://strapi.fiftyfourms.com/admin/content-manager/collection-types/api::product.product";
    const PROJECT_URL = "https://fiftyfourms.com";

    const escapeCell = (value: string) => {
      const v = value ?? "";
      const needsQuotes = /[\";\n\r]/.test(v);
      const escaped = v.replace(/\"/g, "\"\"");
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const header = [
      "VarProduct",
      "Product",
      "Admin URL",
      "Product URL",
      "AR Android",
      "AR iPhone",
      "Comment",
    ];

    const rows: string[] = [];
    rows.push(header.map(escapeCell).join(";"));

    const onlyManualIncorrect = statusFilter === "manual_incorrect";
    for (const vp of filteredProducts) {
      const childrenToExport = onlyManualIncorrect
        ? (vp.childrens ?? []).filter((c) => statuses[c.id]?.manualIncorrect)
        : vp.childrens ?? [];
      for (const child of childrenToExport) {
        const adminUrl = `${STRAPI_ADMIN_URL}/${child.id}`;
        const productUrl = child.slug_item
          ? `${PROJECT_URL}/product/${child.slug_item}`
          : "";
        const arAndroid = child.ar_model_and ?? "MISSING";
        const arIphone = child.ar_model_ios ?? "MISSING";
        const comment = statuses[child.id]?.notes ?? "";

        rows.push(
          [
            vp.name ?? "",
            child.name ?? "",
            adminUrl,
            productUrl,
            arAndroid,
            arIphone,
            comment,
          ]
            .map(escapeCell)
            .join(";")
        );
      }
    }

    const csv = `\uFEFF${rows.join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ar-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [filteredProducts, statuses, statusFilter]);

  const stats = useMemo(() => {
    let totalChildren = 0;
    let withArChildren = 0;
    let testedChildren = 0;
    let passedChildren = 0;
    let failedChildren = 0;
    let failedFilledProductCount = 0; // VarProduct, где хоть 1 вариант без AR (iOS/Android)
    let failedEmptyProductCount = 0;  // VarProduct, где ни у одного варианта нет AR
    let humanVerifiedCount = 0;
    let manualIncorrectCount = 0;

    for (const p of products) {
      const children = p.childrens || [];
      const hasAnyWithAr = children.some(
        (c) => !!c.ar_model_ios || !!c.ar_model_and
      );
      const hasAnyWithoutAr = children.some(
        (c) => !c.ar_model_ios && !c.ar_model_and
      );
      const isMixed = hasAnyWithAr && hasAnyWithoutAr;

      for (const c of children) {
        totalChildren++;
        const hasAr = !!c.ar_model_ios || !!c.ar_model_and;
        const status = statuses[c.id];

        if (status?.humanVerified) humanVerifiedCount++;
        if (status?.manualIncorrect) manualIncorrectCount++;

        if (hasAr) {
          withArChildren++;
          if (status) {
            const iosTested = c.ar_model_ios && status.iosStatus !== "not_tested";
            const androidTested = c.ar_model_and && status.androidStatus !== "not_tested";
            if (iosTested || androidTested) testedChildren++;
            if (status.iosStatus === "passed" || status.androidStatus === "passed") passedChildren++;
            if (status.iosStatus === "failed" || status.androidStatus === "failed") failedChildren++;
          }
        } else {
          failedChildren++;
        }
      }

      if (isMixed) failedFilledProductCount++;
      if (children.length > 0 && !hasAnyWithAr) failedEmptyProductCount++;
    }

    return {
      varProducts: products.length,
      total: totalChildren,
      withAr: withArChildren,
      tested: testedChildren,
      passed: passedChildren,
      failed: failedChildren,
      failedFilled: failedFilledProductCount,
      failedEmpty: failedEmptyProductCount,
      humanVerified: humanVerifiedCount,
      manualIncorrect: manualIncorrectCount,
    };
  }, [products, statuses]);

  if (isLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Загрузка продуктов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Ошибка загрузки данных из Strapi</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="ml-4 bg-transparent cursor-pointer"
            title="Повторить загрузку данных из Strapi"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        urlSearch={urlSearch}
        onUrlSearchChange={setUrlSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onExportCsv={exportCsv}
        filteredCount={filteredProducts.length}
        filteredChildrenCount={filteredChildrenCount}
        unmatchedUrls={unmatchedUrls}
        stats={stats}
      />

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Box className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Продукты не найдены</p>
          <p className="text-sm">Попробуйте изменить параметры поиска</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              statuses={statuses}
              showOnlyManualIncorrect={statusFilter === "manual_incorrect"}
              onHumanVerifiedChange={updateHumanVerified}
              onManualIncorrectChange={updateManualIncorrect}
              onNotesChange={updateNotes}
              onUploadModelsSuccess={() => mutate()}
            />
          ))}
        </div>
      )}
    </div>
  );
};
