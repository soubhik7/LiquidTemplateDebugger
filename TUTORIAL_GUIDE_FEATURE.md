# Tutorial Guide Feature - Implementation Guide

## Overview

This document describes the **Interactive Tutorial/Guide System** implemented in the Liquid Template Debugger project. This feature provides an onboarding tour and comprehensive documentation system that can be adapted for any web application.

## Feature Components

### 1. **Onboarding Tour** (`OnboardingTour.tsx`)
An interactive, step-by-step guided tour that walks users through the application interface with:
- Spotlight highlighting of UI elements
- Contextual tooltips with instructions
- Auto-progression based on user actions
- Multi-view navigation support
- Modal integration awareness

### 2. **Guide Panel** (`GuidePanel.tsx`)
A comprehensive documentation browser with:
- Searchable content across multiple categories
- Tabbed navigation (Theory, Filters, Tags, References)
- Side drawer detail view for deep-dive content
- Live code examples with data/template/output
- Copy-to-clipboard functionality
- Smooth scrolling and highlighting

### 3. **Content Data Structure** (`liquidGuide.ts`)
Structured documentation content with:
- Theory sections with subsections
- Filter reference with examples
- Tag reference with syntax
- External references
- Rich metadata (read time, categories, etc.)

---

## Key Features

### Onboarding Tour Features

1. **Smart Element Targeting**
   - Automatically finds and highlights UI elements by ID
   - Retry mechanism (up to 5 attempts) for dynamically loaded elements
   - Adaptive positioning to avoid viewport edges

2. **Spotlight Effect**
   - Single box-shadow overlay technique (no gaps/artifacts)
   - Smooth morphing transitions between elements
   - Colored highlight rings around target elements
   - Directional arrows pointing to targets

3. **Context-Aware Behavior**
   - Detects modal states and adjusts spotlight
   - Auto-advances on user actions (clicks, navigation)
   - Waits for async operations (template loading)
   - Preserves tour state across view changes

4. **User Experience**
   - Progress dots with click-to-jump navigation
   - Back/Next/Skip controls
   - Animated card transitions
   - Responsive positioning (center, top, bottom, left, right)

### Guide Panel Features

1. **Multi-Tab Navigation**
   - Theory: Long-form educational content
   - Filters: Function reference with examples
   - Tags: Logic tag documentation
   - References: External links

2. **Search Functionality**
   - Real-time filtering across all content
   - Searches titles, descriptions, and content
   - Highlights matching results

3. **Side Drawer Detail View**
   - Slides in from right with spring animation
   - Shows full documentation with examples
   - Auto-scrolls to subsections when clicked
   - Temporary highlight effect on target subsection

4. **Interactive Examples**
   - Data/Template/Output triplets
   - Syntax-highlighted code blocks
   - Copy-to-clipboard buttons
   - Visual feedback on copy

---

## Implementation Guide

### Prerequisites

```json
{
  "dependencies": {
    "react": "^18.x",
    "framer-motion": "^10.x",
    "lucide-react": "^0.x"
  }
}
```

### Step 1: Create Data Structure

Create a TypeScript file for your documentation content:

```typescript
// data/guideContent.ts
export interface TheorySection {
  id: string;
  title: string;
  readTime: string;
  content: string;
  subsections: {
    id: string;
    title: string;
    content: string;
    examples?: {
      data: string;
      template: string;
      output: string;
      description?: string;
    }[];
  }[];
}

export interface GuideContent {
  theory: TheorySection[];
  references: { title: string; url: string }[];
  // Add more categories as needed
}

export const GUIDE_CONTENT: GuideContent = {
  theory: [
    {
      id: '1.0',
      title: 'Getting Started',
      readTime: '5 min read',
      content: 'Introduction to your application...',
      subsections: [
        {
          id: '1.1',
          title: 'First Steps',
          content: 'How to begin...',
          examples: [{
            data: '{ "user": "John" }',
            template: 'Hello {{ user }}',
            output: 'Hello John',
            description: 'Basic example'
          }]
        }
      ]
    }
  ],
  references: [
    { title: 'Documentation', url: 'https://docs.example.com' }
  ]
};
```

