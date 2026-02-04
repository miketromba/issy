import { afterEach, beforeEach } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { setIssuesDir } from '../src/lib/index'

let tempDir: string

export function setupTestDir() {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(process.env.TMPDIR || '/tmp', 'issy-test-'))
    setIssuesDir(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
}
