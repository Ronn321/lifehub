import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodExceptionFilter } from './zod-exception.filter';

function host() {
  return {} as never;
}

describe('ZodExceptionFilter', () => {
  const filter = new ZodExceptionFilter();

  it('mappt ZodError auf BadRequestException (400) mit lesbarer Message', () => {
    const schema = z.object({ name: z.string().min(1) });
    let caught: unknown;
    try {
      schema.parse({});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    try {
      filter.catch(caught, host());
      expect.unreachable('sollte werfen');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const exc = e as BadRequestException;
      expect(exc.getStatus()).toBe(400);
      const res = exc.getResponse() as {
        message: string;
        errors: Array<{ path: string; message: string; code: string }>;
      };
      expect(res.message).toContain('name');
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0]?.path).toBe('name');
    }
  });

  it('reicht Nicht-Zod-Fehler unverändert weiter (Default-Handler)', () => {
    const err = new Error('boom');
    expect(() => filter.catch(err, host())).toThrow(err);
    const http = new BadRequestException('x');
    expect(() => filter.catch(http, host())).toThrow(http);
  });

  it('erkennt ZodError-Duplikate (andere zod-Kopie) per Shape-Fallback', () => {
    const fake = { name: 'ZodError', issues: [{ path: ['pin'], message: 'Too short', code: 'too_small' }] };
    try {
      filter.catch(fake, host());
      expect.unreachable('sollte werfen');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as { message: string };
      expect(res.message).toContain('pin');
    }
  });

  it('ignoriert Objekte ohne issues-Array', () => {
    const notZod = { name: 'ZodError' };
    const next = vi.fn();
    try {
      filter.catch(notZod, host());
      next('thrown');
    } catch (e) {
      expect(e).toBe(notZod);
    }
    expect(next).not.toHaveBeenCalled();
  });
});
