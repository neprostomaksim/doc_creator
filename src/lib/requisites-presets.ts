export type RequisitesPresetField = { key: string; label: string };

export type RequisitesPreset = {
  id: string;
  /** Значение, которым заполнится поле «Страна» владельца при применении пресета. */
  countryLabel: string;
  buttonLabel: string;
  fields: RequisitesPresetField[];
};

// Пресеты сгруппированы по стране, а внутри — по форме деятельности
// (юрлицо, ИП, самозанятый). Пресет только предзаполняет поля — дальше их
// можно свободно править, добавлять и удалять.
export const REQUISITES_PRESETS: RequisitesPreset[] = [
  // ── Беларусь ──
  {
    id: 'belarus_org',
    countryLabel: 'Беларусь',
    buttonLabel: '🇧🇾 Юрлицо',
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
    id: 'belarus_ip',
    countryLabel: 'Беларусь',
    buttonLabel: '🇧🇾 ИП',
    fields: [
      { key: 'full_name', label: 'ФИО' },
      { key: 'unp', label: 'УНП' },
      { key: 'address', label: 'Адрес' },
      { key: 'bank_account', label: 'Расчётный счёт' },
      { key: 'bank', label: 'Банк' },
      { key: 'bik', label: 'БИК' },
      { key: 'basis', label: 'Действует на основании' },
    ],
  },

  // ── Россия ──
  {
    id: 'russia_org',
    countryLabel: 'Россия',
    buttonLabel: '🇷🇺 Юрлицо',
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
    id: 'russia_ip',
    countryLabel: 'Россия',
    buttonLabel: '🇷🇺 ИП',
    fields: [
      { key: 'full_name', label: 'ФИО' },
      { key: 'inn', label: 'ИНН' },
      { key: 'ogrnip', label: 'ОГРНИП' },
      { key: 'address', label: 'Адрес регистрации' },
      { key: 'bank_account', label: 'Расчётный счёт' },
      { key: 'bank', label: 'Банк' },
      { key: 'bik', label: 'БИК' },
      { key: 'corr_account', label: 'Корр. счёт' },
      { key: 'basis', label: 'Действует на основании' },
    ],
  },
  {
    id: 'russia_self_employed',
    countryLabel: 'Россия',
    buttonLabel: '🇷🇺 Самозанятый',
    fields: [
      { key: 'full_name', label: 'ФИО' },
      { key: 'inn', label: 'ИНН' },
      { key: 'passport', label: 'Паспорт (серия, номер, кем выдан)' },
      { key: 'address', label: 'Адрес регистрации' },
      { key: 'phone', label: 'Телефон' },
      { key: 'bank_account', label: 'Расчётный счёт' },
      { key: 'bank', label: 'Банк' },
    ],
  },

  // ── Польша ──
  {
    id: 'poland_org',
    countryLabel: 'Польша',
    buttonLabel: '🇵🇱 Firma',
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
  {
    id: 'poland_jdg',
    countryLabel: 'Польша',
    buttonLabel: '🇵🇱 JDG (ИП)',
    fields: [
      { key: 'imie_nazwisko', label: 'Imię i nazwisko' },
      { key: 'nip', label: 'NIP' },
      { key: 'regon', label: 'REGON' },
      { key: 'adres', label: 'Adres' },
      { key: 'numer_konta', label: 'Numer konta' },
      { key: 'bank', label: 'Bank' },
    ],
  },
];
