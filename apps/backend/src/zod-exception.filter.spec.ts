import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodExceptionFilter } from './zod-exception.filter';

function mockHost() {
  const json = { body: null as unknown };
  const res = {
    statusCode: 0,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      json.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as never;
  return { host, res, json };
}

describe('ZodExceptionFilter', () => {
  const filter = new ZodExceptionFilter();

  it('antwortet auf ZodError direkt mit 400 + JSON-Body (ohne zu werfen)', () => {
    const schema = z.object({ name: z.string().min(1) });
    let caught: unknown;
    try {
      schema.parse({});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    const { host, res, json } = mockHost();
    expect(() => filter.catch(caught, host)).not.toThrow();
    expect(res.statusCode).toBe(400);
    const body = json.body as {
      statusCode: number;
      message: string;
      errors: Array<{ path: string; message: string; code: string }>;
    };
    expect(body.statusCode).toBe(400);
    expect(body.message).toContain('Validierung fehlgeschlagen');
    expect(body.message).toContain('name');
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0]?.path).toBe('name');
  });

  it('antwortet auf ZodError-Duplikate (andere zod-Kopie) per Shape-Fallback', () => {
    const fake = { name: 'ZodError', issues: [{ path: ['pin'], message: 'Too short', code: 'too_small' }] };
    const { host, res, json } = mockHost();
    expect(() => filter.catch(fake as never, host)).not.toThrow();
    expect(res.statusCode).toBe(400);
    const body = json.body as { message: string };
    expect(body.message).toContain('pin');
  });

  it('ignoriert Objekte ohne issues-Array (keine Antwort, kein Throw)', () => {
    const notZod = { name: 'ZodError' };
    const { host, res, json } = mockHost();
    expect(() => filter.catch(notZod as never, host)).not.toThrow();
    expect(res.statusCode).toBe(0);
    expect(json.body).toBeNull();
  });

  it('Nicht-Zod-Fehler: kein Throw, keine Antwort (Routing via @Catch(ZodError))', () => {
    // Dank @Catch(ZodError) erreichen Nicht-Zod-Fehler diesen Filter in
    // NestJS gar nicht. Direkter Aufruf bleibt defensiv: weder Throw noch Antwort.
    for (const err of [new Error('boom'), { name: 'ZodError' }]) {
      const { host, res, json } = mockHost();
      expect(() => filter.catch(err as never, host)).not.toThrow();
      expect(res.statusCode).toBe(0);
      expect(json.body).toBeNull();
    }
  });
});
