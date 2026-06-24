export const agentGuide = `
WORKFLOW
  1. run: difyctl generate video <app-id> [message] [flags]
  2. difyctl calls the Dify app and captures its text output.
  3. The output is split into slides on --- separators (one --- per line).
  4. Each slide is rendered as a PNG frame via ImageMagick (convert).
  5. ffmpeg assembles the frames into a video using the concat demuxer.

REQUIREMENTS
  - ffmpeg must be installed and accessible in PATH.
  - ImageMagick (convert) must be installed and accessible in PATH.

SLIDE FORMAT
  The Dify app should return plain text. Slides are separated by --- on its own line:

    Slide one content

    ---

    Slide two content

  If no --- is found the entire output becomes a single slide.

FLAGS
  -f, --output-file   Output video path (default: output.mp4)
  --fps               Frames per second (default: 24)
  --slide-duration    Seconds each slide is shown (default: 3)
  --width             Frame width in pixels (default: 1280)
  --height            Frame height in pixels (default: 720)
  --bg-color          Background color (default: black)
  --text-color        Text color (default: white)
  --font-size         Text point size (default: 48)
  --inputs            Workflow/completion inputs as JSON
  --inputs-file       Path to JSON file with inputs
  --workspace         Workspace ID

EXAMPLES
  difyctl generate video app-123 "Create a 3-slide intro about cats"
  difyctl generate video app-123 --inputs '{"topic":"space"}' -f space.mp4
  difyctl generate video app-123 --slide-duration 5 --width 1920 --height 1080

ERROR RECOVERY
  - "app returned empty output": the Dify app produced no text; check its prompts/inputs.
  - "convert: ...": ImageMagick not in PATH or arguments invalid; verify installation.
  - "ffmpeg exited": ffmpeg not in PATH or codec unavailable; verify ffmpeg build includes libx264.
`
