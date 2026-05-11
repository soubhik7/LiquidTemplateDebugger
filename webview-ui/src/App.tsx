import { useTheme } from './hooks/useTheme';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';

export function App() {
  useTheme();
  return <WorkspaceLayout />;
}
