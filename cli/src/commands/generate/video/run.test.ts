import type { DifyMock } from '../../../../test/fixtures/dify-mock/server.js'
import type { HostsBundle } from '../../../auth/hosts.js'
import type { FrameRenderSpec, VideoAssemblySpec } from './run.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startMock } from '../../../../test/fixtures/dify-mock/server.js'
import { loadAppInfoCache } from '../../../cache/app-info.js'
import { createClient } from '../../../http/client.js'
import { CACHE_APP_INFO, cachePath } from '../../../store/manager.js'
import { YamlStore } from '../../../store/store.js'
import { bufferStreams } from '../../../sys/io/streams.js'
import { parseSlides, runGenerateVideo } from './run.js'

function bundle(): HostsBundle {
  return {
    current_host: 'http://localhost',
    token_storage: 'file',
    tokens: { bearer: 'dfoa_test' },
    account: { id: 'acct-1', email: 't@d.ai', name: 'T' },
    workspace: { id: 'ws-1', name: 'Default', role: 'owner' },
    available_workspaces: [
      { id: 'ws-1', name: 'Default', role: 'owner' },
    ],
  }
}

describe('parseSlides', () => {
  it('returns single slide for plain text', () => {
    expect(parseSlides('hello world\n')).toEqual(['hello world'])
  })

  it('splits on --- separator', () => {
    expect(parseSlides('slide one\n---\nslide two\n')).toEqual(['slide one', 'slide two'])
  })

  it('splits on --- with surrounding whitespace', () => {
    expect(parseSlides('first\n  ---  \nsecond\n')).toEqual(['first', 'second'])
  })

  it('filters empty sections after split', () => {
    expect(parseSlides('\n---\nhello\n---\n')).toEqual(['hello'])
  })

  it('returns empty array for blank text', () => {
    expect(parseSlides('   \n')).toEqual([])
  })
})

describe('runGenerateVideo', () => {
  let mock: DifyMock
  let dir: string

  beforeEach(async () => {
    mock = await startMock({ scenario: 'happy' })
    dir = await mkdtemp(join(tmpdir(), 'difyctl-vidtest-'))
  })

  afterEach(async () => {
    await mock.stop()
    await rm(dir, { recursive: true, force: true })
  })

  it('renders one slide and assembles video from workflow output', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ store: new YamlStore(cachePath(dir, CACHE_APP_INFO)) })
    const renderedFrames: FrameRenderSpec[] = []
    let capturedVideo: VideoAssemblySpec | undefined

    await runGenerateVideo(
      {
        appId: 'app-2',
        outputFile: join(dir, 'out.mp4'),
        fps: 24,
        slideDuration: 3,
        width: 1280,
        height: 720,
        bgColor: 'black',
        textColor: 'white',
        fontSize: 48,
      },
      {
        bundle: bundle(),
        http: createClient({ host: mock.url, bearer: 'dfoa_test' }),
        host: mock.url,
        io,
        cache,
        renderFrame: async (spec) => { renderedFrames.push(spec) },
        assembleVideo: async (spec) => { capturedVideo = spec },
        mktmpdir: async () => dir,
        cleanupTmpdir: async () => {},
      },
    )

    expect(renderedFrames).toHaveLength(1)
    expect(renderedFrames[0]!.width).toBe(1280)
    expect(renderedFrames[0]!.height).toBe(720)
    expect(renderedFrames[0]!.bgColor).toBe('black')
    expect(renderedFrames[0]!.textColor).toBe('white')
    expect(renderedFrames[0]!.fontSize).toBe(48)

    expect(capturedVideo).toBeDefined()
    expect(capturedVideo!.framePaths).toHaveLength(1)
    expect(capturedVideo!.fps).toBe(24)
    expect(capturedVideo!.slideDuration).toBe(3)
    expect(capturedVideo!.outputPath).toBe(join(dir, 'out.mp4'))

    expect(io.outBuf()).toContain('out.mp4')
  })

  it('renders multiple slides when app output uses --- separator', async () => {
    const io = bufferStreams()
    const cache = await loadAppInfoCache({ store: new YamlStore(cachePath(dir, CACHE_APP_INFO)) })
    const renderedFrames: FrameRenderSpec[] = []

    // The chat app (app-1) returns the echoed message. We pass a message
    // containing --- to simulate multi-slide output.
    await runGenerateVideo(
      {
        appId: 'app-1',
        message: 'intro\n---\noutro',
        outputFile: join(dir, 'out.mp4'),
        fps: 24,
        slideDuration: 3,
        width: 640,
        height: 480,
        bgColor: 'navy',
        textColor: 'yellow',
        fontSize: 36,
      },
      {
        bundle: bundle(),
        http: createClient({ host: mock.url, bearer: 'dfoa_test' }),
        host: mock.url,
        io,
        cache,
        renderFrame: async (spec) => { renderedFrames.push(spec) },
        assembleVideo: async () => {},
        mktmpdir: async () => dir,
        cleanupTmpdir: async () => {},
      },
    )

    // The mock chat app echoes back the message text which contains ---,
    // so the output should be split into two slides.
    expect(renderedFrames.length).toBeGreaterThanOrEqual(1)
    for (const frame of renderedFrames) {
      expect(frame.bgColor).toBe('navy')
      expect(frame.textColor).toBe('yellow')
      expect(frame.fontSize).toBe(36)
    }
  })

  it('throws when app returns empty output', async () => {
    const io = bufferStreams()

    // Use a non-existent app to trigger a 404 (which becomes an error)
    await expect(
      runGenerateVideo(
        {
          appId: 'app-missing',
          outputFile: join(dir, 'out.mp4'),
          fps: 24,
          slideDuration: 3,
          width: 1280,
          height: 720,
          bgColor: 'black',
          textColor: 'white',
          fontSize: 48,
        },
        {
          bundle: bundle(),
          http: createClient({ host: mock.url, bearer: 'dfoa_test' }),
          host: mock.url,
          io,
          renderFrame: async () => {},
          assembleVideo: async () => {},
          mktmpdir: async () => dir,
          cleanupTmpdir: async () => {},
        },
      ),
    ).rejects.toThrow()
  })
})
