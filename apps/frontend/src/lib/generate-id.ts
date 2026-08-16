/**
 * Generate a UUID v4.
 *
 * `crypto.randomUUID` is only available in secure browser contexts
 * (https or localhost). For plain-http access via LAN/Tailscale IPs
 * (e.g. http://100.124.4.24:3100) we fall back to a Math.random-based
 * UUID so features like widget creation keep working.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
