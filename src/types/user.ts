export interface User {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  agentCode: string | null;
  department: string | null;
  role: 'admin' | 'agent' | 'manager' | 'developer';
  active: boolean;
  lastLogin: number | null;
  createdAt: number;
}
