import { useEffect, useCallback, useRef } from 'react';
import { vscodePostMessage } from '../vscode';
import { useAppStore } from '../store/useAppStore';
import type { WebUIState } from '../types/app';

let _reqId = 0;
const _pending: Record<number, (result: unknown) => void> = {};

function apiCall(method: string, path: string, body?: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    const id = ++_reqId;
    _pending[id] = resolve;
    vscodePostMessage({ type: 'api', id, method, path, body: body ?? null });
  });
}

export function useDebugger() {
  const setDebugState = useAppStore((s) => s.setDebugState);
  const setLoading = useAppStore((s) => s.setLoading);
  const setShowLoadModal = useAppStore((s) => s.setShowLoadModal);
  const clearExpanded = useAppStore((s) => s.clearExpandedState);
  const addToast = useAppStore((s) => s.addToast);

  const tplPrefillRef = useRef<((tpl: string) => void) | null>(null);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg.type === 'apiResponse' && _pending[msg.id]) {
        _pending[msg.id](msg.result);
        delete _pending[msg.id];
      }
      if (msg.type === 'stateUpdate') {
        setDebugState(msg.state as WebUIState);
      }
      if (msg.type === 'prefill' && msg.template) {
        tplPrefillRef.current?.(msg.template as string);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setDebugState]);

  const refreshState = useCallback(async () => {
    const s = await apiCall('GET', '/api/state');
    setDebugState(s as WebUIState);
    return s as WebUIState;
  }, [setDebugState]);

  const loadTemplate = useCallback(
    async (templateContent: string, dataContent: string, format: string) => {
      setDebugState(null);
      clearExpanded();
      setLoading(true);
      try {
        const s = await apiCall('POST', '/api/load', { templateContent, dataContent, format });
        if ((s as WebUIState).error) {
          addToast({ type: 'error', title: 'Load Failed', message: (s as WebUIState).error!, duration: 6000 });
          return false;
        }
        setDebugState(s as WebUIState);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, addToast, clearExpanded, setDebugState]
  );

  const loadSample = useCallback(async () => {
    setLoading(true);
    try {
      const s = await apiCall('POST', '/api/load-sample');
      if (s && !(s as WebUIState).error) {
        clearExpanded();
        setDebugState(s as WebUIState);
        setShowLoadModal(false);
        return true;
      }
    } finally {
      setLoading(false);
    }
    return false;
  }, [setLoading, clearExpanded, setDebugState, setShowLoadModal]);

  const step = useCallback(
    async (action: string) => {
      setLoading(true);
      try {
        const s = await apiCall('POST', '/api/step', { action });
        setDebugState(s as WebUIState);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setDebugState]
  );

  const reset = useCallback(async () => {
    setLoading(true);
    try {
      const s = await apiCall('POST', '/api/reset');
      clearExpanded();
      setDebugState(s as WebUIState);
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearExpanded, setDebugState]);

  const toggleBreakpoint = useCallback(
    async (line: number) => {
      const ds = useAppStore.getState().debugState;
      if (!ds?.isLoaded) return;
      const existing = ds.breakpoints?.find((bp) => bp.line === line);
      if (existing) {
        await apiCall('DELETE', `/api/breakpoint/${existing.id}`);
      } else {
        await apiCall('POST', '/api/breakpoint', { line, condition: null });
      }
      await refreshState();
    },
    [refreshState]
  );

  const setConditionalBreakpoint = useCallback(
    async (line: number, condition: string | null) => {
      await apiCall('POST', '/api/breakpoint', { line, condition });
      await refreshState();
    },
    [refreshState]
  );

  const toggleBreakpointById = useCallback(
    async (id: number) => {
      await apiCall('POST', `/api/breakpoint/${id}/toggle`);
      await refreshState();
    },
    [refreshState]
  );

  const removeBreakpoint = useCallback(
    async (id: number) => {
      await apiCall('DELETE', `/api/breakpoint/${id}`);
      await refreshState();
    },
    [refreshState]
  );

  const addWatch = useCallback(
    async (expression: string) => {
      await apiCall('POST', '/api/watch', { expression });
      await refreshState();
    },
    [refreshState]
  );

  const removeWatch = useCallback(
    async (id: number) => {
      await apiCall('DELETE', `/api/watch/${id}`);
      await refreshState();
    },
    [refreshState]
  );

  const evaluate = useCallback(async (expression: string) => {
    let finalExpr = expression.trim();
    let isVirtual = false;

    // Virtual Variable Resolution
    const ds = useAppStore.getState().debugState;
    const variables = ds?.state?.variables ?? [];
    if (ds?.isLoaded && !variables.find(v => v.name === finalExpr)) {
      const template = ds.templateSource ?? '';
      // Look for "key": "{{ expr }}" or "key": {{ expr }}
      const virtualMatch = template.match(new RegExp(`["']?${finalExpr}["']?\\s*:\\s*(?:&quot;|&#039;|["'])?\\s*\\{\\{\\s*(.*?)\\s*\\}\\}`, 'i'));
      if (virtualMatch && virtualMatch[1]) {
        finalExpr = virtualMatch[1].trim();
        isVirtual = true;
      }
    }

    const res = (await apiCall('POST', '/api/evaluate', { expression: finalExpr })) as {
      value?: string;
      typeName?: string;
      error?: string;
      transformations?: any[];
    };

    if (isVirtual && res) {
      res.typeName = res.typeName ? `${res.typeName} (Virtual)` : 'Virtual';
    }

    return res;
  }, []);

  const validateOutput = useCallback(async (format: string) => {
    return apiCall('POST', '/api/validate', { format }) as Promise<{
      isValid?: boolean;
      errorMessage?: string;
      sourceLineNumber?: number;
      error?: string;
    }>;
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    const res = await apiCall('POST', '/api/clipboard/copy', { text });
    return (res as { ok?: boolean })?.ok ?? false;
  }, []);

  const init = useCallback(async () => {
    const s = await refreshState();
    if (!s || !s.isLoaded) {
      setShowLoadModal(true);
    }
  }, [refreshState, setShowLoadModal]);

  return {
    init,
    loadTemplate,
    loadSample,
    step,
    reset,
    toggleBreakpoint,
    setConditionalBreakpoint,
    toggleBreakpointById,
    removeBreakpoint,
    addWatch,
    removeWatch,
    evaluate,
    validateOutput,
    copyToClipboard,
    refreshState,
    tplPrefillRef,
  };
}
