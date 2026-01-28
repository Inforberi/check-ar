"use client";

import { Check, X, Circle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { TestStatus } from "@/lib/types";

interface StatusButtonProps {
  status: TestStatus;
  onStatusChange: (status: TestStatus) => void;
}

const statusConfig: Record<
  TestStatus,
  { icon: typeof Check; className: string; label: string }
> = {
  not_tested: {
    icon: Circle,
    className: "text-muted-foreground hover:text-foreground",
    label: "Не проверено",
  },
  passed: {
    icon: Check,
    className: "text-emerald-400 hover:text-emerald-300",
    label: "Прошло",
  },
  failed: {
    icon: X,
    className: "text-red-400 hover:text-red-300",
    label: "Не прошло",
  },
};

export const StatusButton = ({ status, onStatusChange }: StatusButtonProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={`h-6 w-6 p-0 cursor-pointer ${config.className}`}
          title={`Статус: ${config.label}`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only">{config.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => onStatusChange("passed")}
          className="gap-2"
          title="Поставить статус: Прошло"
        >
          <Check className="h-4 w-4 text-emerald-400" />
          Прошло
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onStatusChange("failed")}
          className="gap-2"
          title="Поставить статус: Не прошло"
        >
          <X className="h-4 w-4 text-red-400" />
          Не прошло
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onStatusChange("not_tested")}
          className="gap-2"
          title="Сбросить статус на: Не проверено"
        >
          <Circle className="h-4 w-4 text-muted-foreground" />
          Сбросить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
