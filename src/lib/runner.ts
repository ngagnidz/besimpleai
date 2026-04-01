export type { Verdict } from '../types'

import pLimit from 'p-limit'
import type { Answer, Judge, JudgeAssignment, Question, Submission } from '../types'
import { callLLM } from './llm'
import { insertEvaluation } from './evaluations'
import {
  fetchActiveJudges,
  fetchAnswersForSubmissions,
  fetchJudgeAssignmentsForQueue,
  fetchQuestionsByQueueId,
  fetchSubmissionsForQueue,
} from './queries'

export type RunProgress = {
  planned: number
  completed: number
  failed: number
}

export type RunSummary = RunProgress

export async function runEvaluations(
  queueId: string,
  onProgress: (progress: RunProgress) => void,
): Promise<RunSummary> {
  // 1. Fetch all data needed for the run
  const [submissions, questions, assignments, judges] = await Promise.all([
    fetchSubmissionsForQueue(queueId),
    fetchQuestionsByQueueId(queueId),
    fetchJudgeAssignmentsForQueue(queueId),
    fetchActiveJudges(),
  ])

  // 2. Fetch answers for all submissions
  const submissionIds = submissions.map((s) => s.id)
  const answers = await fetchAnswersForSubmissions(submissionIds)

  const judgeMap = new Map(judges.map((j) => [j.id, j]))
  const answerMap = new Map(answers.map((a) => [`${a.submission_id}::${a.question_id}`, a]))

  // build all pairs first
  type EvalPair = {
    submission: Submission
    question: Question
    assignment: JudgeAssignment
    judge: Judge
    answer: Answer
  }

  const pairs: EvalPair[] = []
  for (const submission of submissions) {
    for (const question of questions) {
      const assigned = assignments.filter((a) => a.question_id === question.id)
      const answer = answerMap.get(`${submission.id}::${question.id}`)
      if (!answer) continue
      for (const assignment of assigned) {
        const judge = judgeMap.get(assignment.judge_id)
        if (!judge) continue
        pairs.push({ submission, question, assignment, judge, answer })
      }
    }
  }

  const progress: RunProgress = { planned: pairs.length, completed: 0, failed: 0 }
  onProgress({ ...progress })

  const limit = pLimit(3)

  await Promise.all(
    pairs.map((pair) =>
      limit(async () => {
        const answerText = JSON.stringify(pair.answer.answer_json)
        try {
          const result = await callLLM(pair.judge, pair.question.question_text, answerText)
          await insertEvaluation({
            submission_id: pair.submission.id,
            question_id: pair.question.id,
            judge_id: pair.judge.id,
            verdict: result.verdict,
            reasoning: result.reasoning,
          })
          progress.completed++
        } catch (err) {
          await insertEvaluation({
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

  return progress
}
