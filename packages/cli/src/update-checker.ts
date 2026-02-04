import { existsSync } from 'node:fs'
import { join } from 'node:path'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

/**
 * Detect package manager from the script's install path.
 * This is the most reliable method for global installs since each
 * package manager installs to distinct locations.
 */
export function detectPackageManagerFromPath(
  scriptPath: string,
): PackageManager | null {
  // bun global: ~/.bun/install/global/
  if (scriptPath.includes('/.bun/')) return 'bun'

  // pnpm global: ~/.local/share/pnpm/ or ~/.pnpm-global/ or AppData/Local/pnpm
  if (scriptPath.includes('/pnpm/') || scriptPath.includes('/.pnpm'))
    return 'pnpm'

  // yarn global: ~/.yarn/ or ~/.config/yarn/
  if (scriptPath.includes('/.yarn/') || scriptPath.includes('/yarn/global'))
    return 'yarn'

  // nvm-managed npm: ~/.nvm/
  if (scriptPath.includes('/.nvm/')) return 'npm'

  // Standard npm global paths
  if (
    scriptPath.includes('/usr/local/lib/node_modules') ||
    scriptPath.includes('/usr/lib/node_modules') ||
    scriptPath.includes('/.npm-global/')
  ) {
    return 'npm'
  }

  return null
}

/**
 * Detect the package manager using multiple strategies:
 * 1. Script path (most reliable for global installs)
 * 2. npm_config_user_agent env var (when pm is actively invoking)
 * 3. Lock files in cwd (for local installs)
 * 4. Default to npm
 */
export function detectPackageManager(
  scriptPath?: string,
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): PackageManager {
  // 1. Try path-based detection first (most reliable for global installs)
  if (scriptPath) {
    const fromPath = detectPackageManagerFromPath(scriptPath)
    if (fromPath) return fromPath
  }

  // 2. Check npm_config_user_agent (set when pm is actively invoking)
  const userAgent = env.npm_config_user_agent || ''
  if (userAgent.includes('bun/')) return 'bun'
  if (userAgent.includes('pnpm/')) return 'pnpm'
  if (userAgent.includes('yarn/')) return 'yarn'
  if (userAgent.includes('npm/')) return 'npm'

  // 3. Check for lock files in cwd (useful for local installs)
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock')))
    return 'bun'
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm'

  // 4. Default to npm
  return 'npm'
}

/**
 * Detect if issy was installed globally or locally
 */
export function isGlobalInstall(
  scriptPath: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  // Check npm_config_global env var (set by npm when running global packages)
  if (env.npm_config_global === 'true') return true

  // Check if we're running from a global node_modules path
  const globalPaths = [
    '/usr/local/lib/node_modules',
    '/usr/lib/node_modules',
    join(env.HOME || '', '.npm-global'),
    join(env.HOME || '', '.nvm'),
    join(env.HOME || '', '.bun/install/global'),
    join(env.APPDATA || '', 'npm'),
    join(env.LOCALAPPDATA || '', 'pnpm/global'),
  ].filter(Boolean)

  for (const globalPath of globalPaths) {
    if (scriptPath.startsWith(globalPath)) return true
  }

  // Check if script path contains node_modules within a project (local install)
  // Global installs typically don't have a project-level node_modules parent
  const parts = scriptPath.split('/node_modules/')
  if (parts.length > 1) {
    // If there's a package.json in the first part, it's likely a local install
    const projectRoot = parts[0]
    if (existsSync(join(projectRoot, 'package.json'))) {
      return false
    }
  }

  // If running via npx/bunx/pnpm dlx, treat as global-style
  if (
    env.npm_execpath?.includes('npx') ||
    env._?.includes('npx') ||
    env._?.includes('bunx') ||
    env._?.includes('pnpm dlx')
  ) {
    return true
  }

  // Default to global (safer assumption for update instructions)
  return true
}

/**
 * Generate the appropriate update command based on package manager and install type
 */
export function getUpdateCommand(
  packageManager: PackageManager,
  isGlobal: boolean,
): string {
  const pkgName = 'issy'

  const commands: Record<PackageManager, { global: string; local: string }> = {
    npm: {
      global: `npm install -g ${pkgName}`,
      local: `npm update ${pkgName}`,
    },
    yarn: {
      global: `yarn global add ${pkgName}`,
      local: `yarn upgrade ${pkgName}`,
    },
    pnpm: {
      global: `pnpm add -g ${pkgName}`,
      local: `pnpm update ${pkgName}`,
    },
    bun: {
      global: `bun add -g ${pkgName}`,
      local: `bun update ${pkgName}`,
    },
  }

  const pm = commands[packageManager] || commands.npm
  return isGlobal ? pm.global : pm.local
}
