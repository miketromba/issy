import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let issyDir: string

async function runCli(args: string[]) {
	const proc = Bun.spawn(['bun', 'src/cli.ts', ...args], {
		cwd: join(import.meta.dir, '..'),
		env: { ...process.env, ISSY_DIR: issyDir },
		stdout: 'pipe',
		stderr: 'pipe'
	})

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	])

	return { stdout, stderr, exitCode }
}

async function expectCli(args: string[]) {
	const result = await runCli(args)
	expect(result.exitCode, result.stderr).toBe(0)
	return result.stdout
}

describe('dependency CLI behavior', () => {
	beforeEach(async () => {
		issyDir = await mkdtemp(join(tmpdir(), 'issy-cli-test-'))
	})

	afterEach(async () => {
		await rm(issyDir, { recursive: true, force: true })
	})

	test('list shows compact blocker counts and --unblocked filters ready work', async () => {
		await expectCli(['create', '--title', 'Foundation', '--last'])
		await expectCli(['create', '--title', 'Independent', '--last'])
		await expectCli([
			'create',
			'--title',
			'Blocked feature',
			'--depends-on',
			'1,bad,9999',
			'--last'
		])

		const readOutput = await expectCli(['read', '0003'])
		expect(readOutput).toContain('Depends on:  #0001')
		expect(readOutput).not.toContain('#9999')

		const listOutput = await expectCli(['list'])
		expect(listOutput).toContain('Blk  Title')
		expect(listOutput).toContain('OPEN    1    Blocked feature')
		expect(listOutput).toContain('OPEN    -    Independent')

		const unblockedOutput = await expectCli(['list', '--unblocked'])
		expect(unblockedOutput).toContain('Foundation')
		expect(unblockedOutput).toContain('Independent')
		expect(unblockedOutput).not.toContain('Blocked feature')

		await expectCli(['close', '0001'])

		const unblockedAfterClose = await expectCli(['list', '--unblocked'])
		expect(unblockedAfterClose).toContain('Independent')
		expect(unblockedAfterClose).toContain('Blocked feature')
		expect(unblockedAfterClose).not.toContain('Foundation')
	})

	test('update --depends-on replaces and clears blockers', async () => {
		await expectCli(['create', '--title', 'Foundation', '--last'])
		await expectCli(['create', '--title', 'Feature', '--last'])
		await expectCli(['update', '0002', '--depends-on', '0001,0002,9999'])

		const blockedList = await expectCli(['list'])
		expect(blockedList).toContain('OPEN    1    Feature')

		const readOutput = await expectCli(['read', '0002'])
		expect(readOutput).toContain('Depends on:  #0001')
		expect(readOutput).not.toContain('#0002')
		expect(readOutput).not.toContain('#9999')

		await expectCli(['update', '0002', '--depends-on', ''])

		const unblockedList = await expectCli(['list', '--unblocked'])
		expect(unblockedList).toContain('Foundation')
		expect(unblockedList).toContain('Feature')
	})

	test('list --all still includes closed issues', async () => {
		await expectCli(['create', '--title', 'Closed issue', '--last'])
		await expectCli(['close', '0001'])

		const defaultList = await expectCli(['list'])
		expect(defaultList).toBe('No issues found.\n')

		const allList = await expectCli(['list', '--all'])
		expect(allList).toContain('CLOSED')
		expect(allList).toContain('Closed issue')
	})
})
