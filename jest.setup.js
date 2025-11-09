// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock window.matchMedia (only if window is available - for DOM tests)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock localStorage (only if window is available - for DOM tests)
if (typeof window !== 'undefined') {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  global.localStorage = localStorageMock
  window.localStorage = localStorageMock

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  global.sessionStorage = sessionStorageMock
  window.sessionStorage = sessionStorageMock
}

// Mock fetch
global.fetch = jest.fn()

// Mock TextEncoder and TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock TransformStream for Playwright tests
if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = class TransformStream {
    constructor() {
      this.readable = { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) }
      this.writable = { getWriter: () => ({ write: () => Promise.resolve(), close: () => Promise.resolve() }) }
    }
  }
}

// Mock Request for Next.js API routes
// Note: NextRequest extends Request, so we need to be careful with mocking
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      const url = typeof input === 'string' ? input : (input?.url || 'http://localhost:3000')
      // Use Object.defineProperty to set read-only properties
      Object.defineProperty(this, 'url', {
        value: url,
        writable: false,
        enumerable: true,
        configurable: false
      })
      Object.defineProperty(this, 'method', {
        value: init?.method || 'GET',
        writable: false,
        enumerable: true,
        configurable: false
      })
      
      // Headers
      const headers = new Headers(init?.headers || {})
      Object.defineProperty(this, 'headers', {
        value: headers,
        writable: false,
        enumerable: true,
        configurable: false
      })
      
      // Body
      if (init?.body) {
        Object.defineProperty(this, 'body', {
          value: init.body,
          writable: false,
          enumerable: true,
          configurable: false
        })
      }
      
      // Body methods
      this.text = async () => {
        if (typeof init?.body === 'string') return init.body
        if (init?.body) return JSON.stringify(init.body)
        return ''
      }
      
      this.json = async () => {
        if (typeof init?.body === 'string') {
          try {
            return JSON.parse(init.body)
          } catch {
            return {}
          }
        }
        return init?.body || {}
      }
    }
  }
}

// Mock Headers if not available
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this._headers = new Map()
      if (init instanceof Headers) {
        init.forEach((value, key) => {
          this._headers.set(key.toLowerCase(), value)
        })
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value)
        })
      } else if (init && typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), String(value))
        })
      }
    }
    
    get(name) {
      return this._headers.get(name.toLowerCase()) || null
    }
    
    set(name, value) {
      this._headers.set(name.toLowerCase(), String(value))
    }
    
    has(name) {
      return this._headers.has(name.toLowerCase())
    }
    
    delete(name) {
      this._headers.delete(name.toLowerCase())
    }
    
    forEach(callback) {
      this._headers.forEach((value, key) => {
        callback(value, key, this)
      })
    }
  }
}

// Mock Response for Next.js API routes
// Next.js requires Response to be available in global scope
// NextResponse extends Response, so we need to ensure Response is available
// Node.js 18+ has Response built-in, but Jest might not have it in test environment
if (typeof global.Response === 'undefined' && typeof globalThis.Response === 'undefined') {
  // Try to use Node.js built-in Response (Node.js 18+)
  // If not available, we'll need to install undici or use a polyfill
  try {
    // Node.js 18+ has Response in global scope, but Jest might not expose it
    // Check if we're in a Node.js environment that supports it
    if (typeof process !== 'undefined' && process.versions && parseFloat(process.versions.node) >= 18) {
      // Node.js 18+ should have Response, but if it's not in global, we need to polyfill
      // For now, we'll create a minimal mock that works with NextResponse
      const ResponseImpl = class Response {
        constructor(body, init = {}) {
          // Store body as ReadableStream or string
          if (typeof body === 'string') {
            this._bodyText = body;
          } else {
            this._bodyText = body ? JSON.stringify(body) : '';
          }
          
          this.status = init.status || 200;
          this.statusText = init.statusText || 'OK';
          this.headers = new Headers(init.headers || {});
          this.ok = this.status >= 200 && this.status < 300;
          this.redirected = false;
          this.type = 'default';
          this.url = '';
          this.bodyUsed = false;
        }

        async json() {
          if (this.bodyUsed) {
            throw new TypeError('Body already consumed');
          }
          this.bodyUsed = true;
          
          if (this._bodyText) {
            try {
              return JSON.parse(this._bodyText);
            } catch {
              return {};
            }
          }
          return {};
        }

        async text() {
          if (this.bodyUsed) {
            throw new TypeError('Body already consumed');
          }
          this.bodyUsed = true;
          return this._bodyText || '';
        }

        clone() {
          return new ResponseImpl(this._bodyText, {
            status: this.status,
            statusText: this.statusText,
            headers: this.headers,
          });
        }

        static json(data, init = {}) {
          const body = JSON.stringify(data);
          const headers = new Headers({
            'Content-Type': 'application/json',
            ...(init.headers || {}),
          });
          
          return new ResponseImpl(body, {
            ...init,
            status: init.status || 200,
            headers,
          });
        }
      };
      
      global.Response = ResponseImpl;
      globalThis.Response = ResponseImpl;
    }
  } catch (e) {
    // If anything fails, Response will be undefined and Next.js will throw an error
    // This is expected - we should install undici or use Node.js 18+
    console.warn('Response is not available. Please use Node.js 18+ or install undici.');
  }
}

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}

