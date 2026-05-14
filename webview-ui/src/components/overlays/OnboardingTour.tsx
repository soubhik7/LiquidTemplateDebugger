import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  Sparkles, Code, Database, BarChart3, CheckCircle2,
  PlayCircle, Settings, BookOpen, Zap, MousePointer,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  targetId?: string;
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
  view?: 'debugger' | 'generator' | 'guide' | 'settings';
  clickToAdvance?: boolean;
  waitForLoad?: boolean;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to Liquid Debugger',
    description:
      "The most powerful Liquid template debugger. This tour walks you through the real interface — you'll click actual elements as you go.",
    icon: <Sparkles size={26} />,
    color: '#7c6af7',
    position: 'center',
    view: 'debugger',
  },
  {
    title: 'Load a Template',
    description:
      'Click the "Load Template" button above. Choose a sample or paste your own Liquid code — the tour continues once you load one.',
    icon: <PlayCircle size={22} />,
    color: '#7c6af7',
    targetId: 'btn-load',
    position: 'bottom',
    view: 'debugger',
    waitForLoad: true,
  },
  {
    title: 'Template Editor',
    description:
      'Your Liquid code with full syntax highlighting. Click line numbers to set breakpoints, then step through execution with the debug toolbar.',
    icon: <Code size={22} />,
    color: '#a855f7',
    targetId: 'template-panel',
    position: 'right',
    view: 'debugger',
  },
  {
    title: 'JSON Data Context',
    description:
      'Provide your variable data as JSON. Every change instantly re-renders the output — perfect for testing different data scenarios.',
    icon: <Database size={22} />,
    color: '#3b82f6',
    targetId: 'data-panel',
    position: 'right',
    view: 'debugger',
  },
  {
    title: 'Live Rendered Output',
    description:
      'The rendered result of your template in real-time. Errors and output appear the moment you make changes — no manual refresh needed.',
    icon: <CheckCircle2 size={22} />,
    color: '#22c55e',
    targetId: 'output-panel',
    position: 'left',
    view: 'debugger',
  },
  {
    title: 'Variable Inspector',
    description:
      'Deep-dive into execution state — expand variables, add watch expressions, and monitor breakpoints. Full visibility into your template runtime.',
    icon: <BarChart3 size={22} />,
    color: '#f97316',
    targetId: 'inspector-panel',
    position: 'left',
    view: 'debugger',
  },
  {
    title: 'AI Template Mapper',
    description:
      'Generate Liquid templates from plain English using Google Gemini AI. Click the "AI Mapper" tab in the header to open it now.',
    icon: <Sparkles size={22} />,
    color: '#06b6d4',
    targetId: 'nav-generator',
    position: 'bottom',
    view: 'debugger',
    clickToAdvance: true,
  },
  {
    title: 'Liquid Reference Guide',
    description:
      'A built-in encyclopedia covering every Liquid filter, tag, and operator with live examples. Click the "Guide" tab to explore it.',
    icon: <BookOpen size={22} />,
    color: '#a855f7',
    targetId: 'nav-guide',
    position: 'bottom',
    view: 'generator',
    clickToAdvance: true,
  },
  {
    title: 'Settings & Themes',
    description:
      'Customize your workspace — pick a theme, adjust font size, and configure preferences. Click the "Settings" tab to personalize.',
    icon: <Settings size={22} />,
    color: '#7c6af7',
    targetId: 'nav-settings',
    position: 'bottom',
    view: 'guide',
    clickToAdvance: true,
  },
  {
    title: "You're All Set!",
    description:
      "You've mastered the Liquid Debugger. Load templates, set breakpoints, and debug with confidence. Happy coding!",
    icon: <Zap size={26} />,
    color: '#22c55e',
    position: 'center',
  },
];

const CARD_W = 344;
const CARD_H = 272;
const SAFE   = 16;
const SAFE_T = 74;   // Keep card below the header bar (~64px tall)
const SPOT   = 10;

