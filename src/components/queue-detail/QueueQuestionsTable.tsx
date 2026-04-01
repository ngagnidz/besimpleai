import type { Question } from '../../types'

type QueueQuestionsTableProps = {
  questions: Question[]
}

export function QueueQuestionsTable({ questions }: QueueQuestionsTableProps) {
  if (questions.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No questions found for this queue
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 font-medium text-slate-600">Question Text</th>
              <th className="px-4 py-3 font-medium text-slate-600">Type</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-b border-slate-100 last:border-b-0">
                <td className="max-w-md px-4 py-3 align-top text-slate-900">{q.question_text}</td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {q.question_type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
