import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type ChildProcess, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { connect } from 'node:net'
import { networkInterfaces, tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	DEFAULT_HOST,
	displayUrl,
	isLoopbackHost,
	resolveHost,
	resolvePort
} from '../src/config'
import { handleRequest } from '../src/handler'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FakeResponse = {
	status: number | null
	body: string
	destroyed: boolean
	headersSent: boolean
	writeHead(status: number): void
	end(body?: string): void
	destroy(): void
}

function fakeResponse(
	overrides: Partial<Pick<FakeResponse, 'writeHead' | 'end'>> = {}
): FakeResponse {
	const res: FakeResponse = {
		status: null,
		body: '',
		destroyed: false,
		headersSent: false,
		writeHead(status) {
			res.status = status
			res.headersSent = true
		},
		end(body = '') {
			res.body += body
		},
		destroy() {
			res.destroyed = true
		},
		...overrides
	}
	return res
}

function request(
	url: string,
	res: FakeResponse,
	method = 'GET'
): Promise<void> {
	return handleRequest(
		{ url, method } as IncomingMessage,
		res as unknown as ServerResponse
	)
}

/** Sends one raw HTTP/1.1 request and returns the response's status line. */
function rawRequest(host: string, port: number, target: string) {
	return new Promise<string>((resolve, reject) => {
		const socket = connect(port, host)
		let data = ''
		socket.setTimeout(5000, () => {
			socket.destroy()
			reject(new Error(`No response to ${target}`))
		})
		socket.on('data', chunk => {
			data += chunk
		})
		socket.on('error', reject)
		socket.on('close', () => resolve(data.split('\r\n')[0] ?? ''))
		socket.write(
			`GET ${target} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`
		)
	})
}

