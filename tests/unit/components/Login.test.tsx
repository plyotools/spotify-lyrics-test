import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../../../src/components/Login';
import { AuthService } from '../../../src/services/auth';

// Mock AuthService
vi.mock('../../../src/services/auth', () => ({
  AuthService: {
    isAuthenticated: vi.fn(),
    initiateLogin: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render login button', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(false);
    
    render(<Login />);
    
    expect(screen.getByText('Connect with Spotify')).toBeInTheDocument();
  });

  it('should show existing session button when authenticated', async () => {
    (AuthService.isAuthenticated as any).mockReturnValue(true);
    
    render(<Login />);
    
    await waitFor(() => {
      expect(screen.getByText('Clear existing session')).toBeInTheDocument();
    });
  });

  it('should initiate login on button click', async () => {
    (AuthService.isAuthenticated as any).mockReturnValue(false);
    const user = userEvent.setup();
    
    render(<Login />);
    
    const loginButton = screen.getByText('Connect with Spotify');
    await user.click(loginButton);
    
    expect(AuthService.initiateLogin).toHaveBeenCalledTimes(1);
  });

    it('should handle logout and reload', async () => {
      (AuthService.isAuthenticated as any).mockReturnValue(true);
      const user = userEvent.setup();
      
      // Mock window.location.reload by replacing the entire location object
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = {
        ...originalLocation,
        reload: vi.fn(),
      };
      
      render(<Login />);
      
      await waitFor(() => {
        expect(screen.getByText('Clear existing session')).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByText('Clear existing session');
      await user.click(logoutButton);
      
      expect(AuthService.logout).toHaveBeenCalledTimes(1);
      expect(window.location.reload).toHaveBeenCalledTimes(1);
      
      // Restore original location
      window.location = originalLocation;
    });

  it('should have accessible login button', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(false);
    
    render(<Login />);
    
    const button = screen.getByRole('button', { name: /connect with spotify/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('should display app title and description', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(false);
    
    render(<Login />);
    
    expect(screen.getByText('Spotify Lyrics Player')).toBeInTheDocument();
    expect(screen.getByText(/Connect your Spotify account/i)).toBeInTheDocument();
  });
});

