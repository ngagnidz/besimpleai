import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Judge } from '../types'
import { JUDGE_MODEL_OPTIONS } from '../lib/judges'
import type { JudgeInput, JudgeModelName } from '../lib/judges'

type JudgeFormProps = {
  initialValues?: JudgeInput
  onSubmit: (values: JudgeInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  submitError: string | null
}

const defaultValues: JudgeInput = {
  name: '',
  system_prompt: '',
  model_name: JUDGE_MODEL_OPTIONS[0],
  active: true,
}

function normalizeValues(values?: JudgeInput): JudgeInput {
  if (!values) return defaultValues
  return {
    name: values.name,
    system_prompt: values.system_prompt,
    model_name: values.model_name,
    active: values.active,
  }
}

function JudgeForm({ initialValues, onSubmit, onCancel, isSubmitting, submitError }: JudgeFormProps) {
  const [values, setValues] = useState<JudgeInput>(() => normalizeValues(initialValues))
  const [validationError, setValidationError] = useState<string | null>(null)

  const title = useMemo(() => (initialValues ? 'Edit Judge' : 'New Judge'), [initialValues])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    if (values.name.trim().length === 0) {
      setValidationError('Name is required.')
      return
    }
    if (values.system_prompt.trim().length === 0) {
      setValidationError('System prompt is required.')
      return
    }

    await onSubmit({
      name: values.name.trim(),
      system_prompt: values.system_prompt.trim(),
      model_name: values.model_name,
      active: values.active,
    })
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-lg border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            type="text"
            value={values.name}
            onChange={(event) => {
              setValues((previous) => ({ ...previous, name: event.target.value }))
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-indigo-500 focus:ring-2"
            placeholder="Helpful judge name"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">System Prompt</span>
          <textarea
            value={values.system_prompt}
            onChange={(event) => {
              setValues((previous) => ({ ...previous, system_prompt: event.target.value }))
            }}
            className="mt-1 min-h-36 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-indigo-500 focus:ring-2"
            placeholder="Rubric and judging criteria"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Model</span>
          <select
            value={values.model_name}
            onChange={(event) => {
              setValues((previous) => ({
                ...previous,
                model_name: event.target.value as JudgeModelName,
              }))
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-indigo-500 focus:ring-2"
          >
            {JUDGE_MODEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(event) => {
              setValues((previous) => ({ ...previous, active: event.target.checked }))
            }}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700">Active</span>
        </label>
      </div>

      {validationError ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {validationError}
        </p>
      ) : null}

      {submitError ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save Judge'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function toJudgeInput(judge: Judge): JudgeInput {
  return {
    name: judge.name,
    system_prompt: judge.system_prompt,
    model_name: judge.model_name as JudgeModelName,
    active: judge.active,
  }
}

export default JudgeForm
