import type { Judge, JudgeAssignment, Question } from '../../types'
import { QuestionJudgeMultiSelect } from './QuestionJudgeMultiSelect'
import { formatQuestionTypeLabel, questionTypePillClass } from './questionTypeDisplay'

type QueueQuestionsTableProps = {
  questions: Question[]
  judges: Judge[]
  assignments: JudgeAssignment[]
  onJudgeSelectionChange: (questionId: string, nextJudgeIds: string[]) => Promise<void>
}

function judgeIdsForQuestion(assignments: JudgeAssignment[], questionId: string): string[] {
  return assignments.filter((a) => a.question_id === questionId).map((a) => a.judge_id)
}

const headerRowClass =
  'border-b border-indigo-200/80 bg-gradient-to-b from-indigo-50/95 to-violet-100/50'

export function QueueQuestionsTable({
  questions,
  judges,
  assignments,
  onJudgeSelectionChange,
}: QueueQuestionsTableProps) {
  if (questions.length === 0) {
    return (
      <p className="animate-queues-panel-in rounded-xl border border-stone-200 bg-stone-50/90 px-4 py-10 text-center text-sm text-stone-600">
        No questions found for this queue
      </p>
    )
  }

  return (
    <section
      id="queue-questions"
      className="animate-queues-panel-in overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(28,25,23,0.06)]"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className={headerRowClass}>
              <th className="px-5 py-3.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-stone-600">
                Question
              </th>
              <th className="whitespace-nowrap px-5 py-3.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-stone-600">
                Type
              </th>
              <th className="min-w-[14rem] px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-stone-600">
                Assigned judges
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, index) => {
              const selected = judgeIdsForQuestion(assignments, q.id)
              return (
                <tr
                  key={q.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-queue-row-in border-b border-stone-100 last:border-b-0"
                >
                  <td className="max-w-md px-5 py-4 align-top text-stone-900">{q.question_text}</td>
                  <td className="whitespace-nowrap px-5 py-4 align-top">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${questionTypePillClass(q.question_type)}`}
                    >
                      {formatQuestionTypeLabel(q.question_type)}
                    </span>
                  </td>
                  <td className="min-w-[14rem] max-w-md align-top px-5 py-4 text-left">
                    <QuestionJudgeMultiSelect
                      judges={judges}
                      selectedJudgeIds={selected}
                      variant="compact"
                      onChange={(next) => onJudgeSelectionChange(q.id, next)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
