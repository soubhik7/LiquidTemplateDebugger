export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

export interface PanelSizes {
  col1: number;
  col2: number;
  col3: number;
  inputRatio: number;
  varsRatio: number;
}
