'use client';

import { useState } from 'react';
import { slugifyFieldKey } from '@/lib/slugify';
import type { TemplateField, TemplateFieldSource } from '@/lib/template-types';

type RequisiteOption = { field_key: string; field_label: string };

const MANUAL_TYPE_LABELS: Record<'text' | 'number' | 'date' | 'amount', string> = {
  text: 'Текст',
  number: 'Число',
  date: 'Дата',
  amount: 'Сумма',
};

export function MarkFieldDialog({
  blockId,
  selectedText,
  orgRequisites,
  clientRequisites,
  existingPlaceholderKeys,
  onConfirm,
  onClose,
}: {
  blockId: string;
  selectedText: string;
  orgRequisites: RequisiteOption[];
  clientRequisites: RequisiteOption[];
  existingPlaceholderKeys: string[];
  onConfirm: (field: TemplateField) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<
    'org_requisite' | 'client_requisite' | 'manual' | 'material'
  >('org_requisite');
  const [orgKey, setOrgKey] = useState(orgRequisites[0]?.field_key ?? '');
  const [clientKey, setClientKey] = useState(clientRequisites[0]?.field_key ?? '');
  const [clientCustomLabel, setClientCustomLabel] = useState('');
  const [manualType, setManualType] = useState<'text' | 'number' | 'date' | 'amount'>('text');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim()) {
      setError('Укажите название поля');
      return;
    }

    let source: TemplateFieldSource;

    if (sourceType === 'org_requisite') {
      const option = orgRequisites.find((o) => o.field_key === orgKey);
      if (!option) {
        setError('Сначала заполните реквизиты организации в Настройках');
        return;
      }
      source = { type: 'org_requisite', field_key: option.field_key, field_label: option.field_label };
    } else if (sourceType === 'client_requisite') {
      if (clientRequisites.length > 0) {
        const option = clientRequisites.find((o) => o.field_key === clientKey);
        if (!option) {
          setError('Выберите поле клиента');
          return;
        }
        source = { type: 'client_requisite', field_key: option.field_key, field_label: option.field_label };
      } else {
        if (!clientCustomLabel.trim()) {
          setError('Укажите название поля клиента');
          return;
        }
        const key = slugifyFieldKey(clientCustomLabel, []);
        source = { type: 'client_requisite', field_key: key, field_label: clientCustomLabel.trim() };
      }
    } else if (sourceType === 'manual') {
      source = { type: 'manual', input_type: manualType };
    } else {
      setError('Материалы появятся на шаге 5');
      return;
    }

    const key = slugifyFieldKey(name, existingPlaceholderKeys);
    const field: TemplateField = {
      id: crypto.randomUUID(),
      name: name.trim(),
      placeholder: `{{${key}}}`,
      source,
      block_id: blockId,
      original_text: selectedText,
    };

    onConfirm(field);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Сделать полем</h2>
        <p className="mb-4 truncate text-sm text-gray-500">«{selectedText}»</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Название поля</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, «УНП клиента»"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Источник значения</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={sourceType === 'org_requisite'}
                  onChange={() => setSourceType('org_requisite')}
                />
                Реквизит моей организации
              </label>
              {sourceType === 'org_requisite' && (
                <select
                  value={orgKey}
                  onChange={(e) => setOrgKey(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                >
                  {orgRequisites.length === 0 && <option value="">Нет реквизитов — заполните в Настройках</option>}
                  {orgRequisites.map((o) => (
                    <option key={o.field_key} value={o.field_key}>
                      {o.field_label}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={sourceType === 'client_requisite'}
                  onChange={() => setSourceType('client_requisite')}
                />
                Реквизит клиента
              </label>
              {sourceType === 'client_requisite' &&
                (clientRequisites.length > 0 ? (
                  <select
                    value={clientKey}
                    onChange={(e) => setClientKey(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  >
                    {clientRequisites.map((o) => (
                      <option key={o.field_key} value={o.field_key}>
                        {o.field_label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={clientCustomLabel}
                    onChange={(e) => setClientCustomLabel(e.target.value)}
                    placeholder="Название поля, которое будет у клиента"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                ))}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={sourceType === 'manual'}
                  onChange={() => setSourceType('manual')}
                />
                Ручной ввод при создании договора
              </label>
              {sourceType === 'manual' && (
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as typeof manualType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                >
                  {Object.entries(MANUAL_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="radio"
                  checked={sourceType === 'material'}
                  onChange={() => setSourceType('material')}
                  disabled
                />
                Материал из библиотеки (появится на шаге 5)
              </label>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Готово
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
