export interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: 'patient' | 'admin';
}
