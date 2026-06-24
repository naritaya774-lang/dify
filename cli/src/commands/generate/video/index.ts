import { Args, Flags } from '../../../framework/flags.js'
import { DifyCommand } from '../../_shared/dify-command.js'
import { httpRetryFlag } from '../../_shared/global-flags.js'
import { agentGuide } from './guide.js'
import { runGenerateVideo } from './run.js'

export default class GenerateVideo extends DifyCommand {
  static override description = 'Generate a video from Dify app output using ffmpeg and ImageMagick'

  static override examples = [
    '<%= config.bin %> generate video app-1 "Create a 3-slide intro about cats"',
    '<%= config.bin %> generate video app-1 --inputs \'{"topic":"space"}\' -f space.mp4',
    '<%= config.bin %> generate video app-1 --slide-duration 5 --width 1920 --height 1080',
  ]

  static override args = {
    id: Args.string({ description: 'app id', required: true }),
    message: Args.string({ description: 'prompt message (chat/completion apps)', required: false }),
  }

  static override flags = {
    'output-file': Flags.string({ char: 'f', description: 'output video file path', default: 'output.mp4' }),
    'fps': Flags.integer({ description: 'frames per second', default: 24 }),
    'slide-duration': Flags.integer({ description: 'seconds each slide is displayed', default: 3 }),
    'width': Flags.integer({ description: 'video width in pixels', default: 1280 }),
    'height': Flags.integer({ description: 'video height in pixels', default: 720 }),
    'bg-color': Flags.string({ description: 'slide background color', default: 'black' }),
    'text-color': Flags.string({ description: 'slide text color', default: 'white' }),
    'font-size': Flags.integer({ description: 'text point size', default: 48 }),
    'inputs': Flags.string({ description: 'input variables as JSON' }),
    'inputs-file': Flags.string({ description: 'path to JSON file with inputs' }),
    'workspace': Flags.string({ description: 'workspace id (overrides DIFY_WORKSPACE_ID and stored default)' }),
    'http-retry': httpRetryFlag,
    'output': Flags.string({ char: 'o', description: 'output format (json|yaml|text)', default: '' }),
  }

  async run(argv: string[]): Promise<void> {
    const { args, flags } = this.parse(GenerateVideo, argv)
    const format = flags.output
    const ctx = await this.authedCtx({ retryFlag: flags['http-retry'], withCache: true, format })
    await runGenerateVideo(
      {
        appId: args.id,
        message: args.message,
        inputsJson: flags.inputs,
        inputsFile: flags['inputs-file'],
        outputFile: flags['output-file'],
        fps: flags.fps,
        slideDuration: flags['slide-duration'],
        width: flags.width,
        height: flags.height,
        bgColor: flags['bg-color'],
        textColor: flags['text-color'],
        fontSize: flags['font-size'],
        workspace: flags.workspace,
      },
      { bundle: ctx.bundle, http: ctx.http, host: ctx.host, io: ctx.io, cache: ctx.cache },
    )
  }

  override agentGuide(): string {
    return agentGuide
  }
}
