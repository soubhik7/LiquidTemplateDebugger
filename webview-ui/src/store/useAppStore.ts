import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, AccentColor, InspectorTab, WebUIState } from '../types/app';
import type { Toast, PanelSizes } from '../types/ui';
import { nanoid } from '../utils/helpers';
import { ACCENT_COLORS } from '../utils/constants';

interface AppState {
  // Debugger state
  debugState: WebUIState | null;
  isLoading: boolean;

  // Expanded rows
  expandedVars: Set<string>;
  expandedWatches: Set<number>;

  // Inspector
  activeInspectorTab: InspectorTab;
  varFilter: string;

  // Toasts
  toasts: Toast[];

  // Theme
  theme: Theme;
  accentColor: AccentColor;

  // Layout
  sidebarCollapsed: boolean;
  panelSizes: PanelSizes;

  // Load modal
  showLoadModal: boolean;

  // Template editing
  templateEditMode: boolean;
  dataEditMode: boolean;

  // Actions
  setDebugState: (state: WebUIState | null) => void;
  setLoading: (v: boolean) => void;
  toggleVarExpand: (name: string) => void;
  toggleWatchExpand: (id: number) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setVarFilter: (v: string) => void;
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (t: Theme) => void;
  setAccentColor: (c: AccentColor) => void;
  toggleSidebar: () => void;
  setPanelSizes: (s: Partial<PanelSizes>) => void;
  setShowLoadModal: (v: boolean) => void;
  setTemplateEditMode: (v: boolean) => void;
  setDataEditMode: (v: boolean) => void;
  clearExpandedState: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      debugState: null,
      isLoading: false,
      expandedVars: new Set(),
      expandedWatches: new Set(),
      activeInspectorTab: 'watches',
      varFilter: '',
      toasts: [],
      theme: 'dark',
      accentColor: 'indigo',
      sidebarCollapsed: true,
      panelSizes: { col1: 33.33, col2: 33.33, col3: 33.34, inputRatio: 50, varsRatio: 60 },
      showLoadModal: false,
      templateEditMode: false,
      dataEditMode: false,

      setDebugState: (state) => set({ debugState: state }),
      setLoading: (v) => set({ isLoading: v }),

      toggleVarExpand: (name) =>
        set((s) => {
          const next = new Set(s.expandedVars);
          if (next.has(name)) next.delete(name);
          else next.add(name);
          return { expandedVars: next };
        }),

      toggleWatchExpand: (id) =>
        set((s) => {
          const next = new Set(s.expandedWatches);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { expandedWatches: next };
        }),

      setInspectorTab: (tab) => set({ activeInspectorTab: tab }),
      setVarFilter: (v) => set({ varFilter: v }),

      addToast: (t) =>
        set((s) => ({
          toasts: [...s.toasts, { ...t, id: nanoid() }],
        })),

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setTheme: (t) => set({ theme: t }),
      setAccentColor: (c) => set({ accentColor: c }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPanelSizes: (s) => set((prev) => ({ panelSizes: { ...prev.panelSizes, ...s } })),
      setShowLoadModal: (v) => set({ showLoadModal: v }),
      setTemplateEditMode: (v) => set({ templateEditMode: v }),
      setDataEditMode: (v) => set({ dataEditMode: v }),
      clearExpandedState: () => set({ expandedVars: new Set(), expandedWatches: new Set() }),
    }),
    {
      name: 'liquid-debugger-ui',
      partialize: (s) => ({
        theme: s.theme,
        accentColor: s.accentColor,
        sidebarCollapsed: s.sidebarCollapsed,
        panelSizes: s.panelSizes,
        activeInspectorTab: s.activeInspectorTab,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AppState>),
        // Always start with fresh expanded state and non-serializable Sets
        expandedVars: new Set(),
        expandedWatches: new Set(),
      }),
    }
  )
);

// Derived selector for accent hex
export function getAccentHex(color: AccentColor): string {
  return ACCENT_COLORS.find((c) => c.value === color)?.hex ?? '#6366f1';
}
