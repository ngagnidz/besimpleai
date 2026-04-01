import type { Judge, JudgeAssignment, Question } from '../../types'
import { QuestionJudgeMultiSelect } from './QuestionJudgeMultiSelect'

type QueueQuestionsTableProps = {
  questions: Question[]
  judges: Judge[]
  assignments: JudgeAssignment[]
  onJudgeSelectionChange: (questionId: string, nextJudgeIds: string[]) => Promise<void>
}

function judgeIdsForQuestion(assignments: JudgeAssignment[], questionId: string): string[] {
  return assignments.filter((a) => a.question_id === questionId).map((a) => a.judge_id)
}

export function QueueQuestionsTable({
  questions,
  judges,
  assignments,
  onJudgeSelectionChange,
}: QueueQuestionsTableProps) {
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
              <th className="min-w-[14rem] px-4 py-3 text-left font-medium text-slate-600">
                <span className="block w-full text-left">Assigned Judges</span>
                <span className="mt-0.5 block w-full text-left text-[0.7rem] font-normal normal-case tracking-normal text-slate-400">
                  Toggle judges on or off per question
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const selected = judgeIdsForQuestion(assignments, q.id)
              return (
                <tr key={q.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="max-w-md px-4 py-3 align-top text-slate-900">{q.question_text}</td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {q.question_type}
                    </span>
                  </td>
                  <td className="min-w-[14rem] max-w-md align-top px-4 py-3 text-left">
                    <QuestionJudgeMultiSelect
                      judges={judges}
                      selectedJudgeIds={selected}
                      onChange={(next) => onJudgeSelectionChange(q.id, next)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
