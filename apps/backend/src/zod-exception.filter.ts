import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Globaler Filter: mappt Zod-Validierungsfehler auf HTTP 400.
 *
 * Hintergrund: alle Domain-Controller validieren per `schema.parse(body)`.
 * Ohne diesen Filter landet ein ZodError im Default-Handler und kommt als
 * 500 'Internal server error' beim Client an (z.B. POST /media/albums mit
 * ungültigem Body) — obwohl es ein reiner Client-Fehler ist.
 *
 * WICHTIG: Der Filter antwortet DIREKT über das Response-Objekt und wirft
 * NIEMALS. Ein `throw` aus einem globalen Filter betritt die
 * NestJS-Filterkette erneut und tötet im schlimmsten Fall den Node-Prozess
 * (Crash-Loop bei jeder fehlerhaften Anfrage). `@Catch(ZodError)` stellt
 * sicher, dass Nicht-Zod-Fehler diesen Filter gar nicht erst erreichen.
 *
 * Antwort-Shape (mobil-freundlich):
 * {
 *   statusCode: 400,
 *   message: 'Validierung fehlgeschlagen: name: Required',
 *   errors: [{ path: 'name', message: 'Required', code: 'invalid_type' }]
 * }
 */
@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost): void {
    // Defensive Prüfung (Shape-Fallback für doppelte zod-Kopien, s.u.).
    // Dank @Catch(ZodError) kommen Nicht-Zod-Fehler hier nie an.
    if (!isZodError(exception)) {
      return;
    }
    const errors = exception.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    const detail = errors
      .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message))
      .join('; ');
    const res = host.switchToHttp().getResponse();
    res.status(400).json({
      statusCode: 400,
      message: detail ? `Validierung fehlgeschlagen: ${detail}` : 'Validierung fehlgeschlagen',
      errors,
    });
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