### Step 2: Create Onboarding Tour Component

```typescript
// components/OnboardingTour.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  targetId?: string;
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
  clickToAdvance?: boolean;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome',
    description: 'Welcome to the application tour!',
    icon: <Sparkles size={26} />,
    color: '#7c6af7',
    position: 'center',
  },
  {
    title: 'Main Feature',
    description: 'This is your main workspace.',
    icon: <Code size={22} />,
    color: '#a855f7',
    targetId: 'main-panel',
    position: 'right',
  },
  // Add more steps...
];

export function OnboardingTour({ 
  show, 
  onClose 
}: { 
  show: boolean; 
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  // Element finder with retry logic
  useEffect(() => {
    if (!step.targetId) {
      setTargetRect(null);
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;
    
    const findElement = () => {
      const el = document.getElementById(step.targetId!);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(findElement, 120);
      }
    };

    setTimeout(findElement, 100);
  }, [step.targetId, currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!show) return null;

  // Calculate spotlight position
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const isCenter = !step.targetId || !targetRect;
  
  const spotX = isCenter ? VW / 2 : targetRect.left - 10;
  const spotY = isCenter ? VH / 2 : targetRect.top - 10;
  const spotW = isCenter ? 0 : targetRect.width + 20;
  const spotH = isCenter ? 0 : targetRect.height + 20;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
      {/* Spotlight overlay */}
      <motion.div
        animate={{
          top: spotY,
          left: spotX,
          width: spotW,
          height: spotH,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'absolute',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.64)',
          borderRadius: 12,
          pointerEvents: 'none',
        }}
      />

      {/* Tour card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 14, scale: 0.93 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 344,
            background: 'white',
            borderRadius: 18,
            padding: 24,
            boxShadow: '0 20px 56px rgba(0,0,0,0.3)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: '#f3f4f6',
              border: 'none',
              borderRadius: 7,
              width: 26,
              height: 26,
              cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>

          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              fontSize: 10, 
              fontWeight: 700, 
              color: step.color,
              marginBottom: 8 
            }}>
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              {step.title}
            </h3>
          </div>

          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            {step.description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none' }}>
              Exit tour
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {currentStep > 0 && (
                <button onClick={handleBack}>
                  <ChevronLeft size={13} /> Back
                </button>
              )}
              <button onClick={handleNext}>
                {isLastStep ? 'Finish' : 'Next'} <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

### Step 3: Create Guide Panel Component

```typescript
// components/GuidePanel.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Book, X } from 'lucide-react';
import { GUIDE_CONTENT } from '../data/guideContent';

