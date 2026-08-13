import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) return false;

  const [a = 0, b = 0] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalised = address.toLowerCase();
  return normalised === '::'
    || normalised === '::1'
    || normalised.startsWith('fc')
    || normalised.startsWith('fd')
    || normalised.startsWith('fe8')
    || normalised.startsWith('fe9')
    || normalised.startsWith('fea')
    || normalised.startsWith('feb')
    || normalised.startsWith('ff');
}

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  if (isIP(address) === 6) return isPrivateIpv6(address);
  return false;
}

function isAllowedInternalHost(hostname: string, allowedInternalHosts: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return allowedInternalHosts.some((candidate) => {
    const normalised = candidate.toLowerCase().replace(/\.$/, '');
    return host === normalised || host.endsWith(`.${normalised}`);
  });
}

/**
 * Validates a browser navigation target and resolves DNS before allowing it.
 * The DNS check is intentionally performed by the LifeHub backend so a URL
 * cannot resolve to an internal address after it passed a string-only check.
 */
export async function validateBrowserUrl(
  rawUrl: string,
  allowedInternalHosts: string[] = [],
): Promise<URL> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Ungültige Browser-URL');
  }

  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    throw new BadRequestException('Nur HTTP- und HTTPS-URLs sind erlaubt');
  }
  if (target.username || target.password) {
    throw new BadRequestException('URLs mit eingebetteten Zugangsdaten sind nicht erlaubt');
  }

  const hostname = target.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new BadRequestException('Lokale Ziele sind nicht erlaubt');
  }

  if (isAllowedInternalHost(hostname, allowedInternalHosts)) return target;

  if (isPrivateAddress(hostname)) {
    throw new BadRequestException('Private Netzwerkziele sind nicht erlaubt');
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new BadRequestException('Die URL verweist auf ein privates Netzwerkziel');
    }
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('Browser-Ziel konnte nicht sicher aufgelöst werden');
  }

  return target;
}

export function getAllowedInternalBrowserHosts(): string[] {
  return (process.env.BROWSER_INTERNAL_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
}