const cardVariants = {
  initial: { opacity: 0, y: 14, scale: 0.93, transition: { duration: 0 } },
  animate: { opacity: 1, y: 0, scale: 1,  transition: { type: 'spring' as const, stiffness: 500, damping: 34, mass: 0.8 } },
  exit:    { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.09, ease: 'easeIn' as const } },
};

const morphT = { duration: 0.30, ease: [0.4, 0, 0.2, 1] as const };

export function OnboardingTour() {
  const showOnboarding    = useAppStore((s) => s.showOnboarding);
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding);
  const setActiveView     = useAppStore((s) => s.setActiveView);
  const activeView        = useAppStore((s) => s.activeView);
  const debugState        = useAppStore((s) => s.debugState);
  const isLoaded          = !!debugState?.isLoaded;
  const setShowLoadModal  = useAppStore((s) => s.setShowLoadModal);
  const showLoadModal     = useAppStore((s) => s.showLoadModal);

  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect]   = useState<DOMRect | null>(null);
  const prevShowRef  = useRef(false);
  const retryRef     = useRef<ReturnType<typeof setTimeout>[]>([]);

  const step        = STEPS[currentStep];
  const isLastStep  = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // ── Derived ──────────────────────────────────────────────────────────────
  // loadCompleted: template is loaded AND modal is closed (at the load step)
  const loadCompleted = !!step.waitForLoad && isLoaded && !showLoadModal;

  // inModalPhase: LoadModal is open during the waitForLoad step
  // → keep tour visible but re-anchor spotlight to the modal itself
  const inModalPhase = !!step.waitForLoad && showLoadModal;

  // hideOverlay: only suppress overlay when modal opens at NON-waitForLoad steps
  const hideOverlay = showLoadModal && !step.waitForLoad;

  // isWaiting: at load step, modal is closed, but template not yet loaded
  const isWaiting = !!step.waitForLoad && !isLoaded && !showLoadModal;

  // When modal is open at step 2, spotlight the whole modal dialog instead of btn-load
  const effectiveTargetId = inModalPhase ? 'load-modal-content' : step.targetId;

  // ── Reset to step 0 each time the tour is (re)opened ────────────────────
  useEffect(() => {
    if (showOnboarding && !prevShowRef.current) {
      setCurrentStep(0);
    }
    prevShowRef.current = showOnboarding;
  }, [showOnboarding]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      const ns = STEPS[next];
      if (ns.view && ns.view !== activeView) setActiveView(ns.view);
    } else {
      setActiveView('debugger');
      setShowOnboarding(false);
    }
  }, [currentStep, activeView, setActiveView, setShowOnboarding]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      const ps = STEPS[prev];
      if (ps.view && ps.view !== activeView) setActiveView(ps.view);
    }
  }, [currentStep, activeView, setActiveView]);

  const handleSkip = useCallback(() => setShowOnboarding(false), [setShowOnboarding]);

  // ── Auto-advance: waitForLoad ─────────────────────────────────────────────
  // Fires when template is loaded AND modal closed. No source-comparison needed.
  // Guard: showOnboarding prevents firing after user exits tour mid-way.
  useEffect(() => {
    if (!showOnboarding || !loadCompleted) return;
    const t = setTimeout(handleNext, 420);
    return () => clearTimeout(t);
  }, [showOnboarding, loadCompleted, handleNext]);

  // ── Auto-advance: clickToAdvance ─────────────────────────────────────────
  useEffect(() => {
    if (!showOnboarding || !step.clickToAdvance) return;
    let done = false;
    if (step.targetId === 'nav-generator') done = activeView === 'generator';
    else if (step.targetId === 'nav-guide')    done = activeView === 'guide';
    else if (step.targetId === 'nav-settings') done = activeView === 'settings';
    if (!done) return;
    const t = setTimeout(handleNext, 580);
    return () => clearTimeout(t);
  }, [showOnboarding, step.clickToAdvance, step.targetId, activeView, handleNext]);

  // ── Close LoadModal when leaving the load step ───────────────────────────
  // Guard: only run when tour is active AND targetId exists (step 0 has no targetId)
  useEffect(() => {
    if (!showOnboarding) return;
    if (step.targetId && step.targetId !== 'btn-load' && showLoadModal) {
      setShowLoadModal(false);
    }
  }, [showOnboarding, currentStep, showLoadModal, setShowLoadModal, step.targetId]);

  // ── Element finder with up to 5 retries (120 ms apart) ──────────────────
  // Uses effectiveTargetId so during modal phase it spotlights the modal dialog
  const updateTargetRect = useCallback(() => {
    retryRef.current.forEach(clearTimeout);
    retryRef.current = [];

    if (!effectiveTargetId) { setTargetRect(null); return; }

    const attempt = (n: number) => {
      const el = document.getElementById(effectiveTargetId);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { setTargetRect(r); return; }
      }
      if (n < 5) {
        const t = setTimeout(() => attempt(n + 1), 120);
        retryRef.current.push(t);
      } else {
        setTargetRect(null);
      }
    };

    const t0 = setTimeout(() => attempt(0), 100);
    retryRef.current.push(t0);
  }, [effectiveTargetId]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      retryRef.current.forEach(clearTimeout);
    };
  }, [updateTargetRect, activeView, showLoadModal]);

  // ── Early exit ───────────────────────────────────────────────────────────
  if (!showOnboarding) return null;

  // ── Viewport ─────────────────────────────────────────────────────────────
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const tr = targetRect;
  const isCenter = !step.targetId || !tr;

  // Spotlight rect (for single box-shadow overlay)
  const spotX = isCenter ? VW / 2 : Math.floor((tr.left  ?? 0) - SPOT);
  const spotY = isCenter ? VH / 2 : Math.floor((tr.top   ?? 0) - SPOT);
  const spotW = isCenter ? 0      : Math.ceil ((tr.width ?? 0) + SPOT * 2);
  const spotH = isCenter ? 0      : Math.ceil ((tr.height ?? 0) + SPOT * 2);

  // ── Card position ────────────────────────────────────────────────────────
  const getCardPos = (): { left: number; top: number } | { top: string; left: string; transform: string } => {
    if (isCenter) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const PAD = 22;
    const { top, left, bottom, right, width, height } = tr!;
    let x: number, y: number;

    // During modal phase, position card to the side of the dialog
    const effectivePosition = inModalPhase ? 'right' : step.position;

    switch (effectivePosition) {
      case 'bottom':
        x = left + width / 2 - CARD_W / 2;
        y = bottom + PAD;
        break;
      case 'top':
        x = left + width / 2 - CARD_W / 2;
        y = top - CARD_H - PAD;
        if (y < SAFE_T) y = bottom + PAD;
        break;
      case 'right':
        x = right + PAD;
        y = top + height / 2 - CARD_H / 2;
        if (x + CARD_W > VW - SAFE) x = left - CARD_W - PAD;
        break;
      case 'left':
      default:
        x = left - CARD_W - PAD;
        y = top + height / 2 - CARD_H / 2;
        if (x < SAFE) x = right + PAD;
        break;
    }

    x = Math.max(SAFE, Math.min(x, VW - CARD_W - SAFE));
    y = Math.max(SAFE_T, Math.min(y, VH - CARD_H - SAFE));
    return { left: x, top: y };
  };

  const cardPos   = getCardPos();
  const hasAbsPos = !isCenter && !!tr;
  const cX = hasAbsPos ? (cardPos as { left: number }).left : 0;
  const cY = hasAbsPos ? (cardPos as { top: number }).top  : 0;

  // ── Arrow position ────────────────────────────────────────────────────────
  const getEffectivePos = () => {
    const base = inModalPhase ? 'right' : (step.position ?? 'bottom');
    if (!tr) return base;
    const PAD = 22;
    let pos = base;
    if (pos === 'top'   && tr.top - CARD_H - PAD < SAFE_T) pos = 'bottom';
    if (pos === 'right' && cX + CARD_W > VW - SAFE)         pos = 'left';
    if (pos === 'left'  && cX < SAFE)                        pos = 'right';
    return pos;
  };

  const effectivePos = getEffectivePos();

  const getArrowPos = (): React.CSSProperties | null => {
    if (!hasAbsPos) return null;
    switch (effectivePos) {
      case 'bottom': return { position: 'absolute', top: cY - 24,            left: cX + CARD_W / 2 - 9 };
      case 'top':    return { position: 'absolute', top: cY + CARD_H + 6,    left: cX + CARD_W / 2 - 9 };
      case 'right':  return { position: 'absolute', top: cY + CARD_H / 2 - 9, left: cX - 26 };
      case 'left':   return { position: 'absolute', top: cY + CARD_H / 2 - 9, left: cX + CARD_W + 8 };
      default:       return null;
    }
  };

  const ArrowChevron = (() => {
    switch (effectivePos) {
      case 'bottom': return ChevronUp;
      case 'top':    return ChevronDown;
      case 'right':  return ChevronLeft;
      case 'left':   return ChevronRight;
      default:       return ChevronUp;
    }
  })();

  const showNextBtn  = !step.clickToAdvance && !isWaiting;
  const showSkipStep = step.clickToAdvance || isWaiting;
  const arrowPos     = getArrowPos();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'none' }}>

      {/* ── Single box-shadow spotlight ────────────────────────────────────
          One absolutely-positioned div with a 9999px box-shadow spread.
          The div itself is transparent → creates a perfect cutout.
          box-shadow respects borderRadius. Zero gap artefacts.            */}
      <motion.div
        animate={{
          opacity: hideOverlay ? 0 : 1,
          top:    spotY,
          left:   spotX,
          width:  spotW,
          height: spotH,
        }}
        transition={morphT}
        style={{
          position: 'absolute',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.64)',
          borderRadius: 12,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ── Highlight ring ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {tr && !isCenter && !hideOverlay && (
          <motion.div
            key={`ring-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top:    tr.top    - SPOT,
              left:   tr.left   - SPOT,
              width:  tr.width  + SPOT * 2,
              height: tr.height + SPOT * 2,
              border: `1.5px solid ${step.color}`,
              borderRadius: 12,
              boxShadow: `0 0 0 3px ${step.color}18, 0 0 16px ${step.color}30`,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Directional arrow ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasAbsPos && !hideOverlay && arrowPos && (
          <motion.div
            key={`arrow-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ ...arrowPos, position: 'absolute', pointerEvents: 'none', zIndex: 22, color: step.color }}
          >
            <motion.div
              animate={{ opacity: [0.45, 0.85, 0.45] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: 0.5 }}
            >
              <ArrowChevron size={16} strokeWidth={2.5} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No floating chip — modal-phase guidance is shown inside the card */}

      {/* ── Tour card ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!hideOverlay && (
          <motion.div
            key={currentStep}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: 'absolute',
              ...(cardPos as object),
              width: CARD_W,
              background: 'var(--bg-surface)',
              borderRadius: 18,
              border: '1px solid var(--border-primary)',
              boxShadow: '0 20px 56px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)',
              overflow: 'hidden',
              pointerEvents: 'auto',
              zIndex: 20,
            }}
          >
            {/* Accent bar */}
            <motion.div
              key={`bar-${currentStep}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: 3, background: `linear-gradient(90deg, ${step.color}, ${step.color}80, transparent)`, transformOrigin: 'left' }}
            />

            <div style={{ padding: '16px 18px 14px' }}>
              {/* Close */}
              <button
                onClick={handleSkip}
                title="Exit tour"
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'var(--bg-hover)', border: '1px solid var(--border-primary)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  width: 26, height: 26, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={13} />
              </button>

              {/* Icon + step label + title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 11 }}>
                <motion.div
                  key={`icon-${currentStep}`}
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.05, type: 'spring', stiffness: 440, damping: 22 }}
                  style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `linear-gradient(135deg, ${step.color}28, ${step.color}0e)`,
                    border: `1px solid ${step.color}28`,
                    color: step.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {step.icon}
                </motion.div>

                <div style={{ flex: 1, paddingRight: 24, marginTop: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: step.color, textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 3 }}>
                    Step {currentStep + 1} of {STEPS.length}
                  </div>
                  <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: 0, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.2px' }}>
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12.5, lineHeight: 1.68, color: 'var(--text-secondary)', margin: '0 0 13px' }}>
                {step.description}
              </p>

              {/* Click hint */}
              {step.clickToAdvance && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 11px',
                    background: `${step.color}0e`, border: `1px solid ${step.color}20`,
                    borderRadius: 9, marginBottom: 13,
                    fontSize: 11.5, fontWeight: 600, color: step.color,
                  }}
                >
                  <MousePointer size={12} />
                  Click the highlighted element to continue
                </motion.div>
              )}

              {/* Load hint — waiting for user to open the modal */}
              {step.waitForLoad && isWaiting && (
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 11px',
                    background: `${step.color}0e`, border: `1px solid ${step.color}20`,
                    borderRadius: 9, marginBottom: 13,
                    fontSize: 11.5, fontWeight: 600, color: step.color,
                  }}
                >
                  <PlayCircle size={12} />
                  Click the button above to load a template…
                </motion.div>
              )}

              {/* Modal-phase hint — LoadModal is open, guide user through it */}
              {inModalPhase && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 11px',
                    background: `${step.color}0e`, border: `1px solid ${step.color}20`,
                    borderRadius: 9, marginBottom: 13,
                    fontSize: 11.5, fontWeight: 600, color: step.color,
                  }}
                >
                  <MousePointer size={12} />
                  Pick a sample or paste your template, then click&nbsp;<b>Start Debugging</b>
                </motion.div>
              )}

              {/* Success badge — template already loaded, auto-advancing */}
              {step.waitForLoad && loadCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 11px',
                    background: '#22c55e12', border: '1px solid #22c55e30',
                    borderRadius: 9, marginBottom: 13,
                    fontSize: 11.5, fontWeight: 600, color: '#22c55e',
                  }}
                >
                  <CheckCircle2 size={12} />
                  Template loaded — continuing tour…
                </motion.div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={handleSkip}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '5px 0', opacity: 0.65 }}
                >
                  Exit tour
                </button>

                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  {currentStep > 0 && (
                    <button
                      onClick={handleBack}
                      style={{
                        background: 'none', border: '1px solid var(--border-primary)',
                        color: 'var(--text-muted)', padding: '6px 13px', borderRadius: 9,
                        fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      <ChevronLeft size={13} /> Back
                    </button>
                  )}

                  {showNextBtn && (
                    <button
                      onClick={handleNext}
                      style={{
                        background: `linear-gradient(135deg, ${step.color}, ${step.color}bb)`,
                        border: 'none', color: 'white',
                        padding: isFirstStep ? '7px 22px' : '6px 16px',
                        borderRadius: 9,
                        fontSize: isFirstStep ? 12.5 : 11.5,
                        fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3,
                        boxShadow: `0 4px 18px ${step.color}35`,
                      }}
                    >
                      {isFirstStep ? 'Start Tour' : isLastStep ? 'Start Debugging!' : 'Next'}
                      {!isLastStep && <ChevronRight size={13} />}
                    </button>
                  )}

                  {showSkipStep && (
                    <button
                      onClick={handleNext}
                      style={{
                        background: 'none', border: '1px solid var(--border-primary)',
                        color: 'var(--text-muted)', padding: '6px 13px', borderRadius: 9,
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3, opacity: 0.75,
                      }}
                    >
                      Skip step <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, padding: '9px 18px 13px', borderTop: '1px solid var(--border-primary)' }}>
              {STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    width: i === currentStep ? 20 : 6,
                    background: i === currentStep ? step.color : i < currentStep ? `${step.color}55` : 'var(--border-primary)',
                    opacity: i === currentStep ? 1 : i < currentStep ? 0.65 : 0.3,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  onClick={() => {
                    setCurrentStep(i);
                    const s = STEPS[i];
                    if (s.view && s.view !== activeView) setActiveView(s.view);
                  }}
                  style={{ height: 6, borderRadius: 3, cursor: 'pointer', flexShrink: 0 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
