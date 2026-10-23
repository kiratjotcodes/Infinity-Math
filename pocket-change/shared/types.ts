// Types and limits shared by the browser client and the API server.

export const CATEGORIES = [
  { id: 'rent', label: 'Rent', emoji: '🏠' },
  { id: 'utilities', label: 'Utilities', emoji: '💡' },
  { id: 'medical', label: 'Medical', emoji: '🩺' },
  { id: 'student-loans', label: 'Student loans', emoji: '🎓' },
  { id: 'car', label: 'Car', emoji: '🚗' },
  { id: 'phone', label: 'Phone & internet', emoji: '📱' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'pet', label: 'Pet', emoji: '🐕' },
  { id: 'other', label: 'Other', emoji: '🧾' },
] as const

export type BillCategory = (typeof CATEGORIES)[number]['id']

export const CATEGORY_IDS: readonly BillCategory[] = CATEGORIES.map((category) => category.id)

export function categoryInfo(id: BillCategory) {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}

export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type UploadType = (typeof UPLOAD_TYPES)[number]

export const LIMITS = {
  nameMax: 40,
  titleMax: 60,
  payeeMax: 60,
  pleaMax: 280,
  wealthSourceMax: 60,
  minAmountCents: 100,
  maxAmountCents: 10_000_000,
  minNetWorthCents: 100_000_000_000,
  maxNetWorthCents: 1_000_000_000_000_000,
  uploadMaxBytes: 5 * 1024 * 1024,
} as const

export const AVATARS = ['🎩', '🛥️', '🦄', '🐉', '💎', '🦈', '🚀', '👑', '🦚', '🧐'] as const

export const WEALTH_SOURCES = [
  'Inherited it from a guy who inherited it',
  'An app that does what another app does',
  'Crypto (please do not ask)',
  'Bought low, sold high, repeated forever',
  'Yachts, mostly',
  'Rocket-adjacent ventures',
  'Sells water back to you',
  'Married extraordinarily well',
] as const

export interface Attachment {
  id: string
  mime: UploadType
  size: number
}

export interface Payment {
  billionaireId: string
  name: string
  avatar: string
  house: boolean
  at: string
}

export interface PublicBill {
  id: string
  title: string
  payee: string
  amountCents: number
  dueDate: string
  category: BillCategory
  plea: string
  submitterName: string
  attachment: Attachment | null
  createdAt: string
  status: 'open' | 'paid'
  paidBy: Payment | null
  passCount: number
  sample: boolean
}

export interface PublicBillionaire {
  id: string
  name: string
  avatar: string
  wealthSource: string
  netWorthCents: number
  createdAt: string
  house: boolean
  billsPaid: number
  totalPaidCents: number
}

export interface RecentPayment {
  billId: string
  title: string
  category: BillCategory
  amountCents: number
  submitterName: string
  billionaire: Payment
}

export interface Stats {
  totalPaidCents: number
  billsPaid: number
  openBills: number
  billionaires: number
  leaderboard: PublicBillionaire[]
  recent: RecentPayment[]
}

export type SwipeDirection = 'left' | 'right'

export type SwipeOutcome = 'paid' | 'passed' | 'already-paid'

export interface SwipeResult {
  outcome: SwipeOutcome
  bill: PublicBill
  billionaire: PublicBillionaire
}

export interface NewBillInput {
  title: string
  payee: string
  amountCents: number
  dueDate: string
  category: BillCategory
  plea: string
  submitterName: string
  attachmentId: string | null
}

export interface NewBillionaireInput {
  name: string
  avatar: string
  wealthSource: string
  netWorthCents: number
}

export interface BillionaireSession {
  billionaire: PublicBillionaire
  token: string
}

export interface Portfolio {
  billionaire: PublicBillionaire
  bills: PublicBill[]
}

/** Header carrying the caller's secret token (submitter or billionaire, depending on the route). */
export const TOKEN_HEADER = 'x-pocket-token'
