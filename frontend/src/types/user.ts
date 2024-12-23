export type UserRole = 'admin' | 'user';
export type AccessType = 'appointments' | 'records' | 'settings';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  access: AccessType[];
}

export interface CreateUserData {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  access: AccessType[];
} 