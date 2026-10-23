import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { CATEGORIES, LIMITS } from '../../shared/types'
import type { BillCategory } from '../../shared/types'
import { api } from '../api'
import { rememberedName, rememberName, submitterToken } from '../lib/identity'
import { prepareImage } from '../lib/image'
import type { Box } from '../lib/image'
import { formatCents, parseDollars } from '../lib/money'
import { href, navigate } from '../lib/router'
import { isoDateFromToday } from '../lib/time'
import { Redactor } from './Redactor'

const MAX_PHOTO_BYTES = 25 * 1024 * 1024

const PITCH_EXAMPLES = [
  'My cat discovered the space heater and I have lost every negotiation since.',
  'I have a degree in medieval poetry. It has not paid for itself. Yet.',
  'Biscuit ate a sock. Biscuit is fine. My wallet is not.',
  'The sign said two-hour parking. It did not say which two hours.',
]

interface FormState {
  submitterName: string
  title: string
  payee: string
  amount: string
  dueDate: string
  category: BillCategory
  plea: string
}

type Errors = Partial<Record<keyof FormState | 'file', string>>

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.submitterName.trim()) errors.submitterName = 'Billionaires like to know who they are helping.'
  if (!form.title.trim()) errors.title = 'What is the bill for?'
  if (!form.payee.trim()) errors.payee = 'Who sent the bill?'
  const cents = parseDollars(form.amount)
  if (cents === null) errors.amount = 'Enter an amount like 142.17.'
  else if (cents < LIMITS.minAmountCents || cents > LIMITS.maxAmountCents) {
    errors.amount = `Bills must be between ${formatCents(LIMITS.minAmountCents)} and ${formatCents(LIMITS.maxAmountCents)}.`
  }
  if (!form.dueDate) errors.dueDate = 'When is it due?'
  if (!form.plea.trim()) errors.plea = 'Give them a reason. They are very bored.'
  return errors
}

function fileProblem(file: File): string | null {
  if (file.type === 'application/pdf') {
    return file.size > LIMITS.uploadMaxBytes ? 'PDFs must be 5 MB or smaller.' : null
  }
  if (!file.type.startsWith('image/')) return 'Upload a photo or a PDF of the bill.'
  return file.size > MAX_PHOTO_BYTES ? 'That photo is enormous. Try one under 25 MB.' : null
}

