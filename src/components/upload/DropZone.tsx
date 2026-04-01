import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'

type DropZoneProps = {
  onFile: (file: File) => void
}

function isJsonFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.json') || file.type === 'application/json' || file.type === 'text/json'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function DropZone({ onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null)

  const deliver = useCallback(
    (file: File) => {
      if (!isJsonFile(file)) {
        return
      }
      setSelected({ name: file.name, size: file.size })
      onFile(file)
    },
    [onFile],
  )

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file) deliver(file)
    },
    [deliver],
  )

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) deliver(file)
    },
    [deliver],
  )

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const browse = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={browse}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            browse()
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'
        }`}
      >
        <p className="text-sm font-medium text-slate-800">Drop a .json file here or click to browse</p>
        <p className="mt-1 text-xs text-slate-500">Only JSON files are accepted.</p>
      </div>

      {selected ? (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">{selected.name}</span>
          <span className="text-slate-400"> · </span>
          {formatBytes(selected.size)}
        </p>
      ) : null}
    </div>
  )
}

export default DropZone
