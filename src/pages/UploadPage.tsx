import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import DropZone from '../components/upload/DropZone'
import { ingestData } from '../lib/ingest'
import { parseSubmissions } from '../lib/parser'

function UploadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsProcessing(true)

      try {
        const text = await file.text()
        let raw: unknown
        try {
          raw = JSON.parse(text)
        } catch {
          setError('File is not valid JSON.')
          return
        }


        const data = parseSubmissions(raw)


        await ingestData(data)

        
        await queryClient.invalidateQueries({ queryKey: ['queues', 'summaries'] })
        navigate('/queues', { replace: true })
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Import failed.')
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [navigate, queryClient],
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload submissions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Drop a JSON file — we validate, import to Supabase, and take you to <strong>Queues</strong>.
        </p>
      </div>

      <DropZone onFile={(file) => void handleFile(file)} disabled={isProcessing} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export default UploadPage
