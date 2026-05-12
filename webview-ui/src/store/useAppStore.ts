import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, AccentColor, InspectorTab, WebUIState } from '../types/app';
import type { Toast, PanelSizes } from '../types/ui';
import type { AIConfiguration } from '../types/generation';
import { nanoid } from '../utils/helpers';
import { ACCENT_COLORS } from '../utils/constants';

interface AppState {
  // Debugger state
  debugState: WebUIState | null;
  isLoading: boolean;

  // Expanded rows
  expandedVars: Set<string>;
  expandedWatches: Set<number>;
  expandedBreakpoints: Set<number>;

  // Inspector
  activeInspectorTab: InspectorTab;
  varFilter: string;

  // Toasts
  toasts: Toast[];

  // Theme
  theme: Theme;
  accentColor: AccentColor;

  // Layout

  panelSizes: PanelSizes;

  // Load modal
  showLoadModal: boolean;

  // Template editing
  templateEditMode: boolean;
  dataEditMode: boolean;

  // Navigation
  activeView: 'debugger' | 'settings' | 'guide' | 'generator';
  validationErrors: any[];
  setActiveView: (view: 'debugger' | 'settings' | 'guide' | 'generator') => void;
  setValidationErrors: (errors: any[]) => void;

  // AI Configuration
  aiConfig: AIConfiguration;
  showGenerateModal: boolean;
  setAIConfig: (config: Partial<AIConfiguration>) => void;
  setShowGenerateModal: (show: boolean) => void;
  
  // Generator State
  generatorState: {
    prompt: string;
    data: string;
    format: string;
    mappingDetails: string;
    generatedTemplate: string;
    showResult: boolean;
  };
  setGeneratorState: (state: Partial<AppState['generatorState']>) => void;

  // Actions
  setDebugState: (state: WebUIState | null) => void;
  setLoading: (v: boolean) => void;
  toggleVarExpand: (name: string) => void;
  toggleWatchExpand: (id: number) => void;
  toggleBreakpointExpand: (id: number) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setVarFilter: (v: string) => void;
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (t: Theme) => void;
  setAccentColor: (c: AccentColor) => void;

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
      expandedBreakpoints: new Set(),
      activeInspectorTab: 'watches',
      varFilter: '',
      toasts: [],
      theme: 'dark',
      accentColor: 'indigo',

      panelSizes: { col1: 33.33, col2: 33.33, col3: 33.34, inputRatio: 50, varsRatio: 60 },
      showLoadModal: false,
      templateEditMode: false,
      dataEditMode: false,
      activeView: 'debugger',
      validationErrors: [],
      
      // AI Configuration
      aiConfig: {
        enabled: false,
        apiKey: undefined,
        defaultModel: 'gemini-3.1-flash-lite',
        sensitivePatterns: [],
        maxRetries: 3,
        timeoutSeconds: 30,
      },
      showGenerateModal: false,

      // Generator State
      generatorState: {
        prompt: '',
        data: '',
        format: 'json',
        mappingDetails: '',
        generatedTemplate: '',
        showResult: false,
      },

      setActiveView: (view) => set({ activeView: view }),
      setAIConfig: (config) => set((s) => ({ aiConfig: { ...s.aiConfig, ...config } })),
      setShowGenerateModal: (show) => set({ showGenerateModal: show }),
      setGeneratorState: (state) => set((s) => ({ generatorState: { ...s.generatorState, ...state } })),
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

      toggleBreakpointExpand: (id) =>
        set((s) => {
          const next = new Set(s.expandedBreakpoints);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { expandedBreakpoints: next };
        }),

      setInspectorTab: (tab) => set({ activeInspectorTab: tab }),
      setVarFilter: (v) => set({ varFilter: v }),
      setValidationErrors: (errors) => set({ validationErrors: errors }),

      addToast: (t) =>
        set((s) => ({
          toasts: [...s.toasts, { ...t, id: nanoid() }],
        })),

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setTheme: (t) => set({ theme: t }),
      setAccentColor: (c) => set({ accentColor: c }),

      setPanelSizes: (s) => set((prev) => ({ panelSizes: { ...prev.panelSizes, ...s } })),
      setShowLoadModal: (v) => set({ showLoadModal: v }),
      setTemplateEditMode: (v) => set({ templateEditMode: v }),
      setDataEditMode: (v) => set({ dataEditMode: v }),
      clearExpandedState: () => set({ expandedVars: new Set(), expandedWatches: new Set(), expandedBreakpoints: new Set() }),
    }),
    {
      name: 'liquid-debugger-ui',
      partialize: (s) => ({
        theme: s.theme,
        accentColor: s.accentColor,

        panelSizes: s.panelSizes,
        activeInspectorTab: s.activeInspectorTab,
        aiConfig: s.aiConfig,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AppState>),
        // Always start with fresh expanded state and non-serializable Sets
        expandedVars: new Set(),
        expandedWatches: new Set(),
        expandedBreakpoints: new Set(),
      }),
    }
  )
);

// Derived selector for accent hex
export function getAccentHex(color: string): string {
  if (color.startsWith('#')) return color;
  return ACCENT_COLORS.find((c) => c.value === color)?.hex ?? '#6366f1';
}
