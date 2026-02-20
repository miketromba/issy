import { describe, expect, it } from 'bun:test'
import {
	detectPackageManager,
	detectPackageManagerFromPath,
	isGlobalInstall,
	getUpdateCommand
} from '../src/update-checker'

describe('detectPackageManagerFromPath', () => {
	it('detects bun from ~/.bun/ path', () => {
		expect(
			detectPackageManagerFromPath(
				'/Users/test/.bun/install/global/node_modules/issy/bin/issy'
			)
		).toBe('bun')
	})

	it('detects pnpm from /pnpm/ path', () => {
		expect(
			detectPackageManagerFromPath(
				'/Users/test/.local/share/pnpm/global/5/node_modules/issy/bin/issy'
			)
		).toBe('pnpm')
	})

	it('detects pnpm from /.pnpm path', () => {
		expect(
			detectPackageManagerFromPath(
				'/Users/test/.pnpm-global/node_modules/issy/bin/issy'
			)
		).toBe('pnpm')
	})

	it('detects yarn from ~/.yarn/ path', () => {
		expect(
			detectPackageManagerFromPath(
				'/Users/test/.yarn/global/node_modules/issy/bin/issy'
			)
		).toBe('yarn')
	})

	it('detects yarn from yarn/global path', () => {
		expect(
			detectPackageManagerFromPath(
				'/Users/test/.config/yarn/global/node_modules/issy/bin/issy'
			)
		).toBe('yarn')
	})

	it('detects npm from ~/.nvm/ path', () => {
		expect(
			detectPackageManagerFromPath(
				'/Users/test/.nvm/versions/node/v20/lib/node_modules/issy/bin/issy'
			)
		).toBe('npm')
	})

	it('detects npm from /usr/local/lib/node_modules path', () => {
		expect(
			detectPackageManagerFromPath(
				'/usr/local/lib/node_modules/issy/bin/issy'
			)
		).toBe('npm')
	})

	it('detects npm from ~/.npm-global/ path', () => {
		expect(
			detectPackageManagerFromPath(
				'/Users/test/.npm-global/lib/node_modules/issy/bin/issy'
			)
		).toBe('npm')
	})

	it('returns null for unknown paths', () => {
		expect(detectPackageManagerFromPath('/some/random/path')).toBe(null)
	})
})

describe('detectPackageManager', () => {
	describe('from script path (priority 1)', () => {
		it('detects bun from path even without env vars', () => {
			expect(
				detectPackageManager(
					'/Users/test/.bun/install/global/node_modules/issy/bin/issy',
					{},
					'/tmp'
				)
			).toBe('bun')
		})

		it('detects pnpm from path even without env vars', () => {
			expect(
				detectPackageManager(
					'/Users/test/.local/share/pnpm/global/node_modules/issy/bin/issy',
					{},
					'/tmp'
				)
			).toBe('pnpm')
		})

		it('path detection takes priority over user agent', () => {
			// Script is in bun path but user agent says npm - path wins
			const env = { npm_config_user_agent: 'npm/10.2.0 node/v20.9.0' }
			expect(
				detectPackageManager(
					'/Users/test/.bun/install/global/node_modules/issy/bin/issy',
					env,
					'/tmp'
				)
			).toBe('bun')
		})
	})

	describe('from npm_config_user_agent (priority 2)', () => {
		it('detects npm when path is unknown', () => {
			const env = {
				npm_config_user_agent: 'npm/10.2.0 node/v20.9.0 darwin arm64'
			}
			expect(detectPackageManager('/unknown/path', env, '/tmp')).toBe(
				'npm'
			)
		})

		it('detects yarn when path is unknown', () => {
			const env = {
				npm_config_user_agent:
					'yarn/1.22.19 npm/? node/v20.9.0 darwin arm64'
			}
			expect(detectPackageManager('/unknown/path', env, '/tmp')).toBe(
				'yarn'
			)
		})

		it('detects pnpm when path is unknown', () => {
			const env = {
				npm_config_user_agent:
					'pnpm/8.10.0 npm/? node/v20.9.0 darwin arm64'
			}
			expect(detectPackageManager('/unknown/path', env, '/tmp')).toBe(
				'pnpm'
			)
		})

		it('detects bun when path is unknown', () => {
			const env = { npm_config_user_agent: 'bun/1.0.0' }
			expect(detectPackageManager('/unknown/path', env, '/tmp')).toBe(
				'bun'
			)
		})
	})

	describe('fallback behavior', () => {
		it('defaults to npm when no indicators present', () => {
			expect(
				detectPackageManager('/unknown/path', {}, '/tmp/nonexistent')
			).toBe('npm')
		})

		it('works without scriptPath argument', () => {
			const env = { npm_config_user_agent: 'bun/1.0.0' }
			expect(detectPackageManager(undefined, env, '/tmp')).toBe('bun')
		})
	})
})

