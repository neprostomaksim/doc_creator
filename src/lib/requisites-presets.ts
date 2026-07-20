export type RequisitesPresetField = { key: string; label: string };

export type RequisitesPreset = {
  id: 'belarus' | 'russia' | 'poland';
  countryLabel: string;
  buttonLabel: string;
  fields: RequisitesPresetField[];
};

export const REQUISITES_PRESETS: RequisitesPreset[] = [
  {
    id: 'belarus',
    countryLabel: 'Беларусь',
    buttonLabel: '🇧🇾 Беларусь',
    fields: [
      { key: 'unp', label: 'УНП' },
      { key: 'legal_address', label: 'Юридический адрес' },
      { key: 'bank_account', label: 'Расчётный счёт' },
      { key: 'bank', label: 'Банк' },
      { key: 'bik', label: 'БИК' },
      { key: 'director', label: 'Директор' },
      { key: 'basis', label: 'Действует на основании' },
    ],
  },
  {
    id: 'russia',
    countryLabel: 'Россия',
    buttonLabel: '🇷🇺 Россия',
    fields: [
      { key: 'inn', label: 'ИНН' },
      { key: 'kpp', label: 'КПП' },
      { key: 'ogrn', label: 'ОГРН' },
      { key: 'legal_address', label: 'Юридический адрес' },
      { key: 'bank_account', label: 'Расчётный счёт' },
      { key: 'bank', label: 'Банк' },
      { key: 'bik', label: 'БИК' },
      { key: 'corr_account', label: 'Корр. счёт' },
      { key: 'director', label: 'Директор' },
    ],
  },
  {
    id: 'poland',
    countryLabel: 'Польша',
    buttonLabel: '🇵🇱 Польша',
    fields: [
      { key: 'nip', label: 'NIP' },
      { key: 'regon', label: 'REGON' },
      { key: 'krs', label: 'KRS' },
      { key: 'adres', label: 'Adres' },
      { key: 'numer_konta', label: 'Numer konta' },
      { key: 'bank', label: 'Bank' },
      { key: 'reprezentant', label: 'Reprezentant' },
    ],
  },
];
