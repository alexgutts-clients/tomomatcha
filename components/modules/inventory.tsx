"use client";

import { useState } from "react";
import { useDerived, useStore } from "@/lib/store";
import { unitLabel } from "@/lib/format";
import { Ingredient, Unit } from "@/lib/types";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  cx,
  DemoTag,
  EmptyState,
  FlagGate,
  PageHeader,
  Stat,
} from "@/components/ui";

/* ------------------------------- Utilidades ---------------------------------- */

type StockFilter = "todos" | "alerta" | "ok";

type StockLevel = "critico" | "resurtir" | "ok";

const STEP: Record<Unit, number> = { g: 25, ml: 250, pza: 1 };

const LEVEL_META: Record<
  StockLevel,
  { label: string; tone: "danger" | "amber" | "matcha"; bar: string }
> = {
  critico: { label: "Crítico", tone: "danger", bar: "bg-danger" },
  resurtir: { label: "Resurtir", tone: "amber", bar: "bg-amber" },
  ok: { label: "En orden", tone: "matcha", bar: "bg-matcha" },
};

const FILTERS: { id: StockFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "alerta", label: "En alerta" },
  { id: "ok", label: "Correctos" },
];

function levelFor(ing: Ingredient): StockLevel {
  if (ing.stock <= ing.min * 0.5) return "critico";
  if (ing.stock <= ing.min) return "resurtir";
  return "ok";
}

function ratioFor(ing: Ingredient): number {
  return ing.stock / Math.max(ing.min, 1);
}

/* --------------------------------- Módulo ------------------------------------ */

export function InventoryModule() {
  const { state, adjustStock, notify } = useStore();
  const { lowStock } = useDerived();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("todos");

  if (state.role === "empleado") return <AccessGate module="Inventario" />;
  if (!state.flags.inventario) return <FlagGate module="Inventario" />;

  const activeMilks = state.milks.filter((m) => m.available).length;
  const nextOut = [...state.ingredients].sort(
    (a, b) => ratioFor(a) - ratioFor(b),
  )[0];

  const counts: Record<StockFilter, number> = {
    todos: state.ingredients.length,
    alerta: lowStock.length,
    ok: state.ingredients.length - lowStock.length,
  };

  const query = search.trim().toLowerCase();
  const visible = state.ingredients
    .filter((ing) => {
      const matchesQuery = !query || ing.name.toLowerCase().includes(query);
      const isAlert = ing.stock <= ing.min;
      const matchesFilter =
        filter === "todos" || (filter === "alerta" ? isAlert : !isAlert);
      return matchesQuery && matchesFilter;
    })
    .sort((a, b) => {
      const aAlert = a.stock <= a.min;
      const bAlert = b.stock <= b.min;
      if (aAlert !== bAlert) return aAlert ? -1 : 1;
      if (aAlert && bAlert) {
        return (
          ratioFor(a) - ratioFor(b) || a.name.localeCompare(b.name, "es")
        );
      }
      return a.name.localeCompare(b.name, "es");
    });

  const clearFilters = () => {
    setSearch("");
    setFilter("todos");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insumos · descuento por receta"
        title="Inventario"
        desc="Cada venta del punto de venta descuenta insumos automáticamente según la receta — incluida la leche que elige el cliente."
        actions={<DemoTag label="Datos de ejemplo" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Insumos registrados"
          value={state.ingredients.length}
          hint="Con descuento automático por venta"
        />
        <Stat
          label="En alerta"
          value={lowStock.length}
          hint={lowStock.length ? "Por debajo del mínimo" : "Nada por resurtir"}
          tone={lowStock.length ? "amber" : "neutral"}
        />
        <Stat
          label="Leches activas"
          value={activeMilks}
          hint={`De ${state.milks.length} opciones en carta`}
        />
        <Stat
          label="Próximo a agotarse"
          value={
            nextOut ? (
              <span className="text-lg leading-6">{nextOut.name}</span>
            ) : (
              "—"
            )
          }
          hint="Según nivel mínimo"
        />
      </div>

      {/* ------------------------------ Controles ------------------------------ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar insumo…"
          aria-label="Buscar insumo por nombre"
          className="focus-ring w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                "focus-ring rounded-full px-4 py-2 text-xs font-extrabold transition",
                filter === f.id
                  ? "bg-ink text-paper"
                  : "border border-line bg-white text-ink hover:border-matcha hover:text-matcha-deep",
              )}
            >
              {f.label} · {counts[f.id]}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------- Lista -------------------------------- */}
      {visible.length ? (
        <div className="space-y-2.5">
          {visible.map((ing) => {
            const meta = LEVEL_META[levelFor(ing)];
            const step = STEP[ing.unit];
            return (
              <Card key={ing.id} className="p-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <div className="min-w-0 flex-1 basis-full md:basis-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-ink">
                        {ing.name}
                      </p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Mínimo: {unitLabel(ing.min, ing.unit)} · Uso semanal:{" "}
                      {unitLabel(ing.weeklyUse, ing.unit)}
                    </p>
                  </div>

                  <div className="w-36 shrink-0" aria-hidden>
                    <div className="h-2 overflow-hidden rounded-full bg-cream">
                      <div
                        className={cx("h-full rounded-full", meta.bar)}
                        style={{
                          width: `${Math.min(ing.stock / Math.max(ing.min * 2, 1), 1) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className="display whitespace-nowrap text-xl text-ink">
                    {Math.round(ing.stock)}
                    <span className="ml-1 text-sm text-muted">{ing.unit}</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustStock(ing.id, -step)}
                      disabled={ing.stock <= 0}
                      aria-label={`Restar ${unitLabel(step, ing.unit)} de ${ing.name}`}
                      className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-base font-extrabold text-ink transition hover:border-matcha hover:text-matcha-deep disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustStock(ing.id, step)}
                      aria-label={`Sumar ${unitLabel(step, ing.unit)} a ${ing.name}`}
                      className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-base font-extrabold text-ink transition hover:border-matcha hover:text-matcha-deep"
                    >
                      +
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        adjustStock(ing.id, step * 8);
                        notify("Entrada registrada (demo)", ing.name);
                      }}
                    >
                      Recibir pedido
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          <p className="pt-1 text-xs text-muted">
            Los ajustes manuales y las entradas son simulados; todo se guarda
            solo en este navegador.
          </p>
        </div>
      ) : (
        <EmptyState
          emoji="🔍"
          title="Sin resultados"
          desc="Ningún insumo coincide con la búsqueda o el filtro actual."
          action={
            <Button variant="ghost" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      )}
    </div>
  );
}
