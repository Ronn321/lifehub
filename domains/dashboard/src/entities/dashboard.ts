export interface DashboardLayout {
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: 'media' | 'calendar' | 'weather' | 'savings' | 'tasks' | 'finance' | 'projects';
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}
