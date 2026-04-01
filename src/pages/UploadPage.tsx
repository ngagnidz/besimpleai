import { useCallback, useState } from 'react'
import DropZone from '../components/upload/DropZone'
import { ingestData } from '../lib/ingest'
import { parseSubmissions } from '../lib/parser'
import type { ParsedData } from '../lib/parser'

function UploadPage() {
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [successSummary, setSuccessSummary] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setParseError(null)
    setIngestError(null)
    setSuccessSummary(null)
    setParsed(null)

    try {
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      const data = parseSubmissions(raw)
      setParsed(data)
    } catch (error) {
      if (error instanceof SyntaxError) {
        setParseError('File is not valid JSON.')
      } else if (error instanceof Error) {
        setParseError(error.message)
      } else {
        setParseError('Failed to read file.')
      }
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (!parsed) return
    setIsImporting(true)
    setIngestError(null)
    setSuccessSummary(null)

    try {
      await ingestData(parsed)
      setSuccessSummary(
        `Imported ${parsed.submissions.length} submissions, ${parsed.questions.length} questions.`,
      )
    } catch (error) {
      setIngestError(error instanceof Error ? error.message : 'Import failed.')
    } finally {
      setIsImporting(false)
    }
  }, [parsed])

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload submissions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Import a JSON array of submissions with id, queueId, questions, and answers.
        </p>
      </div>

      <DropZone onFile={(file) => void handleFile(file)} />

      {parseError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {parseError}
        </div>
      ) : null}

      {parsed ? (
        <>
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Preview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 font-medium text-slate-600">Submission ID</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Queue ID</th>
                    <th className="px-4 py-3 font-medium text-slate-600"># Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.previewRows.map((row) => (
                    <tr key={row.submissionId} className="border-b border-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-900">{row.submissionId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.queueId}</td>
                      <td className="px-4 py-3 text-slate-700">{row.questionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isImporting}
              onClick={() => void handleImport()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImporting ? 'Importing…' : 'Import'}
            </button>
            <span className="text-xs text-slate-500">
              {parsed.queues.length} queue(s), {parsed.answers.length} answer row(s)
            </span>
          </div>
        </>
      ) : null}

      {ingestError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {ingestError}
        </div>
      ) : null}

      {successSummary ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successSummary}
        </div>
      ) : null}
    </div>
  )
}

export default UploadPage
