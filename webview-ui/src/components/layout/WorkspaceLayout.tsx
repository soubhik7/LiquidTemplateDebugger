import { useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { ResizablePanel } from './ResizablePanel';
import { TemplatePanel } from '../panels/TemplatePanel';
import { DataPanel } from '../panels/DataPanel';
import { OutputPanel } from '../panels/OutputPanel';
import { VariablesPanel } from '../panels/VariablesPanel';
import { InspectorPanel } from '../panels/InspectorPanel';
import { LoadModal } from '../overlays/LoadModal';
import { ToastContainer } from '../shared/Toast';
import { useDebugger } from '../../hooks/useDebugger';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export function WorkspaceLayout() {
  const showLoadModal = useAppStore((s) => s.showLoadModal);
  const setShowLoadModal = useAppStore((s) => s.setShowLoadModal);
  const debugState = useAppStore((s) => s.debugState);
  const addToast = useAppStore((s) => s.addToast);

  const {
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
    tplPrefillRef,
  } = useDebugger();

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'F5', action: () => step('continue') },
    { key: 'F10', action: () => step('over') },
    { key: 'F11', action: () => step('into') },
    { key: 'F11', shift: true, action: () => step('out') },
    {
      key: 'F9',
      action: () => {
        const state = debugState?.state;
        if (state && !state.isComplete && state.currentLine > 0) {
          toggleBreakpoint(state.currentLine);
        }
      },
    },
    { key: 'F5', ctrl: true, shift: true, action: reset },
  ]);

  // Initialize on mount
  useEffect(() => {
    init();
  }, [init]);

  const toast = useCallback(
    (message: string, type: 'success' | 'error' | 'info', title?: string, duration = 6000) => {
      const autoTitle =
        title ?? (type === 'success' ? '✓ Success' : type === 'error' ? '✕ Error' : 'Info');
      addToast({ title: autoTitle, message, type, duration });
    },
    [addToast]
  );

  const handleToggleBPAtCurrentLine = useCallback(async () => {
    const state = debugState?.state;
    if (!state || state.isComplete) return;
    const line = state.currentLine;
    if (line > 0) await toggleBreakpoint(line);
  }, [debugState, toggleBreakpoint]);

  const handleConditionalBreakpoint = useCallback(
    (line: number) => {
      const cond = prompt('Breakpoint condition (Liquid expression):');
      if (cond !== null) {
        setConditionalBreakpoint(line, cond || null);
      }
    },
    [setConditionalBreakpoint]
  );

  const handleApplyEdits = useCallback(
    async (template: string) => {
      const ds = debugState;
      if (!ds?.isLoaded) return;
      const data = ds.dataContent ?? '';
      const format = ds.dataFormat ?? 'json';
      const ok = await loadTemplate(template, data, format);
      if (ok) toast('Changes applied and debugging restarted', 'success');
    },
    [debugState, loadTemplate, toast]
  );

  const handleApplyDataEdits = useCallback(
    async (data: string) => {
      const ds = debugState;
      if (!ds?.isLoaded) return;
      const template = ds.templateSource ?? '';
      const format = ds.dataFormat ?? 'json';
      const ok = await loadTemplate(template, data, format);
      if (ok) toast('Data updated and debugging restarted', 'success');
    },
    [debugState, loadTemplate, toast]
  );

  const handleCopyTemplate = useCallback(async () => {
    if (!debugState?.templateSource) return;
    await copyToClipboard(debugState.templateSource);
    toast('Template copied to clipboard', 'success');
  }, [debugState, copyToClipboard, toast]);

  const handleCopyOutput = useCallback(
    async (text: string) => {
      await copyToClipboard(text);
    },
    [copyToClipboard]
  );

  const handleLoadSample = useCallback(async () => {
    await loadSample();
  }, [loadSample]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      <HeaderBar
        onLoad={() => setShowLoadModal(true)}
        onStep={step}
        onReset={reset}
        onToggleBPAtCurrentLine={handleToggleBPAtCurrentLine}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />

        {/* Main 3-column area */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ResizablePanel direction="horizontal" initialSize={34} minSize={120}>
            {/* Column 1: Template */}
            <TemplatePanel
              onToggleBreakpoint={toggleBreakpoint}
              onConditionalBreakpoint={handleConditionalBreakpoint}
              onCopy={handleCopyTemplate}
              onApplyEdits={handleApplyEdits}
            />

            {/* Columns 2+3 */}
            <ResizablePanel direction="horizontal" initialSize={50} minSize={120}>
              {/* Column 2: Data + Output */}
              <ResizablePanel direction="vertical" initialSize={40} minSize={80}>
                <DataPanel onApplyEdits={handleApplyDataEdits} onToast={toast} />
                <OutputPanel
                  onValidate={validateOutput}
                  onCopy={handleCopyOutput}
                  onToast={toast}
                />
              </ResizablePanel>

              {/* Column 3: Variables + Inspector */}
              <ResizablePanel direction="vertical" initialSize={55} minSize={80}>
                <VariablesPanel />
                <InspectorPanel
                  onAddWatch={addWatch}
                  onRemoveWatch={removeWatch}
                  onToggleBreakpoint={toggleBreakpointById}
                  onRemoveBreakpoint={removeBreakpoint}
                  onEvaluate={evaluate}
                />
              </ResizablePanel>
            </ResizablePanel>
          </ResizablePanel>
        </div>
      </div>

      <LoadModal
        open={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={loadTemplate}
        onLoadSample={handleLoadSample}
        prefillRef={tplPrefillRef}
      />

      <ToastContainer />
    </div>
  );
}
