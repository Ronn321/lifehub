import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Globaler Filter: mappt Zod-Validierungsfehler auf HTTP 400.
 *
 * Hintergrund: alle Domain-Controller validieren per `schema.parse(body)`.
 * Ohne diesen Filter landet ein ZodError im Default-Handler und kommt als
 * 500 'Internal server error' beim Client an (z.B. POST /media/albums mit
 * ungültigem Body) — obwohl es ein reiner Client-Fehler ist.
 *
 * Antwort-Shape (mobil-freundlich):
 * {
 *   statusCode: 400,
 *   message: 'Validierung fehlgeschlagen: name: Required',
 *   errors: [{ path: 'name', message: 'Required', code: 'invalid_type' }]
 * }
 */
@Catch()
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (isZodError(exception)) {
      const errors = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      const detail = errors
        .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message))
        .join('; ');
      throw new BadRequestException({
        message: detail ? `Validierung fehlgeschlagen: ${detail}` : 'Validierung fehlgeschlagen',
        errors,
      });
    }
    // Alles andere an den NestJS-Default-Handler weiterreichen.
    throw exception;
  }
}

/**
 * ZodError-Erkennung via instanceof + Namens-Fallback.
 * Der Fallback schützt vor doppelten zod-Kopien im pnpm-Monorepo
 * (dann schlägt instanceof fehl, das Shape ist aber identisch).
 */
function isZodError(exception: unknown): exception is ZodError {
  if (exception instanceof ZodError) return true;
  if (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { name?: unknown }).name === 'ZodError' &&
    Array.isArray((exception as { issues?: unknown }).issues)
  ) {
    return true;
  }
  return false;
}
