// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicBill, SwipeResult } from '../../shared/types'
import { api } from '../api'
import { FeedbackProvider } from './Feedback'
import { SwipeDeck } from './SwipeDeck'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>()
  return { ...actual, api: { deck: vi.fn(), swipe: vi.fn() } }
})

const bill = (id: string, submitterName: string): PublicBill => ({
  id,
  title: `${submitterName}'s bill`,
  payee: 'Metro Power & Light',
  amountCents: 14_217,
  dueDate: '2026-10-30',
  category: 'utilities',
  plea: 'My cat discovered the space heater.',
  submitterName,
  attachment: null,
  createdAt: '2026-10-23T12:00:00Z',
  status: 'open',
  paidBy: null,
  passCount: 0,
  sample: false,
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SwipeDeck', () => {
  it('pays with the button, passes with the arrow key, then runs dry', async () => {
    const bills = [bill('a', 'Dana'), bill('b', 'Marcus')]
    vi.mocked(api.deck).mockResolvedValue(bills)
    vi.mocked(api.swipe).mockImplementation(async (_token, billId, direction) => ({
      outcome: direction === 'right' ? 'paid' : 'passed',
      bill: bills.find((item) => item.id === billId)!,
      billionaire: {} as SwipeResult['billionaire'],
    }))
    const onResult = vi.fn()

    render(
      <FeedbackProvider>
        <SwipeDeck token="secret" onResult={onResult} />
      </FeedbackProvider>,
    )

    expect(await screen.findByText('Dana needs this paid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /pay it/i }))
    await waitFor(() => expect(api.swipe).toHaveBeenCalledWith('secret', 'a', 'right'))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'paid' })))

    await waitFor(() => expect(screen.queryByText('Dana needs this paid')).toBeNull())
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    await waitFor(() => expect(api.swipe).toHaveBeenCalledWith('secret', 'b', 'left'))

    // The deck asks for more, but never deals a bill it has already shown.
    expect(await screen.findByText('You have seen every bill.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /pay it/i })).toHaveProperty('disabled', true)
  })

  it('puts a card back on top when the swipe fails', async () => {
    vi.mocked(api.deck).mockResolvedValue([bill('a', 'Dana')])
    vi.mocked(api.swipe).mockRejectedValue(new Error('Could not reach the bank.'))

    render(
      <FeedbackProvider>
        <SwipeDeck token="secret" onResult={vi.fn()} />
      </FeedbackProvider>,
    )

    await screen.findByText('Dana needs this paid')
    fireEvent.click(screen.getByRole('button', { name: /pay it/i }))
    expect(await screen.findByText(/The bill is back on top/)).toBeTruthy()
    expect(screen.getByText('Dana needs this paid')).toBeTruthy()
  })
})
