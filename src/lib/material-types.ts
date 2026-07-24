export const MATERIAL_TYPES = ['program', 'service', 'appendix', 'other'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  program: 'Программа обучения',
  service: 'Описание услуги',
  appendix: 'Приложение к договору',
  other: 'Прочее',
};
