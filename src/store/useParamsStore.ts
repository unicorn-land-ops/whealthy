'use client';

import { DEFAULT_PARAMS, SEED_PRESETS } from "@/lib/defaults";
import { CashEvent, Params, paramsSchema } from "@/lib/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ParamsState = {
  params: Params;
  setParam: <K extends keyof Params>(key: K, value: Params[K]) => void;
  updateParams: (patch: Partial<Params>) => void;
  applyPreset: (id: string) => void;
  reset: () => void;
  addOneOff: (sign: 1 | -1) => void;
  updateOneOff: (id: string, patch: Partial<CashEvent>) => void;
  removeOneOff: (id: string) => void;
  importFromJson: (payload: string) => { success: true } | { success: false; error: string };
  exportToJson: () => string;
};

const makeId = () => Math.random().toString(36).slice(2, 10);

const mergeParams = (base: Params, patch: Partial<Params>): Params => ({
  ...base,
  ...patch,
  guardrails: {
    ...base.guardrails,
    ...(patch.guardrails ?? {}),
  },
  assetAlloc: {
    ...base.assetAlloc,
    ...(patch.assetAlloc ?? {}),
  },
  assetReturn: {
    ...base.assetReturn,
    ...(patch.assetReturn ?? {}),
  },
  assetVol: {
    ...base.assetVol,
    ...(patch.assetVol ?? {}),
  },
  privCommit: {
    ...base.privCommit,
    ...(patch.privCommit ?? {}),
  },
  holdingCompanyStructure: {
    ...base.holdingCompanyStructure,
    ...(patch.holdingCompanyStructure ?? {}),
  },
  oneOffs: patch.oneOffs ?? base.oneOffs,
});

const storage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<{ params: Params }>(() => localStorage);

export const useParamsStore = create<ParamsState>()(
  persist(
    (set, get) => ({
      params: DEFAULT_PARAMS,
      setParam: (key, value) =>
        set((state) => ({
          params: mergeParams(state.params, { [key]: value } as Partial<Params>),
        })),
      updateParams: (patch) =>
        set((state) => ({
          params: mergeParams(state.params, patch),
        })),
      applyPreset: (id) => {
        const preset = SEED_PRESETS.find((item) => item.id === id);
        if (!preset) return;
        set((state) => ({
          params: mergeParams(state.params, preset.patch),
        }));
      },
      reset: () => set(() => ({ params: { ...DEFAULT_PARAMS, oneOffs: [...DEFAULT_PARAMS.oneOffs] } })),
      addOneOff: (sign) =>
        set((state) => ({
          params: {
            ...state.params,
            oneOffs: [
              ...state.params.oneOffs,
              {
                id: makeId(),
                year: 0,
                amount: sign * 10_000,
                label: sign === 1 ? "Inflow" : "Outflow",
              },
            ],
          },
        })),
      updateOneOff: (id, patch) =>
        set((state) => ({
          params: {
            ...state.params,
            oneOffs: state.params.oneOffs.map((event) =>
              event.id === id ? { ...event, ...patch } : event,
            ),
          },
        })),
      removeOneOff: (id) =>
        set((state) => ({
          params: {
            ...state.params,
            oneOffs: state.params.oneOffs.filter((event) => event.id !== id),
          },
        })),
      importFromJson: (payload) => {
        try {
          const parsed = JSON.parse(payload);
          const result = paramsSchema.safeParse(parsed);
          if (!result.success) {
            return { success: false as const, error: result.error.errors[0]?.message ?? "Invalid data" };
          }
          set(() => ({
            params: {
              ...result.data,
              oneOffs: result.data.oneOffs.map((event) => ({ ...event, id: event.id ?? makeId() })),
            },
          }));
          return { success: true as const };
        } catch (error) {
          return {
            success: false as const,
            error: error instanceof Error ? error.message : "Unable to parse JSON",
          };
        }
      },
      exportToJson: () => JSON.stringify(get().params, null, 2),
    }),
    {
      name: "whealthy-params",
      storage,
      partialize: (state) => ({ params: state.params }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { params?: Partial<Params> };
        if (persisted?.params) {
          // Ensure holdingCompanyStructure is properly merged with defaults
          // IMPORTANT: Preserve all functions from currentState
          return {
            ...currentState, // This includes all the functions (setParam, updateParams, etc.)
            params: mergeParams(DEFAULT_PARAMS, persisted.params),
          };
        }
        return currentState;
      },
    },
  ),
);

