import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RequireRole } from './components/RequireRole';
import { DevRoleProvider } from '../../app/context/DevRoleProvider';
import { AuthProvider } from './AuthProvider';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('Auth Feature Components', () => {
  it('renders LoginPage with email, password fields and sign in action', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /CNC SMARTCORE M2/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/engineer@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/Register here/i)).toBeInTheDocument();
  });

  it('renders children when user role is allowed in RequireRole', () => {
    render(
      <MemoryRouter>
        <DevRoleProvider initialRole="cam_engineer">
          <AuthProvider>
            <RequireRole allowedRoles={['cam_engineer', 'admin']}>
              <div data-testid="protected-content">Restricted CAM Workspace</div>
            </RequireRole>
          </AuthProvider>
        </DevRoleProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText(/Restricted CAM Workspace/i)).toBeInTheDocument();
  });

  it('renders Access Restricted error state when user role is not allowed in RequireRole', () => {
    render(
      <MemoryRouter>
        <DevRoleProvider initialRole="designer">
          <AuthProvider>
            <RequireRole allowedRoles={['approver', 'admin']}>
              <div data-testid="protected-content">Restricted Approver Queue</div>
            </RequireRole>
          </AuthProvider>
        </DevRoleProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText(/Your role \(DESIGNER\) does not have permission/i)).toBeInTheDocument();
  });
});
