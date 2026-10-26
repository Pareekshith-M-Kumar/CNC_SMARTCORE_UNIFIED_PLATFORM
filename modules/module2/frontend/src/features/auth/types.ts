import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'designer' | 'cam_engineer' | 'approver' | 'admin' | 'operator' | 'customer';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
