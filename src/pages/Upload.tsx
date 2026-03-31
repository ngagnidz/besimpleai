import { useCallback, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseSubmissionJson, upsertSubmissions } from '../lib/submissions'

type UploadState = {
  isLoading: boolean
  error: string | null
  successCount: number | null
  uploadedQueueId: string | null
  fileName: string | null
}

const initialState: UploadState = {
  isLoading: false,
  error: null,
  successCount: null,
  uploadedQueueId: null,
  fileName: null,
}

function Upload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [state, setState] = useState<UploadState>(initialState)

  const dropzoneClassName = useMemo(
    () =>
      `cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'
      } ${state.isLoading ? 'pointer-events-none opacity-70' : ''}`,
    [isDragging, state.isLoading],
  )

  const processFile = useCallback(async (file: File) => {
    setState({
      isLoading: true,
      error: null,
      successCount: null,
      uploadedQueueId: null,
      fileName: file.name,
    })

    try {
      const text = await file.text()
      const rows = parseSubmissionJson(text)
      await upsertSubmissions(rows)

      setState({
        isLoading: false,
        error: null,
        successCount: rows.length,
        uploadedQueueId: rows[0].queue_id,
        fileName: file.name,
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to process the uploaded file.'

      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: message,
        successCount: null,
        uploadedQueueId: null,
      }))
    }
  }, [])

  const onFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      await processFile(file)
      event.target.value = ''
    },
    [processFile],
  )

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)

      const file = event.dataTransfer.files?.[0]
      if (!file) return

      await processFile(file)
    },
    [processFile],
  )

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const openFilePicker = useCallback(() => {
    if (!state.isLoading) {
      fileInputRef.current?.click()
    }
  }, [state.isLoading])

  const goToQueue = useCallback(() => {
    if (state.uploadedQueueId) {
      navigate(`/queue/${state.uploadedQueueId}`)
    }
  }, [navigate, state.uploadedQueueId])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload Submissions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload a JSON file containing an array of submission objects. Existing IDs are updated
          with upsert.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onFileChange}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openFilePicker()
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={dropzoneClassName}
      >
        <p className="text-base font-medium text-slate-800">
          Drag and drop a `.json` file here, or click to select one
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Expected format: an array of submission objects with `id`, `queueId`, `labelingTaskId`,
          `createdAt`, `questions`, and `answers`.
        </p>
        {state.fileName ? (
          <p className="mt-4 text-sm text-slate-700">Selected file: {state.fileName}</p>
        ) : null}
      </div>

      {state.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Saving submissions...
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.successCount !== null ? (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
          <p className="text-sm font-medium text-emerald-800">
            {state.successCount} submissions uploaded successfully
          </p>
          <button
            type="button"
            className="w-fit rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={goToQueue}
          >
            Go to /queue
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default Upload
