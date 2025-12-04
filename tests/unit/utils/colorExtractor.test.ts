import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractBrightestColor,
  extractDarkestColor,
  extractVividLightColors,
  extractVividMidtoneColor,
} from '../../../src/utils/colorExtractor';

describe('ColorExtractor', () => {
  let mockImage: HTMLImageElement;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock Image
    mockImage = {
      width: 100,
      height: 100,
      crossOrigin: '',
      src: '',
      onload: null as any,
      onerror: null as any,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Mock Canvas
    mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn(),
    } as any;

    // Mock Context
    mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn(),
    } as any;

    mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);

    // Mock global Image constructor
    global.Image = vi.fn().mockImplementation(() => mockImage) as any;

    // Mock document.createElement
    global.document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return mockCanvas;
      }
      return document.createElement(tag);
    });
  });

  describe('extractBrightestColor', () => {
    it('should extract brightest color from image', async () => {
      // Create mock image data with a bright red pixel
      const mockImageData = {
        data: new Uint8ClampedArray([
          255, 0, 0, 255, // Bright red
          100, 100, 100, 255, // Gray
          0, 0, 0, 255, // Black
        ]),
        width: 100,
        height: 100,
      };

      mockContext.getImageData = vi.fn().mockReturnValue(mockImageData);

      // Trigger onload
      const promise = extractBrightestColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(result).not.toBe('#1DB954'); // Should not be default
    });

    it('should return default color on CORS error', async () => {
      mockContext.getImageData = vi.fn().mockImplementation(() => {
        throw new Error('CORS error');
      });

      const promise = extractBrightestColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toBe('#1DB954'); // Default fallback
    });

    it('should return default color on image load error', async () => {
      const promise = extractBrightestColor('invalid.jpg');
      if (mockImage.onerror) {
        mockImage.onerror(new Event('error'));
      }

      const result = await promise;

      expect(result).toBe('#1DB954'); // Default fallback
    });

    it('should return default when canvas context is null', async () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      const promise = extractBrightestColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toBe('#1DB954'); // Default fallback
    });
  });

  describe('extractDarkestColor', () => {
    it('should extract darkest color from image', async () => {
      const mockImageData = {
        data: new Uint8ClampedArray([
          255, 255, 255, 255, // White
          128, 128, 128, 255, // Gray
          10, 10, 10, 255, // Very dark
        ]),
        width: 100,
        height: 100,
      };

      mockContext.getImageData = vi.fn().mockReturnValue(mockImageData);

      const promise = extractDarkestColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(result).not.toBe('#121212'); // Should extract actual color
    });

    it('should return default dark color on error', async () => {
      mockContext.getImageData = vi.fn().mockImplementation(() => {
        throw new Error('CORS error');
      });

      const promise = extractDarkestColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toBe('#121212'); // Default dark fallback
    });

    it('should handle image load errors', async () => {
      const promise = extractDarkestColor('invalid.jpg');
      if (mockImage.onerror) {
        mockImage.onerror(new Event('error'));
      }

      const result = await promise;

      expect(result).toBe('#121212'); // Default dark fallback
    });
  });

  describe('extractVividLightColors', () => {
    it('should extract 5 vivid light colors', async () => {
      // Create image data with multiple vivid colors
      const colors = [
        [255, 100, 100, 255], // Vivid red
        [100, 255, 100, 255], // Vivid green
        [100, 100, 255, 255], // Vivid blue
        [255, 255, 100, 255], // Vivid yellow
        [255, 100, 255, 255], // Vivid magenta
      ];
      const mockImageData = {
        data: new Uint8ClampedArray(colors.flat()),
        width: 100,
        height: 100,
      };

      mockContext.getImageData = vi.fn().mockReturnValue(mockImageData);

      const promise = extractVividLightColors('test.jpg', 5);
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toHaveLength(5);
      result.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should return default colors array on error', async () => {
      mockContext.getImageData = vi.fn().mockImplementation(() => {
        throw new Error('Error');
      });

      const promise = extractVividLightColors('test.jpg', 5);
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toHaveLength(5);
      // Should be default colors
      result.forEach((color) => {
        expect(color).toBe('#1DB954');
      });
    });
  });

  describe('extractVividMidtoneColor', () => {
    it('should extract most vivid midtone color', async () => {
      // Create image data with midtone colors
      const mockImageData = {
        data: new Uint8ClampedArray([
          200, 50, 50, 255, // Vivid midtone red
          150, 150, 150, 255, // Neutral gray
          128, 200, 128, 255, // Vivid midtone green
        ]),
        width: 100,
        height: 100,
      };

      mockContext.getImageData = vi.fn().mockReturnValue(mockImageData);

      const promise = extractVividMidtoneColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return default midtone on error', async () => {
      mockContext.getImageData = vi.fn().mockImplementation(() => {
        throw new Error('Error');
      });

      const promise = extractVividMidtoneColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;

      expect(result).toBe('#B3B3B3'); // Default midtone
    });
  });

  describe('Error Handling', () => {
    it('should handle missing canvas context gracefully', async () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      const promise = extractBrightestColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;
      expect(result).toBe('#1DB954'); // Default
    });

    it('should handle empty image data', async () => {
      const mockImageData = {
        data: new Uint8ClampedArray([]),
        width: 0,
        height: 0,
      };

      mockContext.getImageData = vi.fn().mockReturnValue(mockImageData);

      const promise = extractBrightestColor('test.jpg');
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }

      const result = await promise;
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});