export function GuidePanel() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'theory' | 'references'>('theory');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const filteredTheory = useMemo(() => {
    const s = search.toLowerCase();
    return GUIDE_CONTENT.theory.filter(section => 
      section.title.toLowerCase().includes(s) || 
      section.content.toLowerCase().includes(s)
    );
  }, [search]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main List */}
      <div style={{ flex: 1, padding: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>
            <Book size={20} /> Guide
          </h2>
          
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation..."
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 13,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['theory', 'references'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab ? '#7c6af7' : 'transparent',
                color: activeTab === tab ? 'white' : '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'theory' && (
            <motion.div
              key="theory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {filteredTheory.map((section) => (
                <div
                  key={section.id}
                  onClick={() => setSelectedItem(section)}
                  style={{
                    padding: 24,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                    {section.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>
                    {section.content.substring(0, 150)}...
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Side Drawer */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              width: 500,
              background: 'white',
              borderLeft: '1px solid #e5e7eb',
              padding: 32,
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 24, fontWeight: 900 }}>
                {selectedItem.title}
              </h3>
              <button onClick={() => setSelectedItem(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
              {selectedItem.content}
            </p>

            {selectedItem.subsections?.map((sub: any) => (
              <div key={sub.id} style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                  {sub.title}
                </h4>
                <p style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {sub.content}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Step 4: Integration

```typescript
// App.tsx
import { useState } from 'react';
import { OnboardingTour } from './components/OnboardingTour';
import { GuidePanel } from './components/GuidePanel';

function App() {
  const [showTour, setShowTour] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div>
      <header>
        <button onClick={() => setShowGuide(!showGuide)}>
          Guide
        </button>
        <button onClick={() => setShowTour(true)}>
          Start Tour
        </button>
      </header>

      <main id="main-panel">
        {/* Your app content */}
      </main>

      {showGuide && <GuidePanel />}
      
      <OnboardingTour 
        show={showTour} 
        onClose={() => setShowTour(false)} 
      />
    </div>
  );
}
```

---

## Customization Tips

### 1. **Styling**
- Replace inline styles with CSS modules or styled-components
- Use CSS variables for theming
- Add dark mode support

### 2. **Content**
- Adapt the data structure to your domain
- Add more categories (API reference, troubleshooting, etc.)
- Include videos or interactive demos

### 3. **Behavior**
- Add analytics tracking for tour completion
- Persist tour state in localStorage
- Add "Don't show again" option

### 4. **Accessibility**
- Add ARIA labels and roles
- Ensure keyboard navigation works
- Test with screen readers

---

## Advanced Features

### Auto-Advance on User Actions

```typescript
useEffect(() => {
  if (!step.clickToAdvance) return;
  
  const targetElement = document.getElementById(step.targetId!);
  if (!targetElement) return;

  const handleClick = () => {
    setTimeout(handleNext, 300);
  };

  targetElement.addEventListener('click', handleClick);
  return () => targetElement.removeEventListener('click', handleClick);
}, [step, handleNext]);
```

### Deep Linking to Guide Sections

```typescript
// Support URLs like /guide?section=1.2
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sectionId = params.get('section');
  
  if (sectionId) {
    const section = GUIDE_CONTENT.theory.find(s => 
      s.subsections.some(sub => sub.id === sectionId)
    );
    if (section) {
      setSelectedItem({ ...section, subId: sectionId });
    }
  }
}, []);
```

### Progress Tracking

```typescript
const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

useEffect(() => {
  setCompletedSteps(prev => new Set([...prev, currentStep]));
}, [currentStep]);

// Show progress: {completedSteps.size} / {STEPS.length} completed
```

---

## Performance Considerations

1. **Lazy Load Content**: Load guide content on-demand
2. **Virtualize Long Lists**: Use react-window for large documentation sets
3. **Debounce Search**: Add 300ms debounce to search input
4. **Memoize Filters**: Use useMemo for expensive filtering operations
5. **Code Splitting**: Lazy load tour and guide components

---

## Testing

```typescript
// Test tour navigation
test('advances to next step on button click', () => {
  render(<OnboardingTour show={true} onClose={jest.fn()} />);
  
  const nextButton = screen.getByText('Next');
  fireEvent.click(nextButton);
  
  expect(screen.getByText('Step 2 of')).toBeInTheDocument();
});

// Test guide search
test('filters content based on search', () => {
  render(<GuidePanel />);
  
  const searchInput = screen.getByPlaceholderText('Search documentation...');
  fireEvent.change(searchInput, { target: { value: 'getting started' } });
  
  expect(screen.getByText(/Getting Started/i)).toBeInTheDocument();
});
```

---

## License

This implementation guide is based on the Liquid Template Debugger project. Adapt and modify as needed for your use case.

## Credits

- **Framer Motion**: Animation library
- **Lucide React**: Icon library
- **React**: UI framework

---

**Made with ❤️ by Bob**