describe('isGlobalInstall', () => {
	it('returns true when npm_config_global is set', () => {
		const env = { npm_config_global: 'true', HOME: '/Users/test' }
		expect(isGlobalInstall('/some/random/path', env)).toBe(true)
	})

	it('returns true for /usr/local/lib/node_modules path', () => {
		const env = { HOME: '/Users/test' }
		expect(
			isGlobalInstall('/usr/local/lib/node_modules/issy/bin/issy', env)
		).toBe(true)
	})

	it('returns true for ~/.bun/install/global path', () => {
		const env = { HOME: '/Users/test' }
		expect(
			isGlobalInstall(
				'/Users/test/.bun/install/global/node_modules/issy/bin/issy',
				env
			)
		).toBe(true)
	})

	it('returns true for ~/.nvm path', () => {
		const env = { HOME: '/Users/test' }
		expect(
			isGlobalInstall(
				'/Users/test/.nvm/versions/node/v20/lib/node_modules/issy/bin/issy',
				env
			)
		).toBe(true)
	})

	it('returns true when running via npx', () => {
		const env = { HOME: '/Users/test', _: '/usr/local/bin/npx' }
		expect(isGlobalInstall('/some/cache/path', env)).toBe(true)
	})

	it('returns true when running via bunx', () => {
		const env = { HOME: '/Users/test', _: '/Users/test/.bun/bin/bunx' }
		expect(isGlobalInstall('/some/cache/path', env)).toBe(true)
	})

	it('returns true when npm_execpath contains npx', () => {
		const env = {
			HOME: '/Users/test',
			npm_execpath: '/usr/local/lib/node_modules/npm/bin/npx-cli.js'
		}
		expect(isGlobalInstall('/some/cache/path', env)).toBe(true)
	})

	// Default behavior
	it('defaults to true (global) for unknown paths', () => {
		const env = { HOME: '/Users/test' }
		expect(isGlobalInstall('/some/unknown/path', env)).toBe(true)
	})

	// Local install detection - this tests the node_modules + package.json check
	// Note: This test actually checks the file system, so it uses a real path
	it('returns false for local install in a project with package.json', () => {
		const env = { HOME: '/Users/test' }
		// Use a path that looks like a local node_modules install
		// The project root (first part before /node_modules/) should have a package.json
		const localPath = `${process.cwd()}/node_modules/issy/bin/issy`
		expect(isGlobalInstall(localPath, env)).toBe(false)
	})
})

describe('getUpdateCommand', () => {
	describe('global installs', () => {
		it('returns correct npm global command', () => {
			expect(getUpdateCommand('npm', true)).toBe('npm install -g issy')
		})

		it('returns correct yarn global command', () => {
			expect(getUpdateCommand('yarn', true)).toBe('yarn global add issy')
		})

		it('returns correct pnpm global command', () => {
			expect(getUpdateCommand('pnpm', true)).toBe('pnpm add -g issy')
		})

		it('returns correct bun global command', () => {
			expect(getUpdateCommand('bun', true)).toBe('bun add -g issy')
		})
	})

	describe('local installs', () => {
		it('returns correct npm local command', () => {
			expect(getUpdateCommand('npm', false)).toBe('npm update issy')
		})

		it('returns correct yarn local command', () => {
			expect(getUpdateCommand('yarn', false)).toBe('yarn upgrade issy')
		})

		it('returns correct pnpm local command', () => {
			expect(getUpdateCommand('pnpm', false)).toBe('pnpm update issy')
		})

		it('returns correct bun local command', () => {
			expect(getUpdateCommand('bun', false)).toBe('bun update issy')
		})
	})
})
