import { type FormEvent, useEffect, useId, useState } from 'react'
import type { Judge, JudgeProvider } from '../../types'

const defaultJudgeProvider: JudgeProvider = 'openai'

function isJudgeProvider(v: string): v is JudgeProvider {
  return v === 'openai' || v === 'anthropic'
}

export type JudgeFormSubmitValues = {
  id?: string
  name: string
  system_prompt: string
  provider: JudgeProvider
  model: string
  active: boolean
}

type JudgeFormPanelProps = {
  open: boolean
  initialJudge: Judge | null
  onClose: () => void
  onSave: (values: JudgeFormSubmitValues) => Promise<void>
  isSaving: boolean
}

const PROVIDERS: { value: JudgeProvider; label: string; hint: string }[] = [
  { value: 'openai', label: 'OpenAI', hint: 'GPT-4 family' },
  { value: 'anthropic', label: 'Anthropic', hint: 'Claude 4.5' },
]

/** Hardcoded model ids — keep in sync with what your judge runner passes to each API. */
const MODEL_OPTIONS: Record<JudgeProvider, readonly string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
}

function firstModelForProvider(p: JudgeProvider): string {
  return MODEL_OPTIONS[p][0]
}

function emptyForm(): Omit<JudgeFormSubmitValues, 'id'> {
  return {
    name: '',
    system_prompt: '',
    provider: defaultJudgeProvider,
    model: firstModelForProvider(defaultJudgeProvider),
    active: true,
  }
}

const labelText =
  'block text-xs font-semibold uppercase tracking-wide text-slate-500'
const fieldLabelClass = `${labelText} mb-1.5`

const inputClass =
  'w-full rounded-xl border-0 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 shadow-inner shadow-slate-200/60 ring-1 ring-slate-200/80 transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/35'

const modelSelectClass =
  'w-full appearance-none rounded-xl border-0 bg-white py-3 pl-3.5 pr-12 font-mono text-sm text-slate-800 shadow-sm ring-1 ring-slate-200/90 transition hover:bg-slate-50/90 hover:ring-slate-300/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60'

