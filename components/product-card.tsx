"use client";

import { useState } from "react";
import { ExternalLink, Smartphone, Apple, Box, Upload } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { QrCodeModal, type QrCodeModalVariant } from "@/components/qr-code-modal";
import { UploadModelsModal } from "@/components/upload-models-modal";
import type { VarProduct, ProductChild, ProductTestStatus } from "@/lib/types";

interface ProductCardProps {
  product: VarProduct;
  statuses: Record<number, ProductTestStatus>;
  /** При включённом фильтре «Некорректно» в карточке показывать только варианты с manualIncorrect */
  showOnlyManualIncorrect?: boolean;
  onHumanVerifiedChange: (productId: number, verified: boolean) => void;
  onManualIncorrectChange: (productId: number, incorrect: boolean) => void;
  onNotesChange: (productId: number, notes: string) => void;
  /** После успешной загрузки AR-моделей (опционально — обновить список продуктов) */
  onUploadModelsSuccess?: () => void;
}

const STRAPI_ADMIN_URL = "https://strapi.fiftyfourms.com/admin/content-manager/collection-types/api::product.product";
const PROJECT_URL = "https://fiftyfourms.com";
const MEDIA_BASE_URL = "https://media.fiftyfourms.com";

export const ProductCard = ({
  product,
  statuses,
  showOnlyManualIncorrect = false,
  onHumanVerifiedChange,
  onManualIncorrectChange,
  onNotesChange,
  onUploadModelsSuccess,
}: ProductCardProps) => {
  const [qrModal, setQrModal] = useState<{
    open: boolean;
    variant: QrCodeModalVariant | null;
  }>({ open: false, variant: null });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const allChildren = product.childrens || [];
  const children = showOnlyManualIncorrect
    ? allChildren.filter((c) => statuses[c.id]?.manualIncorrect)
    : allChildren;
  const childIdsForUpload = allChildren
    .filter((c) => statuses[c.id]?.manualIncorrect)
    .map((c) => c.id);

  const withArCount = allChildren.filter(
    (c) => c.ar_model_ios || c.ar_model_and
  ).length;
  const totalChildren = allChildren.length;

  const getFullUrl = (url: string | undefined) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${MEDIA_BASE_URL}${url}`;
  };

  const openQrModalForChild = (child: ProductChild) => {
    setQrModal({
      open: true,
      variant: {
        productName: child.name,
        slugItem: child.slug_item,
        iosUrl: child.ar_model_ios ? getFullUrl(child.ar_model_ios) : undefined,
        androidUrl: child.ar_model_and ? getFullUrl(child.ar_model_and) : undefined,
      },
    });
  };

  return (
    <>
      <Card className="overflow-hidden border-2 border-border bg-muted/30">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground text-base leading-tight text-balance">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                {showOnlyManualIncorrect
                  ? `${children.length} из ${totalChildren} некорректные`
                  : `${withArCount} из ${totalChildren} с AR`}
              </p>
            </div>
            <Badge
              variant="secondary"
              className="bg-secondary text-secondary-foreground text-xs shrink-0"
            >
              ID: {product.id}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Нет вариантов для отображения
            </p>
          ) : (
            children.map((child) => {
              const heroUrl = child.hero_image ? getFullUrl(child.hero_image) : null;
              const iosUrl = child.ar_model_ios;
              const androidUrl = child.ar_model_and;
              const hasAr = !!iosUrl || !!androidUrl;

              return (
                <div
                  key={child.id}
                  {...(hasAr
                    ? {
                      role: "button" as const,
                      tabIndex: 0,
                      onClick: () => openQrModalForChild(child),
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openQrModalForChild(child);
                        }
                      },
                    }
                    : {})}
                  className={`rounded-xl border border-border bg-secondary/30 p-5 space-y-4 ${hasAr ? "cursor-pointer hover:bg-secondary/50 transition-colors" : ""}`}
                >
                  {/* Ряд 1: превью + название + бейдж */}
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                      {heroUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external CDN, native img loads reliably
                        <img
                          src={heroUrl}
                          alt={child.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Box className="h-8 w-8 text-muted-foreground/50" aria-hidden />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                          {child.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground border-border shrink-0"
                        >
                          #{child.id}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Наличие AR: зелёный = есть, красный = нет (карточка целиком открывает модалку) */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {iosUrl ? (
                      <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                        <Apple className="h-4 w-4 shrink-0" />
                        <span>iPhone AR</span>
                        <span className="text-emerald-300">есть</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-80" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/40">
                        <Apple className="h-4 w-4 shrink-0" />
                        <span>iPhone AR</span>
                        <span className="text-red-300">нет</span>
                      </div>
                    )}
                    {androidUrl ? (
                      <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                        <Smartphone className="h-4 w-4 shrink-0" />
                        <span>Android AR</span>
                        <span className="text-emerald-300">есть</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-80" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/40">
                        <Smartphone className="h-4 w-4 shrink-0" />
                        <span>Android AR</span>
                        <span className="text-red-300">нет</span>
                      </div>
                    )}
                  </div>

                  {/* Комментарий: если чего-то не хватает — можно описать */}
                  <div
                    className="space-y-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <label htmlFor={`notes-${child.id}`} className="text-xs text-muted-foreground">
                      Комментарий (если чего-то не хватает — опишите здесь)
                    </label>
                    <Textarea
                      id={`notes-${child.id}`}
                      placeholder="Например: не открывается на Android, битая модель, нет текстуры…"
                      value={statuses[child.id]?.notes ?? ""}
                      onChange={(e) => onNotesChange(child.id, e.target.value)}
                      className="min-h-[60px] text-sm resize-y bg-background/50 border-border"
                    />
                  </div>

                  {/* Чекбокс и ссылки — клик не открывает модалку */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`human-verified-${child.id}`}
                          checked={statuses[child.id]?.humanVerified || false}
                          onCheckedChange={(checked) =>
                            onHumanVerifiedChange(child.id, checked === true)
                          }
                          title="Пометить вариант как корректный (OK), сохраняется в базе"
                        />
                        <label
                          htmlFor={`human-verified-${child.id}`}
                          className={`text-sm cursor-pointer select-none ${statuses[child.id]?.humanVerified
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                            }`}
                          title="Пометить вариант как корректный (OK), сохраняется в базе"
                        >
                          Проверено OK
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`manual-incorrect-${child.id}`}
                          checked={statuses[child.id]?.manualIncorrect || false}
                          onCheckedChange={(checked) =>
                            onManualIncorrectChange(child.id, checked === true)
                          }
                          title="Пометить вариант как некорректный вручную (сохраняется в базе)"
                        />
                        <label
                          htmlFor={`manual-incorrect-${child.id}`}
                          className={`text-sm cursor-pointer select-none ${statuses[child.id]?.manualIncorrect
                            ? "text-red-400"
                            : "text-muted-foreground"
                            }`}
                          title="Пометить вариант как некорректный вручную (сохраняется в базе)"
                        >
                          Некорректно (вручную)
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {child.slug_item && (
                        <a
                          href={`${PROJECT_URL}/product/${child.slug_item}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Открыть публичную страницу товара"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Проект
                        </a>
                      )}
                      <a
                        href={`${STRAPI_ADMIN_URL}/${child.id}?plugins[i18n][locale]=ru`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Открыть этот вариант в Strapi Admin"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Strapi Admin
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Загрузить модели
            </Button>
          </div>
        </CardContent>
      </Card>

      <UploadModelsModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        varProductId={product.id}
        childIds={childIdsForUpload}
        onSuccess={onUploadModelsSuccess}
      />

      <QrCodeModal
        open={qrModal.open}
        onOpenChange={(open) => setQrModal((prev) => ({ ...prev, open }))}
        variant={qrModal.variant}
      />
    </>
  );
};
