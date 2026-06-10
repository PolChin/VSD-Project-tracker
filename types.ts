
export interface Task {
  id: string;
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress: number;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  date: string; // YYYY-MM-DD
  completed?: boolean;
}

export interface Project {
  id: string;
  name: string;
  leader: string;
  department: string;
  status: string;
  progress: number;
  tasks: Task[];
  milestones?: Milestone[];
  updatedAt: string; // ISO format string
  description?: string;
  projectId?: string;
  ciNo?: string;
}

export interface ProjectHistory extends Project {
  projectId: string;
}

export interface StatusMaster {
  id: string;
  name: string;
  color: string;
}

export interface WeeklyUpdate {
  id: string;
  projectId: string;
  weekId: string; // e.g., "2026-W11"
  progress: number;
  status: string;
  summary: string;
  issues: string;
  nextSteps: string;
  updatedAt: string;
}

export interface MasterData {
  leaders: string[];
  departments: string[];
  statuses: StatusMaster[];
}
