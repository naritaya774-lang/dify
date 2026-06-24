import type { KyInstance } from 'ky'
import type { HostsBundle } from '../../../auth/hosts.js'
import type { AppInfoCache } from '../../../cache/app-info.js'
import type { IOStreams } from '../../../sys/io/streams.js'
import type { FfmpegRunner, FrameRenderSpec, ImageMagickRunner, VideoAssemblySpec } from './media.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BaseError } from '../../../errors/base.js'
import { ErrorCode } from '../../../errors/codes.js'
import { bufferStreams } from '../../../sys/io/streams.js'
import { runApp } from '../../run/app/run.js'
import { assembleVideo, renderFrame } from './media.js'

export type GenerateVideoOptions = {
  readonly appId: string
  readonly message?: string
  readonly inputsJson?: string
  readonly inputsFile?: string
  readonly outputFile: string
  readonly fps: number
  readonly slideDuration: number
  readonly width: number
  readonly height: number
  readonly bgColor: string
  readonly textColor: string
  readonly fontSize: number
  readonly workspace?: string
}

export type GenerateVideoDeps = {
  readonly bundle: HostsBundle
  readonly http: KyInstance
  readonly host: string
  readonly io: IOStreams
  readonly cache?: AppInfoCache
  readonly renderFrame?: ImageMagickRunner
  readonly assembleVideo?: FfmpegRunner
  readonly mktmpdir?: () => Promise<string>
  readonly cleanupTmpdir?: (dir: string) => Promise<void>
}

export { type FrameRenderSpec, type VideoAssemblySpec }

export function parseSlides(text: string): string[] {
  const SEP = /\n[ \t]*---[ \t]*\n/
  if (SEP.test(text))
    return text.split(SEP).map(s => s.trim()).filter(s => s !== '')
  const trimmed = text.trim()
  return trimmed === '' ? [] : [trimmed]
}

export async function runGenerateVideo(opts: GenerateVideoOptions, deps: GenerateVideoDeps): Promise<void> {
  const frameFn: ImageMagickRunner = deps.renderFrame ?? renderFrame
  const assembleFn: FfmpegRunner = deps.assembleVideo ?? assembleVideo
  const mktmp = deps.mktmpdir ?? (() => mkdtemp(join(tmpdir(), 'difyctl-video-')))
  const cleanupFn = deps.cleanupTmpdir ?? ((dir: string) => rm(dir, { recursive: true, force: true }))

  const captureIo = bufferStreams()
  await runApp(
    {
      appId: opts.appId,
      message: opts.message,
      inputsJson: opts.inputsJson,
      inputsFile: opts.inputsFile,
      workspace: opts.workspace,
      format: '',
      stream: false,
    },
    {
      bundle: deps.bundle,
      http: deps.http,
      host: deps.host,
      io: captureIo,
      cache: deps.cache,
      exit: (code) => {
        throw new BaseError({
          code: ErrorCode.Unknown,
          message: `app run exited with code ${String(code)}`,
        })
      },
    },
  )

  const slides = parseSlides(captureIo.outBuf())
  if (slides.length === 0)
    throw new BaseError({ code: ErrorCode.Unknown, message: 'app returned empty output; nothing to render' })

  const tmpDir = await mktmp()
  try {
    const framePaths: string[] = []
    for (let i = 0; i < slides.length; i++) {
      const framePath = join(tmpDir, `frame${String(i + 1).padStart(4, '0')}.png`)
      await frameFn({
        text: slides[i]!,
        width: opts.width,
        height: opts.height,
        bgColor: opts.bgColor,
        textColor: opts.textColor,
        fontSize: opts.fontSize,
        outputPath: framePath,
      })
      framePaths.push(framePath)
    }

    await assembleFn({
      framePaths,
      slideDuration: opts.slideDuration,
      fps: opts.fps,
      outputPath: opts.outputFile,
      tmpDir,
    })

    deps.io.out.write(`${opts.outputFile}\n`)
  }
  finally {
    await cleanupFn(tmpDir)
  }
}
