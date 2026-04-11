import JSZip from 'jszip'
import type { AllArtifacts } from './generators'

export async function exportArtifactsAsZip(
  solutionName: string,
  yaml: string,
  artifacts: AllArtifacts,
): Promise<void> {
  const zip = new JSZip()

  // Include the source SDL
  zip.file('solution.sdl.yaml', yaml)

  // All artifact files
  for (const result of Object.values(artifacts)) {
    if (!result) continue
    for (const file of result.files) {
      zip.file(file.path, file.content)
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = solutionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  a.href = url
  a.download = `${slug}-artifacts.zip`
  a.click()
  URL.revokeObjectURL(url)
}
