
export interface Task {
  id: string;
  name: string;
  description?: string; // Added description field for tasks
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress: number;
  weight: number;    // % weight of the task within the project
}

export interface Project {
  id: string;
  name: string;
  leader: string;
  department: string;
  status: string;
  progress: number;
  tasks: Task[];
  updatedAt: any;
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
