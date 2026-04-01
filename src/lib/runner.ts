/**
 * Orchestrates a full LLM judge pass for one queue.
 *
 * Builds every (submission, question, assigned judge) triple that has a stored answer, calls the configured
 * provider per judge (`llm.ts`), and persists results via `insertEvaluation` (upsert, so re-runs replace prior
 * verdicts for the same submission/question/judge). Only **active** judges participate, even if assignments
 * still reference inactive judges.
 *
 * Primary consumer: queue detail UI (`QueueDetailPage`) invoking `runEvaluations` from the browser.
 * Depends on read helpers in `queries.ts` and run bookkeeping in `queueStats.ts`.
 */
export type { Verdict } from '../types'

import pLimit from 'p-limit'
import type { Answer, Judge, JudgeAssignment, Question, Submission } from '../types'
import { callLLM } from './llm'
import { insertEvaluation } from './evaluations'
import { recordCompletedJudgeRun } from './queueStats'
import {
  fetchActiveJudges,
  fetchAnswersForSubmissions,
  fetchJudgeAssignmentsForQueue,
  fetchQuestionsByQueueId,
  fetchSubmissionsForQueue,
} from './queries'

/** Progress counters emitted during a run (`planned` totals vs `completed` / `failed` LLM attempts). */
export type RunProgress = {
  planned: number
  completed: number
  failed: number
}

/** Return value of `runEvaluations`; currently identical to `RunProgress`. */
export type RunSummary = RunProgress

/**
 * Runs all evaluation work for `queueId`: load graph data, fan out LLM calls with bounded concurrency, write evaluations, then update queue run metadata.
 *
 * **Pairing:** For each submission and question, every `judge_assignment` for that question yields one task if
 * an answer exists and the judge is in the active set. Submissions without an answer for that question are skipped.
 *
 * **Concurrency:** Up to three LLM requests run at once (`p-limit`).
 *
 * **Errors:** LLM or parsing failures still produce an `evaluations` row with `inconclusive` and the error message
 * as reasoning. Failures inside `insertEvaluation` propagate to the caller. `recordCompletedJudgeRun` is best-effort
 * (logs and returns `false` if the RPC fails; the run’s evaluation rows are unaffected).
 *
 * @param queueId Queue to evaluate.
 * @param onProgress Called after planning and after each task finishes (mutable progress object is copied per call).
 */
export async function runEvaluations(
  queueId: string,
  onProgress: (progress: RunProgress) => void,
): Promise<RunSummary> {
  const [submissions, questions, assignments, judges] = await Promise.all([
    fetchSubmissionsForQueue(queueId),
    fetchQuestionsByQueueId(queueId),
    fetchJudgeAssignmentsForQueue(queueId),
    fetchActiveJudges(),
  ])

  // Load submission IDs and answers in parallel

  // Get submission ids [sub_1, sub_2, sub_3...]
  const submissionIds = submissions.map((s) => s.id)

  // Get answers for each submission [answer_1, answer_2, answer_3...] each answer has a submission id, question id, and answer
  const answers = await fetchAnswersForSubmissions(submissionIds)

  // Create a map of judges by id [judge_1: judge_1, judge_2: judge_2, judge_3: judge_3...]
  const judgeMap = new Map(judges.map((j) => [j.id, j]))

  // Create a map of answers by submission id and question id [submission_1::question_1: answer_1, submission_1::question_2: answer_2, submission_2::question_1: answer_3...] 
  const answerMap = new Map(answers.map((a) => [`${a.submission_id}::${a.question_id}`, a]))

  type EvalPair = {
    submission: Submission
    question: Question
    assignment: JudgeAssignment
    judge: Judge
    answer: Answer
  }

  const pairs: EvalPair[] = []
  // Iterate over each submission and question
  for (const submission of submissions) {
    for (const question of questions) {
      // Get the assigned judges for the question
      const assigned = assignments.filter((a) => a.question_id === question.id)
      // Get the answer for the submission and question
      const answer = answerMap.get(`${submission.id}::${question.id}`)
      if (!answer) continue
      for (const assignment of assigned) {
        const judge = judgeMap.get(assignment.judge_id)
        if (!judge) continue
        pairs.push({ submission, question, assignment, judge, answer })
      }
    }
  }

  // Create a progress object with the number of pairs

  const progress: RunProgress = { planned: pairs.length, completed: 0, failed: 0 }
  onProgress({ ...progress })

  const limit = pLimit(3)

  await Promise.all(
    pairs.map((pair) =>
      limit(async () => {
        const answerText = JSON.stringify(pair.answer.answer_json)
        try {
          const result = await callLLM(
            pair.judge,
            pair.question.question_text,
            pair.question.question_type,
            answerText,
          )
          await insertEvaluation({
            queue_id: queueId,
            submission_id: pair.submission.id,
            question_id: pair.question.id,
            judge_id: pair.judge.id,
            verdict: result.verdict,
            reasoning: result.reasoning,
          })
          progress.completed++
        } catch (err) {
          await insertEvaluation({
            queue_id: queueId,
            submission_id: pair.submission.id,
            question_id: pair.question.id,
            judge_id: pair.judge.id,
            verdict: 'inconclusive',
            reasoning: err instanceof Error ? err.message : 'Unknown error',
          })
          progress.failed++
        }
        onProgress({ ...progress })
      }),
    ),
  )

  await recordCompletedJudgeRun(queueId)

  return progress
}
