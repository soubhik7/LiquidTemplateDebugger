import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { HeaderBar } from './HeaderBar';
import { ResizablePanel } from './ResizablePanel';
import { TemplatePanel } from '../panels/TemplatePanel';
import { DataPanel } from '../panels/DataPanel';
import { OutputPanel } from '../panels/OutputPanel';
import { RightSidePanel } from './RightSidePanel';
import { SettingsPanel } from '../panels/SettingsPanel';
import { GuidePanel } from '../panels/GuidePanel';
import { LoadModal } from '../overlays/LoadModal';
import { AIGeneratorView } from '../panels/AIGeneratorView';
import { ToastContainer } from '../shared/Toast';
import { OnboardingTour } from '../overlays/OnboardingTour';
import { useDebugger } from '../../hooks/useDebugger';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { validateTemplate } from '../../utils/validator';

export function WorkspaceLayout() {
  const showLoadModal = useAppStore((s) => s.showLoadModal);
  const setShowLoadModal = useAppStore((s) => s.setShowLoadModal);
  const debugState = useAppStore((s) => s.debugState);
  const addToast = useAppStore((s) => s.addToast);
  const setValidationErrors = useAppStore((s) => s.setValidationErrors);
  const setInspectorTab = useAppStore((s) => s.setInspectorTab);
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);
  const showOnboarding = useAppStore((s) => s.showOnboarding);
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding);

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
    if (debugState?.templateSource) {
      setValidationErrors(validateTemplate(debugState.templateSource));
    }

    // Trigger onboarding for first-time users, but only if no modal is blocking and not already showing
    if (!hasSeenOnboarding && !showLoadModal && !showOnboarding) {
      setShowOnboarding(true);
    }
  }, [init, debugState?.templateSource, setValidationErrors, hasSeenOnboarding, setShowOnboarding, showLoadModal, showOnboarding]);

  const toast = useCallback(
    (message: string, type: 'success' | 'error' | 'info', title?: string, duration = 6000) => {
      const autoTitle =
        title ?? (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info');
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
      const errors = validateTemplate(template);
      setValidationErrors(errors);
      
      const ds = debugState;
      if (!ds?.isLoaded) return;
      const data = ds.dataContent ?? '';
      const format = ds.dataFormat ?? 'json';
      const ok = await loadTemplate(template, data, format);
      if (ok) {
        if (errors.length > 0) {
          toast(`Applied changes with ${errors.length} validation issues`, 'info');
          setInspectorTab('problems');
        } else {
          toast('Changes applied and debugging restarted', 'success');
        }
      }
    },
    [debugState, loadTemplate, toast, setValidationErrors, setInspectorTab]
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

  const handleLoadTemplate = useCallback(
    async (template: string, data: string, format: string) => {
      const errors = validateTemplate(template);
      setValidationErrors(errors);
      const ok = await loadTemplate(template, data, format);
      if (ok) {
        if (errors.length > 0) {
          toast(`Loaded template with ${errors.length} validation issues`, 'info');
          setInspectorTab('problems');
        } else {
          toast('Template loaded successfully', 'success');
        }
      }
      return ok;
    },
    [loadTemplate, setValidationErrors, toast, setInspectorTab]
  );


  const activeView = useAppStore((s) => s.activeView);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
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

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <AnimatePresence>
            {activeView === 'debugger' ? (
              <motion.div
                key="debugger"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
              >
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

                    {/* Column 3: Right Side (Accordion) */}
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <RightSidePanel
                        onAddWatch={addWatch}
                        onRemoveWatch={removeWatch}
                        onToggleBreakpoint={toggleBreakpointById}
                        onRemoveBreakpoint={removeBreakpoint}
                        onEvaluate={evaluate}
                        onReset={reset}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanel>
              </motion.div>
            ) : activeView === 'settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
              >
                <SettingsPanel />
              </motion.div>
            ) : activeView === 'guide' ? (
              <motion.div
                key="guide"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
              >
                <GuidePanel />
              </motion.div>
            ) : (
              <motion.div
                key="generator"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
              >
                <AIGeneratorView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <LoadModal
        open={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={handleLoadTemplate}
        prefillRef={tplPrefillRef}
      />

      <OnboardingTour />

      <ToastContainer />
    </motion.div>
  );
}
