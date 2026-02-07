
export interface Task {
  id: string;
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress: number;
  weight: number;    // % weight of the task within the project
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
}

export interface ProjectHistory extends Project {
  projectId: string;
}

export interface StatusMaster {
  id: string;
  name: string;
  color: string;
}

export interface MasterData {
  leaders: string[];
  departments: string[];
  statuses: StatusMaster[];
}