export function SubmitBill() {
  const [form, setForm] = useState<FormState>(() => ({
    submitterName: rememberedName(),
    title: '',
    payee: '',
    amount: '',
    dueDate: isoDateFromToday(7),
    category: 'utilities',
    plea: '',
  }))
  const [file, setFile] = useState<File | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'saving'>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const example = useMemo(() => PITCH_EXAMPLES[Math.floor(Math.random() * PITCH_EXAMPLES.length)], [])

  const [preview, setPreview] = useState<string | null>(null)
  const isPhoto = file !== null && file.type.startsWith('image/')
  useEffect(() => {
    if (!file || !isPhoto) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isPhoto])

  const update =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
    }

  function choose(next: File | undefined) {
    if (!next) return
    const problem = fileProblem(next)
    setErrors((current) => ({ ...current, file: problem ?? undefined }))
    if (problem) return
    setFile(next)
    setBoxes([])
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files[0])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    setFailure(null)
    if (Object.values(found).some(Boolean)) return

    try {
      let attachmentId: string | null = null
      if (file) {
        setPhase('uploading')
        const body = isPhoto ? await prepareImage(file, boxes) : file
        attachmentId = (await api.upload(body)).id
      }
      setPhase('saving')
      const bill = await api.createBill(submitterToken(), {
        submitterName: form.submitterName,
        title: form.title,
        payee: form.payee,
        amountCents: parseDollars(form.amount) ?? 0,
        dueDate: form.dueDate,
        category: form.category,
        plea: form.plea,
        attachmentId,
      })
      rememberName(form.submitterName.trim())
      navigate(`/bills?new=${bill.id}`)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'That did not go through. Try again.')
      setPhase('idle')
    }
  }

  const busy = phase !== 'idle'
  const fieldError = (field: keyof Errors) =>
    errors[field] && (
      <span className="field__error" id={`${field}-error`}>
        {errors[field]}
      </span>
    )
  const describedBy = (field: keyof Errors) => (errors[field] ? `${field}-error` : undefined)

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <a className="back-link" href={href('/bills')}>
          ← My bills
        </a>
        <h1 className="page__title">Upload a bill</h1>
        <p className="page__lede">
          It goes straight into the deck. A bored billionaire swipes right, and it is paid.
        </p>
      </header>

      <form className="bill-form" onSubmit={submit} noValidate>
        <section className="form-section">
          <h2 className="form-section__title">
            <span className="step">1</span> The evidence
          </h2>
          {preview ? (
            <Redactor src={preview} boxes={boxes} onChange={setBoxes} />
          ) : (
            <label
              className={dragging ? 'dropzone dropzone--active' : 'dropzone'}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                type="file"
                className="visually-hidden"
                accept="image/*,application/pdf"
                onChange={(event) => choose(event.target.files?.[0])}
              />
              <span className="dropzone__icon" aria-hidden="true">
                {file ? '📎' : '📸'}
              </span>
              <span className="dropzone__title">
                {file ? file.name : 'Snap a photo or drop in your bill'}
              </span>
              <span className="dropzone__hint">
                {file
                  ? 'PDFs cannot be redacted here, so hide account numbers before you upload.'
                  : 'Photo or PDF. Optional, but billionaires love proof.'}
              </span>
            </label>
          )}
          {file && (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setFile(null)
                setBoxes([])
              }}
            >
              Remove {isPhoto ? 'photo' : 'file'}
            </button>
          )}
          {fieldError('file')}
        </section>

        <section className="form-section">
          <h2 className="form-section__title">
            <span className="step">2</span> The bill
          </h2>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="bill-title">What is it for?</label>
              <input
                id="bill-title"
                className="input"
                value={form.title}
                maxLength={LIMITS.titleMax}
                placeholder="October electricity"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={describedBy('title')}
                onChange={update('title')}
              />
              {fieldError('title')}
            </div>
            <div className="field">
              <label htmlFor="bill-payee">Who is it from?</label>
              <input
                id="bill-payee"
                className="input"
                value={form.payee}
                maxLength={LIMITS.payeeMax}
                placeholder="Metro Power & Light"
                aria-invalid={Boolean(errors.payee)}
                aria-describedby={describedBy('payee')}
                onChange={update('payee')}
              />
              {fieldError('payee')}
            </div>
            <div className="field">
              <label htmlFor="bill-amount">Amount due</label>
              <div className="input-prefix">
                <span aria-hidden="true">$</span>
                <input
                  id="bill-amount"
                  className="input"
                  inputMode="decimal"
                  value={form.amount}
                  placeholder="142.17"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={describedBy('amount')}
                  onChange={update('amount')}
                />
              </div>
              {fieldError('amount')}
            </div>
            <div className="field">
              <label htmlFor="bill-due">Due date</label>
              <input
                id="bill-due"
                type="date"
                className="input"
                value={form.dueDate}
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={describedBy('dueDate')}
                onChange={update('dueDate')}
              />
              {fieldError('dueDate')}
            </div>
          </div>
          <fieldset className="field">
            <legend>Category</legend>
            <div className="category-picker">
              {CATEGORIES.map((category) => (
                <label key={category.id} className="category-option">
                  <input
                    type="radio"
                    name="category"
                    value={category.id}
                    checked={form.category === category.id}
                    onChange={update('category')}
                  />
                  <span>
                    {category.emoji} {category.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="form-section">
          <h2 className="form-section__title">
            <span className="step">3</span> The pitch
          </h2>
          <div className="field">
            <label htmlFor="bill-name">Your first name</label>
            <input
              id="bill-name"
              className="input"
              value={form.submitterName}
              maxLength={LIMITS.nameMax}
              autoComplete="given-name"
              placeholder="Dana"
              aria-invalid={Boolean(errors.submitterName)}
              aria-describedby={describedBy('submitterName')}
              onChange={update('submitterName')}
            />
            {fieldError('submitterName')}
          </div>
          <div className="field">
            <div className="field__row">
              <label htmlFor="bill-plea">Why should a billionaire care?</label>
              <span className="counter">
                {form.plea.length}/{LIMITS.pleaMax}
              </span>
            </div>
            <textarea
              id="bill-plea"
              className="input textarea"
              rows={3}
              value={form.plea}
              maxLength={LIMITS.pleaMax}
              placeholder={example}
              aria-invalid={Boolean(errors.plea)}
              aria-describedby={describedBy('plea') ?? 'plea-tip'}
              onChange={update('plea')}
            />
            {fieldError('plea') || (
              <span className="field__hint" id="plea-tip">
                Billionaires are easily bored. Be specific, be funny, be brief.
              </span>
            )}
          </div>
        </section>

        {failure && (
          <p className="form-error" role="alert">
            {failure}
          </p>
        )}
        <button type="submit" className="button button--money button--wide" disabled={busy}>
          {phase === 'uploading'
            ? 'Uploading the evidence…'
            : phase === 'saving'
              ? 'Sliding it into the deck…'
              : 'Send to the billionaires 💸'}
        </button>
        <p className="fineprint">
          Only your first name, the bill details and the (redacted) image are shown to billionaires.
        </p>
      </form>
    </div>
  )
}
