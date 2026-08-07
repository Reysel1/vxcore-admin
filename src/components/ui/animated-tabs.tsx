"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type AnimatedTab<T extends string> = {
  value: T;
  label: string;
  /** Contador opcional a la derecha de la etiqueta. */
  count?: number;
  icon?: LucideIcon;
};

/**
 * Pestañas con indicador deslizante.
 *
 * No usa `Tabs` de Radix a propósito: aquí las cuatro pestañas comparten un
 * único panel (solo cambia el filtro de la lista), y Radix exige un `Content`
 * por pestaña — lo que obligaría a duplicar el panel o a dejar los
 * `aria-controls` apuntando a nodos que no existen. Con un tablist propio el
 * teclado y el ARIA quedan correctos: flechas, Inicio/Fin y tabindex móvil.
 */
export function AnimatedTabs<T extends string>({
  items,
  value,
  onValueChange,
  /** Debe ser único por instancia: identifica el indicador que se desliza. */
  layoutId,
  panelId,
  className,
}: {
  items: readonly AnimatedTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  layoutId: string;
  panelId: string;
  className?: string;
}) {
  const refs = React.useRef(new Map<T, HTMLButtonElement>());

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.value === value);
    if (index < 0) return;

    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % items.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextValue = items[next].value;
    onValueChange(nextValue);
    refs.current.get(nextValue)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              if (el) refs.current.set(item.value, el);
              else refs.current.delete(item.value);
            }}
            type="button"
            role="tab"
            id={`${panelId}-tab-${item.value}`}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-background shadow-sm ring-1 ring-foreground/10"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            {item.icon && <item.icon className="relative size-3.5" />}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "relative rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-foreground/10 text-muted-foreground"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
