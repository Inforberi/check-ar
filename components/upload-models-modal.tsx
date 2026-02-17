"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ANDROID_EXT = ".glb";
const IOS_EXT = ".usdz";

function isValidAndroid(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(ANDROID_EXT);
}

function isValidIos(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(IOS_EXT);
}

interface DropSlotProps {
  label: string;
  accept: string;
  isValid: (file: File) => boolean;
  file: File | null;
  error: string | null;
  onFile: (file: File | null) => void;
  icon: React.ReactNode;
}

function DropSlot({ label, accept, isValid, file, error, onFile, icon }: DropSlotProps) {
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (!f) return;
      onFile(f);
    },
    [onFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      onFile(f);
      e.target.value = "";
    },
    [onFile]
  );

  const clear = useCallback(() => onFile(null), [onFile]);

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          drag && "border-primary/50 bg-primary/5",
          file && "border-emerald-500/50 bg-emerald-500/5",
          error && "border-destructive/50 bg-destructive/5",
          !file && !error && !drag && "border-border bg-muted/30"
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleInput}
          className="hidden"
          id={`upload-${label.replace(/\s/g, "-")}`}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-foreground">{file.name}</span>
            <Button type="button" variant="outline" size="sm" onClick={clear}>
              Удалить
            </Button>
          </div>
        ) : (
          <label
            htmlFor={`upload-${label.replace(/\s/g, "-")}`}
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            {icon}
            <span className="text-sm text-muted-foreground">
              Перетащите файл сюда или нажмите для выбора
            </span>
            <span className="text-xs text-muted-foreground">({accept})</span>
          </label>
        )}
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}

export interface UploadModelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  varProductId: number;
  /** id (Strapi 4) или documentId (Strapi 5) для PUT /api/products/:id */
  childIds: (number | string)[];
  onSuccess?: () => void;
}

export function UploadModelsModal({
  open,
  onOpenChange,
  varProductId,
  childIds,
  onSuccess,
}: UploadModelsModalProps) {
  const [androidFile, setAndroidFile] = useState<File | null>(null);
  const [iosFile, setIosFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const androidError =
    androidFile && !isValidAndroid(androidFile)
      ? `Нужен файл с расширением ${ANDROID_EXT}`
      : null;
  const iosError =
    iosFile && !isValidIos(iosFile)
      ? `Нужен файл с расширением ${IOS_EXT}`
      : null;

  const validAndroid = androidFile && isValidAndroid(androidFile);
  const validIos = iosFile && isValidIos(iosFile);
  // Можно загрузить только Android, только iOS, или оба
  const canSubmit = (validAndroid || validIos) && childIds.length > 0 && !loading;

  const handleSubmit = useCallback(async () => {
    if ((!validAndroid && !validIos) || childIds.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      if (androidFile && validAndroid) {
        form.append("android", androidFile);
      }
      if (iosFile && validIos) {
        form.append("ios", iosFile);
      }
      form.append("varProductId", String(varProductId));
      form.append("childIds", JSON.stringify(childIds));

      const res = await fetch("/api/upload-models", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      onSuccess?.();
      onOpenChange(false);
      setAndroidFile(null);
      setIosFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [
    validAndroid,
    validIos,
    androidFile,
    iosFile,
    childIds,
    varProductId,
    onSuccess,
    onOpenChange,
    loading,
  ]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !loading) {
        setAndroidFile(null);
        setIosFile(null);
        setError(null);
      }
      onOpenChange(next);
    },
    [loading, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Загрузить AR-модели</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-2">
          <DropSlot
            label="Android (.glb)"
            accept={ANDROID_EXT}
            isValid={isValidAndroid}
            file={androidFile}
            error={androidError}
            onFile={setAndroidFile}
            icon={<Smartphone className="h-10 w-10 text-muted-foreground" />}
          />
          <DropSlot
            label="iPhone (.usdz)"
            accept={IOS_EXT}
            isValid={isValidIos}
            file={iosFile}
            error={iosError}
            onFile={setIosFile}
            icon={<Apple className="h-10 w-10 text-muted-foreground" />}
          />
          {childIds.length === 0 && (
            <p className="text-sm text-amber-600">
              Нет вариантов для загрузки. Отметьте хотя бы один вариант «Некорректно (вручную)» для загрузки в некорректные.
            </p>
          )}
          {childIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Модели будут привязаны к {childIds.length} варианту(ам). Можно загрузить только Android, только iOS, или оба файла.
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Загрузить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
