export const CASE_STATUSES = ['draft', 'active', 'signed', 'archived'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Черновик',
  active: 'В работе',
  signed: 'Подписан',
  archived: 'Архив',
};

export const CASE_STATUS_BADGE: Record<CaseStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  signed: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-400',
};
