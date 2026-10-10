import fs from 'fs';
import path from 'path';

export interface TenantInstanceRecord {
  subdomain: string;
  restaurantName: string;
  ownerEmail: string;
  ports: {
    api: number;
    kds: number;
    serverApp: number;
  };
  dbPath: string;
  workspacePath: string;
  status: 'active' | 'suspended' | 'provisioning';
  plan: 'monthly_35k' | 'annual';
  createdAt: string;
}

export interface InstanceRegistry {
  lastAllocatedBasePort: number;
  instances: Record<string, TenantInstanceRecord>;
}

const STARTING_BASE_PORT = 3010;

function getRegistryFilePath(instancesDir: string): string {
  return path.join(instancesDir, 'registry.json');
}

/**
 * Loads the current registry from disk
 */
export function loadRegistry(instancesDir?: string): InstanceRegistry {
  const targetDir = instancesDir || path.join(process.cwd(), 'instances');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const registryFile = getRegistryFilePath(targetDir);
  if (!fs.existsSync(registryFile)) {
    const initial: InstanceRegistry = {
      lastAllocatedBasePort: STARTING_BASE_PORT,
      instances: {},
    };
    fs.writeFileSync(registryFile, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const content = fs.readFileSync(registryFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      lastAllocatedBasePort: STARTING_BASE_PORT,
      instances: {},
    };
  }
}

/**
 * Saves the registry to disk
 */
export function saveRegistry(registry: InstanceRegistry, instancesDir?: string): void {
  const targetDir = instancesDir || path.join(process.cwd(), 'instances');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const registryFile = getRegistryFilePath(targetDir);
  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Allocates ports for a new tenant and registers the instance
 */
export function registerTenantInstance(
  record: Omit<TenantInstanceRecord, 'ports' | 'createdAt'>,
  instancesDir?: string
): TenantInstanceRecord {
  const targetDir = instancesDir || path.join(process.cwd(), 'instances');
  const registry = loadRegistry(targetDir);

  // Check if tenant is already registered
  if (registry.instances[record.subdomain]) {
    return registry.instances[record.subdomain];
  }

  // Allocate next block of ports (increment by 10 per instance)
  const nextBasePort = registry.lastAllocatedBasePort + 10;
  registry.lastAllocatedBasePort = nextBasePort;

  const newInstance: TenantInstanceRecord = {
    ...record,
    ports: {
      api: nextBasePort + 1,        // e.g. 3021
      kds: nextBasePort + 2,        // e.g. 3022
      serverApp: nextBasePort + 3,  // e.g. 3023
    },
    createdAt: new Date().toISOString(),
  };

  registry.instances[record.subdomain] = newInstance;
  saveRegistry(registry, targetDir);

  return newInstance;
}
