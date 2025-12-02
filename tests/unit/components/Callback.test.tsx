import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Callback } from '../../../src/components/Callback';
import { AuthService } from '../../../src/services/auth';

// Mock AuthService
vi.mock('../../../src/services/auth', () => ({
  AuthService: {
    isAuthenticated: vi.fn(),
    handleCallback: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Callback Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Reset URL
    delete (window as any).location;
    window.location = {
      search: '',
      hash: '',
    } as any;
  });

  it('should redirect to home when already authenticated', async () => {
    (AuthService.isAuthenticated as any).mockReturnValue(true);
    
    render(
      <MemoryRouter>
        <Callback />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should process callback with valid code', async () => {
    (AuthService.isAuthenticated as any).mockReturnValue(false);
    (AuthService.handleCallback as any).mockResolvedValue({
      access_token: 'token',
      expires_in: 3600,
    });
    
    window.location.search = '?code=test_code';
    
    render(
      <MemoryRouter>
        <Callback />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(AuthService.handleCallback).toHaveBeenCalledWith('test_code', undefined);
    });
  });

    it('should handle missing code parameter', async () => {
      (AuthService.isAuthenticated as any).mockReturnValue(false);
      
      window.location.search = '?error=access_denied';
      
      render(
        <MemoryRouter>
          <Callback />
        </MemoryRouter>
      );
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
      });
    });
});

