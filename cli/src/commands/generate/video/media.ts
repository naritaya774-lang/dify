import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type FrameRenderSpec = {
  readonly text: string
  readonly width: number
  readonly height: number
  readonly bgColor: string
  readonly textColor: string
  readonly fontSize: number
  readonly outputPath: string
}

export type ImageMagickRunner = (spec: FrameRenderSpec) => Promise<void>

export async function renderFrame(spec: FrameRenderSpec): Promise<void> {
  await spawnCmd('convert', [
    '-size',
    `${spec.width}x${spec.height}`,
    `xc:${spec.bgColor}`,
    '-fill',
    spec.textColor,
    '-gravity',
    'Center',
    '-pointsize',
    String(spec.fontSize),
    '-annotate',
    '0',
    spec.text,
    spec.outputPath,
  ])
}

export type VideoAssemblySpec = {
  readonly framePaths: readonly string[]
  readonly slideDuration: number
  readonly fps: number
  readonly outputPath: string
  readonly tmpDir: string
}

export type FfmpegRunner = (spec: VideoAssemblySpec) => Promise<void>

export async function assembleVideo(spec: VideoAssemblySpec): Promise<void> {
  const concatPath = join(spec.tmpDir, 'concat.txt')
  const lines: string[] = []
  for (const p of spec.framePaths) {
    lines.push(`file '${p}'`)
    lines.push(`duration ${spec.slideDuration}`)
  }
  // ffmpeg concat demuxer requires repeating the last file without duration
  if (spec.framePaths.length > 0)
    lines.push(`file '${spec.framePaths[spec.framePaths.length - 1]!}'`)
  await writeFile(concatPath, `${lines.join('\n')}\n`, 'utf8')

  await spawnCmd('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-vf',
    `fps=${spec.fps}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    spec.outputPath,
  ])
}

function spawnCmd(cmd: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, [...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    const errParts: Buffer[] = []
    proc.stderr?.on('data', (chunk: Buffer) => errParts.push(chunk))
    proc.on('close', (code) => {
      if (code === 0)
        resolve()
      else
        reject(new Error(`${cmd} exited ${String(code)}: ${Buffer.concat(errParts).toString('utf8').trim()}`))
    })
    proc.on('error', err => reject(new Error(`${cmd}: ${err.message}`)))
  })
}
