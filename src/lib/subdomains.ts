import fs from 'fs';
import path from 'path';

// Reserved system subdomains that cannot be claimed by restaurants
export const RESERVED_SUBDOMAINS = new Set([
  'about',
  'admin',
  'analytics',
  'api',
  'app',
  'auth',
  'billing',
  'cdn',
  'cloud',
  'dashboard',
  'dev',
  'developer',
  'docs',
  'flo',
  'help',
  'internal',
  'kds',
  'login',
  'mail',
  'payment',
  'pos',
  'pricing',
  'restro',
  'restrodash',
  'root',
  'signup',
  'staging',
  'static',
  'status',
  'support',
  'system',
  'test',
  'webhook',
  'ws',
  'www',
]);

export interface SubdomainCheckResult {
  valid: boolean;
  available: boolean;
  subdomain: string;
  reason?: string;
}

/**
 * Validates and checks availability of a restaurant subdomain
 */
export function checkSubdomainAvailability(rawSubdomain: string, instancesDir?: string): SubdomainCheckResult {
  const subdomain = (rawSubdomain || '').trim().toLowerCase();

  // Length check (3 to 30 characters)
  if (subdomain.length < 3) {
    return {
      valid: false,
      available: false,
      subdomain,
      reason: 'Subdomain must be at least 3 characters long.',
    };
  }

  if (subdomain.length > 30) {
    return {
      valid: false,
      available: false,
      subdomain,
      reason: 'Subdomain cannot exceed 30 characters.',
    };
  }

  // Format check: lowercase alphanumeric and hyphens only, cannot start or end with hyphen
  const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!validPattern.test(subdomain)) {
    return {
      valid: false,
      available: false,
      subdomain,
      reason: 'Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).',
    };
  }

  // Check against reserved keywords
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return {
      valid: true,
      available: false,
      subdomain,
      reason: 'This subdomain is reserved for system use. Please choose another.',
    };
  }

  // Check if an instance directory or registry already exists for this subdomain
  const targetDir = instancesDir || path.join(process.cwd(), 'instances');
  const instancePath = path.join(/*turbopackIgnore: true*/ targetDir, subdomain);

  if (fs.existsSync(/*turbopackIgnore: true*/ instancePath)) {
    return {
      valid: true,
      available: false,
      subdomain,
      reason: 'This subdomain is already in use by an active restaurant.',
    };
  }

  return {
    valid: true,
    available: true,
    subdomain,
  };
}