export function JudgeFormPanel({ open, initialJudge, onClose, onSave, isSaving }: JudgeFormPanelProps) {
  const titleId = useId()
  const descId = useId()
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [provider, setProvider] = useState<JudgeProvider>(defaultJudgeProvider)
  const [model, setModel] = useState(() => firstModelForProvider(defaultJudgeProvider))
  const [active, setActive] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; system_prompt?: string }>({})

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setFieldErrors({})
    if (initialJudge) {
      setName(initialJudge.name)
      setSystemPrompt(initialJudge.system_prompt)
      const p = isJudgeProvider(initialJudge.provider) ? initialJudge.provider : defaultJudgeProvider
      setProvider(p)
      const allowed = MODEL_OPTIONS[p]
      setModel(allowed.includes(initialJudge.model) ? initialJudge.model : allowed[0])
      setActive(initialJudge.active)
    } else {
      const d = emptyForm()
      setName(d.name)
      setSystemPrompt(d.system_prompt)
      setProvider(d.provider)
      setModel(d.model)
      setActive(d.active)
    }
  }, [open, initialJudge])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const onProviderChange = (next: JudgeProvider) => {
    setProvider(next)
    const allowed = MODEL_OPTIONS[next]
    setModel((current) => (allowed.includes(current) ? current : allowed[0]))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: { name?: string; system_prompt?: string } = {}
    if (!name.trim()) errs.name = 'Required'
    if (!systemPrompt.trim()) errs.system_prompt = 'Required'
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      setSubmitError(null)
      await onSave({
        id: initialJudge?.id,
        name: name.trim(),
        system_prompt: systemPrompt.trim(),
        provider,
        model: model.trim(),
        active,
      })
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="animate-judge-modal-backdrop absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
        onClick={() => !isSaving && onClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="animate-judge-modal relative flex max-h-[min(76vh,34rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.28)] sm:max-h-[min(78vh,36rem)]"
      >
        <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-linear-to-b from-white to-slate-50/90 px-6 py-4">
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">
              {initialJudge ? 'Edit judge' : 'New judge'}
            </h2>
            <p id={descId} className="mt-1 text-sm leading-relaxed text-slate-500">
              Name, rubric, and which model runs evaluations.
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="relative z-10 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {submitError ? (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200/80 bg-red-50/95 px-3.5 py-2.5 text-sm text-red-800"
              >
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-col gap-5">
              <div className="flex flex-col">
                <label htmlFor="judge-name" className={fieldLabelClass}>
                  Name <span className="font-normal normal-case tracking-normal text-red-600">*</span>
                </label>
                <input
                  id="judge-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  placeholder="e.g. Strict safety reviewer"
                  className={inputClass}
                />
                {fieldErrors.name ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.name}</p>
                ) : null}
              </div>

              <div className="flex flex-col">
                <label htmlFor="judge-rubric" className={fieldLabelClass}>
                  System prompt / rubric{' '}
                  <span className="font-normal normal-case tracking-normal text-red-600">*</span>
                </label>
                <textarea
                  id="judge-rubric"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={5}
                  placeholder="Instructions the model follows when judging…"
                  className={`${inputClass} min-h-[5.5rem] resize-y font-mono text-[0.8125rem] leading-relaxed`}
                />
                {fieldErrors.system_prompt ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.system_prompt}</p>
                ) : null}
              </div>

              <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4">
                <header>
                  <h3 className={labelText}>Model settings</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Provider and model id passed through to your judge runner.
                  </p>
                </header>

                <div className="flex flex-col gap-1.5">
                  <span className={labelText} id="label-provider">
                    Provider
                  </span>
                  <div
                    className="grid grid-cols-2 gap-2 rounded-xl bg-slate-200/60 p-1"
                    role="group"
                    aria-labelledby="label-provider"
                  >
                    {PROVIDERS.map(({ value, label, hint }) => {
                      const selected = provider === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onProviderChange(value)}
                          className={`flex min-h-[4.25rem] flex-col items-stretch justify-center rounded-lg px-3 py-2 text-left transition ${
                            selected
                              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span className="text-sm font-semibold leading-tight">{label}</span>
                          <span className="mt-1 text-[0.7rem] font-normal leading-snug text-slate-500">{hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col">
                  <label htmlFor="judge-model" className={fieldLabelClass}>
                    Model <span className="font-normal normal-case tracking-normal text-red-600">*</span>
                  </label>
                  <div className="group relative">
                    <select
                      id="judge-model"
                      value={model}
                      disabled={isSaving}
                      onChange={(e) => setModel(e.target.value)}
                      className={`${modelSelectClass} cursor-pointer`}
                      aria-label="Model"
                    >
                      {MODEL_OPTIONS[provider].map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                    <span
                      className="pointer-events-none absolute inset-y-px right-px flex w-11 items-center justify-center rounded-r-[0.65rem] border-l border-slate-200/70 bg-linear-to-b from-slate-50 to-slate-100/90 text-slate-500 shadow-inner shadow-slate-200/30 transition group-focus-within:border-indigo-200/80 group-focus-within:bg-linear-to-b group-focus-within:from-indigo-50/90 group-focus-within:to-indigo-50/50 group-focus-within:text-indigo-600 group-hover:border-slate-300/80"
                      aria-hidden
                    >
                      <svg
                        className="size-4 shrink-0 opacity-90"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </section>

              <section className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
                <div className="min-w-0 pr-2">
                  <span className="block text-sm font-semibold text-slate-900">Active</span>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">
                    Inactive judges won&apos;t appear in assignment flows.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  disabled={isSaving}
                  onClick={() => setActive((v) => !v)}
                  className={`relative h-8 w-[3.25rem] shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
                    active ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                      active ? 'translate-x-[1.25rem]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </section>
            </div>
          </div>

          <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-linear-to-t from-slate-50/95 to-white px-6 py-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save judge'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
