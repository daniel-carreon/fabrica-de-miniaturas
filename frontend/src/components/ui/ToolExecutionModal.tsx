'use client'

interface ToolExecutionModalProps {
  isVisible: boolean
  toolName: string | null
  progress?: number
  status?: 'idle' | 'running' | 'complete' | 'error'
}

/**
 * ToolExecutionModal - MINIMAL text indicator when AI executes tools
 *
 * UX: Bottom-left corner, simple blinking text showing tool name
 * User requested: "algo bien minimalista, como un texto plano parpadeando"
 */
export function ToolExecutionModal({
  isVisible,
  toolName,
  status = 'running'
}: ToolExecutionModalProps) {
  if (!isVisible || !toolName) return null

  // Simple tool name labels
  const toolLabels: Record<string, string> = {
    'generate_avatar': 'Generando avatar',
    'create_images': 'Generando imágenes',
    'combine_images': 'Combinando imágenes'
  }

  const label = toolLabels[toolName] || toolName.replace(/_/g, ' ')

  return (
    <div className="fixed bottom-20 left-4 z-40 animate-fade-in">
      <div className="bg-orange-900/90 backdrop-blur-md rounded-lg px-4 py-2.5 border border-orange-500/40 shadow-lg">
        <span className="text-sm text-orange-200 font-medium animate-blink">
          Ejecutando: {label}...
        </span>
      </div>
    </div>
  )
}
