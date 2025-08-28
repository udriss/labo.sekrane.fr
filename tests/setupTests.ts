import '@testing-library/jest-dom';
// Ensure TextEncoder/TextDecoder exist before importing undici which relies on them in some Node/Jest combos
import { TextEncoder, TextDecoder } from 'util';
// @ts-ignore
if (!global.TextEncoder) global.TextEncoder = TextEncoder as any;
// @ts-ignore
if (!global.TextDecoder) global.TextDecoder = TextDecoder as any;
// Use whatwg-fetch for simpler polyfill (includes fetch, Headers, Request, Response)
// Minimal Request polyfill if not present (Jest + Node environment)
if (typeof (global as any).Request === 'undefined') {
  class SimpleRequest {
    url: string;
    method: string;
    headers: any;
    private _body?: any;
    constructor(input: string, init: any = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      this.headers = init.headers || {};
      this._body = init.body;
    }
    async json() {
      return this._body ? JSON.parse(this._body) : undefined;
    }
    get body() {
      return this._body;
    }
  }
  // @ts-ignore
  global.Request = SimpleRequest as any;
}
// Minimal Headers/Response polyfills used by next/server's NextResponse
if (typeof (global as any).Headers === 'undefined') {
  class SimpleHeaders {
    private m = new Map<string, string>();
    append(k: string, v: string) {
      this.m.set(k.toLowerCase(), v);
    }
    get(k: string) {
      return this.m.get(k.toLowerCase()) || null;
    }
    set(k: string, v: string) {
      this.m.set(k.toLowerCase(), v);
    }
    has(k: string) {
      return this.m.has(k.toLowerCase());
    }
  }
  // @ts-ignore
  global.Headers = SimpleHeaders as any;
}
if (typeof (global as any).Response === 'undefined') {
  class SimpleResponse {
    body: any;
    status: number;
    headers: any;
    constructor(body?: any, init: any = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = init.headers || new (global as any).Headers();
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
  }
  // @ts-ignore
  global.Response = SimpleResponse as any;
}
// Mock next/server NextResponse for route handlers
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: (data: any, init: any = {}) =>
        new (global as any).Response(JSON.stringify(data), { status: init.status || 200 }),
    },
  };
});
