export type StatusCategory = 'Active' | 'Delayed' | 'Pipeline' | 'Done' | 'Other';

// Temporary name → category map until status_master stores a category field.
const statusCategoryByName: Record<string, StatusCategory> = {
  'in progress': 'Active',
  delay: 'Delayed',
  planning: 'Pipeline',
  pending: 'Pipeline',
  completed: 'Done'
};

export const getStatusCategory = (status: string): StatusCategory =>
  statusCategoryByName[status.trim().toLowerCase()] || 'Other';

export const isDoneStatus = (status: string): boolean => getStatusCategory(status) === 'Done';
