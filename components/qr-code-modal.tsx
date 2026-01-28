"use client";

import { useState, useEffect } from "react";
import { Apple, Smartphone, Box, Copy, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ModelViewer3d } from "@/components/model-viewer-3d";

export interface QrCodeModalVariant {
  productName: string;
  slugItem?: string;
  iosUrl?: string;
  androidUrl?: string;
}

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: QrCodeModalVariant | null;
  url?: string;
  title?: string;
  platform?: "ios" | "android";
  previewUrl?: string;
  productName?: string;
}

function toProxyUrl(raw: string): string {
  if (!raw.startsWith("http")) return raw;
  // Используем прокси для всех моделей, чтобы обойти CORS
  // Прокси правильно обрабатывает бинарные данные (.glb и .usdz)
  return `/api/proxy-model?url=${encodeURIComponent(raw)}`;
}

function isUsdz(url: string): boolean {
  const u = url.toLowerCase();
  return u.endsWith(".usdz") || u.includes(".usdz?");
}

function IosUsdzFallback({ url }: { url: string; productName: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-4 min-h-[280px] justify-center">
      <p className="text-sm text-muted-foreground text-center">
        Модель для iPhone (.usdz) не загрузилась в этом браузере. В Safari на macOS/iOS модель должна открываться. Скопируйте ссылку для просмотра на устройстве.
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Скопировано" : "Скопировать ссылку"}
        </Button>
        <Button asChild size="sm" className="gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Открыть
          </a>
        </Button>
      </div>
    </div>
  );
}

export const QrCodeModal = ({
  open,
  onOpenChange,
  variant = null,
  title,
}: QrCodeModalProps) => {
  const useVariant = variant && (variant.iosUrl || variant.androidUrl);
  const hasIos = !!(useVariant && variant!.iosUrl);
  const hasAndroid = !!(useVariant && variant!.androidUrl);
  const hasBoth = hasIos && hasAndroid;

  const [platform, setPlatform] = useState<"ios" | "android">("android");

  useEffect(() => {
    if (!useVariant) return;
    setPlatform(hasAndroid ? "android" : "ios");
  }, [useVariant?.productName, hasAndroid, hasIos]);

  const rawModelUrl = useVariant
    ? (platform === "android" ? variant!.androidUrl : variant!.iosUrl) ?? variant!.androidUrl ?? variant!.iosUrl
    : null;
  // Используем прокси для всех моделей, чтобы обойти CORS
  const modelSrc = rawModelUrl ? toProxyUrl(rawModelUrl) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-5">
        <DialogHeader>
          <DialogTitle className="pr-8">
            {useVariant ? variant!.productName : title || "Модель 3D"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {open && useVariant && (
            <>
              {hasBoth ? (
                <Tabs
                  value={platform}
                  onValueChange={(v) => setPlatform(v as "ios" | "android")}
                  className="w-full space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                      Модель 3D
                    </div>
                    <TabsList className="h-9">
                      <TabsTrigger value="android" className="gap-1.5 text-xs px-3">
                        <Smartphone className="h-3.5 w-3" />
                        Android
                      </TabsTrigger>
                      <TabsTrigger value="ios" className="gap-1.5 text-xs px-3">
                        <Apple className="h-3.5 w-3" />
                        iPhone
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="text-xs text-muted-foreground break-all bg-muted/30 px-2 py-1.5 rounded border border-border">
                    {rawModelUrl || modelSrc}
                  </div>
                  <ModelViewer3d
                    key={platform}
                    src={modelSrc}
                    alt={variant!.productName}
                    height={280}
                    className="w-full"
                    rawUrl={rawModelUrl || undefined}
                    onErrorFallback={
                      platform === "ios" && rawModelUrl && isUsdz(rawModelUrl)
                        ? () => (
                          <IosUsdzFallback
                            url={rawModelUrl}
                            productName={variant!.productName}
                          />
                        )
                        : undefined
                    }
                  />
                </Tabs>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                    Модель 3D
                    {hasAndroid && (
                      <span className="text-xs font-normal text-muted-foreground">
                        (Android)
                      </span>
                    )}
                    {hasIos && !hasAndroid && (
                      <span className="text-xs font-normal text-muted-foreground">
                        (iPhone)
                      </span>
                    )}
                  </div>
                  {modelSrc && (
                    <>
                      <div className="text-xs text-muted-foreground break-all bg-muted/30 px-2 py-1.5 rounded border border-border">
                        {rawModelUrl || modelSrc}
                      </div>
                      <ModelViewer3d
                        src={modelSrc}
                        alt={variant!.productName}
                        height={280}
                        className="w-full"
                        rawUrl={rawModelUrl || undefined}
                        onErrorFallback={
                          hasIos && rawModelUrl && isUsdz(rawModelUrl)
                            ? () => (
                              <IosUsdzFallback
                                url={rawModelUrl}
                                productName={variant!.productName}
                              />
                            )
                            : undefined
                        }
                      />
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Вращайте мышью или касаниями, чтобы осмотреть модель.
                  </p>
                </div>
              )}
            </>
          )}

          {hasBoth && (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              Выберите вкладку, чтобы посмотреть версию модели для Android или iPhone.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
