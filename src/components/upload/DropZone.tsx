import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'

type DropZoneProps = {
  onFile: (file: File) => void
  disabled?: boolean
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

function DropZone({ onFile, disabled = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null)

  const deliver = useCallback(
    (file: File) => {
      if (disabled) return
      if (!isJsonFile(file)) {
        return
      }
      setSelected({ name: file.name, size: file.size })
      onFile(file)
    },
    [onFile, disabled],
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
      if (disabled) return
      const file = event.dataTransfer.files?.[0]
      if (file) deliver(file)
    },
    [deliver, disabled],
  )

  const onDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled],
  )

  const onDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const browse = useCallback(() => {
    if (disabled) return
    inputRef.current?.click()
  }, [disabled])

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
        tabIndex={disabled ? -1 : 0}
        aria-busy={disabled}
        onClick={browse}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            browse()
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative rounded-xl border-2 border-dashed p-10 text-center transition ${
          disabled
            ? 'cursor-wait border-slate-200 bg-slate-50'
            : isDragging
              ? 'cursor-pointer border-indigo-500 bg-indigo-50'
              : 'cursor-pointer border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'
        }`}
      >
        {disabled ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
              aria-hidden
            />
            <p className="text-sm font-medium text-slate-700">Importing…</p>
            <p className="text-xs text-slate-500">Sending data to your queue list</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-800">Drop a .json file here or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">Only JSON files are accepted.</p>
          </>
        )}
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
