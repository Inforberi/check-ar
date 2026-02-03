"use client";

import { useState, useMemo } from "react";
import { Search, Link2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type FilterStatus =
  | "all"
  | "all_variants"
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
  // Статистика из отфильтрованного списка
  filteredStats: {
    varProducts: number;
    totalProducts: number;
  };
  // Полная статистика из всех продуктов
  fullStats: {
    varProducts: number;
    totalProducts: number;
    humanVerified: number;
    manualIncorrect: number;
    notChecked: number;
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
  filteredStats,
  fullStats,
}: ProductFiltersProps) => {
  const [urlSearchOpen, setUrlSearchOpen] = useState(false);

  const urlCount = useMemo(
    () => urlSearch.split("\n").filter((l) => l.trim()).length,
    [urlSearch]
  );

  return (
    <div className="space-y-4">
      {/* Полная статистика (из всех продуктов) - выше поиска */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
          VarProducts: {fullStats.varProducts}
        </Badge>
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
          Всего продуктов: {fullStats.totalProducts}
        </Badge>
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
          Проверено OK: {fullStats.humanVerified}
        </Badge>
        <Badge variant="outline" className="border-red-500/50 text-red-400">
          Некорректно (вручную): {fullStats.manualIncorrect}
        </Badge>
        <Badge variant="outline" className="border-border text-muted-foreground">
          Не проверено: {fullStats.notChecked}
        </Badge>
      </div>

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

      {/* Кнопки фильтрации */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("all")}
          className={
            statusFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent"
          }
          title="Показать все группы продуктов (Var-продукты)"
        >
          Все группы продуктов
        </Button>
        <Button
          variant={statusFilter === "all_variants" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("all_variants")}
          className={
            statusFilter === "all_variants"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent"
          }
          title="Показать варианты без отметок 'Проверено OK' и 'Некорректно'"
        >
          Варианты без отметок
        </Button>
        <Button
          variant={statusFilter === "human_verified" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("human_verified")}
          className={
            statusFilter === "human_verified"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent"
          }
          title="Показать варианты, отмеченные как проверенные"
        >
          Проверено OK
        </Button>
        <Button
          variant={statusFilter === "manual_incorrect" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("manual_incorrect")}
          className={
            statusFilter === "manual_incorrect"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent"
          }
          title="Показать варианты, отмеченные как некорректные"
        >
          Некорректно (вручную)
        </Button>
      </div>

      {/* Статистика из отфильтрованного списка */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
          VarProducts в фильтре: {filteredStats.varProducts}
        </Badge>
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
          Продуктов в фильтре: {filteredStats.totalProducts}
        </Badge>
      </div>
    </div>
  );
};
