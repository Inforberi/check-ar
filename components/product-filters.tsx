"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Link2, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type FilterStatus =
  | "all"
  | "with_ar"
  | "tested"
  | "not_tested"
  | "failed"
  | "failed_filled"
  | "failed_empty"
  | "human_verified"
  | "manual_incorrect";

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  urlSearch: string;
  onUrlSearchChange: (urls: string) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (status: FilterStatus) => void;
  onExportCsv?: () => void;
  filteredCount: number;
  filteredChildrenCount: number;
  unmatchedUrls?: string[];
  stats: {
    varProducts: number;
    total: number;
    withAr: number;
    tested: number;
    passed: number;
    failed: number;
    failedFilled: number;
    failedEmpty: number;
    humanVerified: number;
    manualIncorrect: number;
  };
}

export const ProductFilters = ({
  searchQuery,
  onSearchChange,
  urlSearch,
  onUrlSearchChange,
  statusFilter,
  onStatusFilterChange,
  onExportCsv,
  filteredCount,
  filteredChildrenCount,
  unmatchedUrls,
  stats,
}: ProductFiltersProps) => {
  const [urlSearchOpen, setUrlSearchOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>(statusFilter);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setSelectedFilter(statusFilter);
  }, [statusFilter]);

  const urlCount = useMemo(
    () => urlSearch.split("\n").filter((l) => l.trim()).length,
    [urlSearch]
  );

  const handleFind = () => {
    setIsApplying(true);
    onStatusFilterChange(selectedFilter);
    setTimeout(() => setIsApplying(false), 500);
  };

  const filterLabels: Record<FilterStatus, string> = {
    all: "Все продукты",
    with_ar: "С AR-моделями",
    tested: "Протестированные",
    not_tested: "Не проверенные",
    failed: "С ошибками",
    failed_filled: "Хоть 1 не заполнен",
    failed_empty: "Ни одного не заполнено",
    human_verified: "Проверено человеком",
    manual_incorrect: "Некорректно (вручную)",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary/50 border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            variant={urlSearchOpen ? "secondary" : "outline"}
            size="icon"
            onClick={() => setUrlSearchOpen(!urlSearchOpen)}
            className="shrink-0 bg-transparent"
            title="Поиск по URL Strapi"
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Select value={selectedFilter} onValueChange={(v) => setSelectedFilter(v as FilterStatus)}>
            <SelectTrigger className="w-[180px] bg-secondary/50 border-border">
              <Filter className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Все продукты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все продукты</SelectItem>
              <SelectItem value="with_ar">С AR-моделями</SelectItem>
              <SelectItem value="tested">Протестированные</SelectItem>
              <SelectItem value="not_tested">Не проверенные</SelectItem>
              <SelectItem value="failed">С ошибками</SelectItem>
              <SelectItem value="failed_filled">Хоть 1 не заполнен</SelectItem>
              <SelectItem value="failed_empty">Ни одного не заполнено</SelectItem>
              <SelectItem value="human_verified">Проверено человеком</SelectItem>
              <SelectItem value="manual_incorrect">Некорректно (вручную)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleFind}
            disabled={isApplying}
            className="shrink-0 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            title="Применить фильтр"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isApplying ? "Применяем…" : "Найти"}
          </Button>
          {onExportCsv && (
            <Button
              variant="outline"
              onClick={onExportCsv}
              className="shrink-0 gap-2 bg-transparent cursor-pointer"
              title="Выгрузить текущий список в CSV"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          )}
        </div>
      </div>

      {/* Подсказка: какой фильтр сейчас применён */}
      {statusFilter !== "all" && (
        <p className="text-sm text-muted-foreground">
          Показано: <span className="text-foreground font-medium">{filterLabels[statusFilter]}</span>
        </p>
      )}

      <Collapsible open={urlSearchOpen} onOpenChange={setUrlSearchOpen}>
        <CollapsibleContent className="space-y-2">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Массовый поиск по URL (по одному на строку)
            </label>
            <Textarea
              placeholder="https://strapi.fiftyfourms.com/admin/.../123&#10;https://strapi.fiftyfourms.com/admin/.../456"
              value={urlSearch}
              onChange={(e) => onUrlSearchChange(e.target.value)}
              className="min-h-[80px] bg-secondary/50 border-border font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Вставьте URL из Strapi Admin. Будут извлечены ID продуктов. Ссылок:{" "}
              <span className="text-foreground font-medium">{urlCount}</span>, var-продуктов:{" "}
              <span className="text-foreground font-medium">{filteredCount}</span>, продуктов
              (вариантов):{" "}
              <span className="text-foreground font-medium">{filteredChildrenCount}</span>
              {unmatchedUrls && unmatchedUrls.length > 0 && (
                <>
                  , не найдено:{" "}
                  <span className="text-red-400 font-medium">
                    {unmatchedUrls.length}
                  </span>
                </>
              )}
            </p>
            {unmatchedUrls && unmatchedUrls.length > 0 && (
              <div className="mt-1 space-y-1 text-xs text-red-400">
                <p>
                  Ссылки без совпадений (с учётом текущих фильтров), всего{" "}
                  {unmatchedUrls.length}:
                </p>
                <div className="max-h-32 overflow-auto rounded border border-red-500/30 bg-red-500/5 p-2 font-mono">
                  {unmatchedUrls.map((u, i) => (
                    <p key={`${u}-${i}`} className="break-all">
                      {u}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
          VarProducts: {stats.varProducts}
        </Badge>
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
          Всего продуктов: {stats.total}
        </Badge>
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
          С AR: {stats.withAr}
        </Badge>
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
          Прошло: {stats.passed}
        </Badge>
        <Badge variant="outline" className="border-red-500/50 text-red-400">
          Ошибки: {stats.failed}
        </Badge>
        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
          Проверено: {stats.humanVerified}
        </Badge>
        <Badge variant="outline" className="border-border text-muted-foreground">
          Не проверено: {stats.withAr - stats.tested}
        </Badge>
        <Badge variant="outline" className="border-red-500/50 text-red-400">
          Некорректно (вручную): {stats.manualIncorrect}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={
            statusFilter === "failed_filled"
              ? "border-amber-500/50 text-amber-400 bg-amber-500/10 cursor-pointer"
              : "border-amber-500/30 text-amber-400/80 cursor-pointer hover:bg-amber-500/10"
          }
          title="Показать карточки, где есть и варианты с AR, и варианты без AR"
          onClick={() => {
            setSelectedFilter("failed_filled");
            onStatusFilterChange("failed_filled");
          }}
        >
          Хоть 1 не заполнен: {stats.failedFilled}
        </Badge>
        <Badge
          variant="outline"
          className={
            statusFilter === "failed_empty"
              ? "border-red-500/50 text-red-400 bg-red-500/10 cursor-pointer"
              : "border-red-500/30 text-red-400/80 cursor-pointer hover:bg-red-500/10"
          }
          title="Показать карточки, где ни у одного варианта нет AR (iOS и Android пусто)"
          onClick={() => {
            setSelectedFilter("failed_empty");
            onStatusFilterChange("failed_empty");
          }}
        >
          Ни одного не заполнено: {stats.failedEmpty}
        </Badge>
      </div>
    </div>
  );
};