/** Resolves true if a TCP connection to host:port opens, false otherwise. */
function canConnect(host: string, port: number) {
	return new Promise<boolean>(resolve => {
		const socket = connect(port, host)
		socket.setTimeout(2000, () => {
			socket.destroy()
			resolve(false)
		})
		socket.on('connect', () => {
			socket.destroy()
			resolve(true)
		})
		socket.on('error', () => resolve(false))
	})
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

describe('handleRequest', () => {
	test('answers 400 to a network-path target with an invalid authority', async () => {
		const res = fakeResponse()
		await request('//[', res)
		expect(res.status).toBe(400)
		expect(JSON.parse(res.body)).toEqual({
			error: 'Invalid request target'
		})
	})

	test('answers 400 to an absolute-form target with an invalid authority', async () => {
		const res = fakeResponse()
		await request('http://[', res)
		expect(res.status).toBe(400)
	})

	test('still serves valid requests', async () => {
		const res = fakeResponse()
		await request('/api/health', res)
		expect(res.status).toBe(200)
		expect(JSON.parse(res.body)).toEqual({ status: 'ok', service: 'issy' })
	})

	test('drops the connection instead of rejecting when a response fails midway', async () => {
		const res = fakeResponse({
			end() {
				throw new Error('socket gone')
			}
		})
		await expect(request('/api/health', res)).resolves.toBeUndefined()
		expect(res.destroyed).toBe(true)
	})

	test('never rejects, even when no response can be written at all', async () => {
		const res = fakeResponse({
			writeHead() {
				throw new Error('cannot write')
			}
		})
		await expect(request('/api/health', res)).resolves.toBeUndefined()
		expect(res.destroyed).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// Where the server listens
// ---------------------------------------------------------------------------

describe('config', () => {
	test('binds to loopback by default', () => {
		expect(DEFAULT_HOST).toBe('127.0.0.1')
		expect(resolveHost({})).toBe('127.0.0.1')
		expect(resolveHost({ ISSUES_HOST: '  ' })).toBe('127.0.0.1')
	})

	test('ISSUES_HOST overrides the host', () => {
		expect(resolveHost({ ISSUES_HOST: '0.0.0.0' })).toBe('0.0.0.0')
	})

	test('ignores HOST, which shells often set to the machine name', () => {
		expect(resolveHost({ HOST: 'my-machine.local' })).toBe('127.0.0.1')
	})

	test('resolves the port as before', () => {
		expect(resolvePort({})).toBe(1554)
		expect(resolvePort({ PORT: '4000' })).toBe(4000)
		expect(resolvePort({ ISSUES_PORT: '3000', PORT: '4000' })).toBe(3000)
	})

	test('recognizes loopback hosts', () => {
		expect(isLoopbackHost('127.0.0.1')).toBe(true)
		expect(isLoopbackHost('::1')).toBe(true)
		expect(isLoopbackHost('localhost')).toBe(true)
		expect(isLoopbackHost('0.0.0.0')).toBe(false)
		expect(isLoopbackHost('192.168.1.20')).toBe(false)
	})

	test('prints a URL people can open', () => {
		expect(displayUrl('127.0.0.1', 1554)).toBe('http://localhost:1554/')
		expect(displayUrl('0.0.0.0', 1554)).toBe('http://localhost:1554/')
		expect(displayUrl('192.168.1.20', 1554)).toBe(
			'http://192.168.1.20:1554/'
		)
		expect(displayUrl('fe80::1', 1554)).toBe('http://[fe80::1]:1554/')
	})
})

// ---------------------------------------------------------------------------
// The packaged server, bundled for Node exactly as scripts/build.js does and
// run under Node, which exits on an unhandled promise rejection
// ---------------------------------------------------------------------------

const nodePath = Bun.which('node')

const externalIPv4 = Object.values(networkInterfaces())
	.flat()
	.find(
		address =>
			address &&
			!address.internal &&
			(address.family === 'IPv4' || String(address.family) === '4')
	)?.address

describe.skipIf(!nodePath)('packaged Node server', () => {
	let dir = ''
	let child: ChildProcess | undefined
	let port = 0
	let output = ''

	beforeAll(async () => {
		dir = mkdtempSync(join(tmpdir(), 'issy-ui-server-'))
		const issyDir = join(dir, 'project', '.issy')
		mkdirSync(join(issyDir, 'issues'), { recursive: true })

		const build = await Bun.build({
			entrypoints: [join(import.meta.dir, '..', 'src', 'server.ts')],
			target: 'node',
			format: 'esm'
		})
		if (!build.success) {
			throw new Error(`Server build failed: ${build.logs.join('\n')}`)
		}
		const distDir = join(dir, 'dist')
		mkdirSync(distDir)
		const serverJs = join(distDir, 'server.js')
		await Bun.write(serverJs, build.outputs[0])

		const env: Record<string, string | undefined> = {
			...process.env,
			ISSUES_PORT: '0',
			ISSY_DIR: issyDir
		}
		delete env.ISSUES_HOST
		delete env.PORT

		child = spawn(nodePath as string, [serverJs], {
			env,
			stdio: ['ignore', 'pipe', 'pipe']
		})

		port = await new Promise<number>((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`Server did not start:\n${output}`)),
				15000
			)
			const onData = (chunk: Buffer) => {
				output += chunk
				const match = output.match(
					/running at http:\/\/localhost:(\d+)\//
				)
				if (match) {
					clearTimeout(timer)
					resolve(Number(match[1]))
				}
			}
			child?.stdout?.on('data', onData)
			child?.stderr?.on('data', (chunk: Buffer) => {
				output += chunk
			})
			child?.on('exit', code => {
				clearTimeout(timer)
				reject(new Error(`Server exited with ${code}:\n${output}`))
			})
		})
	}, 30000)

	afterAll(() => {
		child?.kill()
		if (dir) rmSync(dir, { recursive: true, force: true })
	})

	test('survives a malformed request-target and answers 400', async () => {
		expect(await rawRequest('127.0.0.1', port, '//[')).toBe(
			'HTTP/1.1 400 Bad Request'
		)
		// Give a crash on an unhandled rejection time to happen
		await Bun.sleep(300)
		expect(child?.exitCode).toBeNull()
		expect(await rawRequest('127.0.0.1', port, '/api/health')).toBe(
			'HTTP/1.1 200 OK'
		)
	}, 15000)

	test.skipIf(!externalIPv4)(
		'is not reachable on a non-loopback address by default',
		async () => {
			expect(await canConnect('127.0.0.1', port)).toBe(true)
			expect(await canConnect(externalIPv4 as string, port)).toBe(false)
		},
		15000
	)
})
