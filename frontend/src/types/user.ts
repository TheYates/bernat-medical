export type UserRole = "admin" | "user";
export type AccessType =
  | "settings"
  | "appointments"
  | "records"
  | "lab"
  | "xray"
  | "pharmacy"
  | "inventory"
  | "consultation"
  | "billing";

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
