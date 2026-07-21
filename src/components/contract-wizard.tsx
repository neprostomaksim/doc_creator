'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { TemplateField } from '@/lib/template-types';

type Client = { id: string; name: string };
type Template = { id: string; name: string; category: string | null; fields: TemplateField[] };
type OrgRequisite = { field_key: string; field_label: string; field_value: string };
type Stamp = { id: string; name: string; type: 'signature' | 'stamp' };

const STEP_LABELS = ['Клиент', 'Режим', 'Шаблон', 'Поля'];

const MANUAL_INPUT_LABELS: Record<'text' | 'number' | 'date' | 'amount', string> = {
  text: 'Текст',
  number: 'Число',
  date: 'Дата',
  amount: 'Сумма',
};

/** Пресет для режима «Новая версия» — открывает мастер сразу на шаге полей. */
export type WizardPreset = {
  caseId: string;
  caseTitle: string;
  clientId: string;
  templateId: string;
  values: Record<string, string>;
};

export function ContractWizard({
  clients,
  templates,
  orgRequisites,
  stamps,
  preset,
  initialClientId,
}: {
  clients: Client[];
  templates: Template[];
  orgRequisites: OrgRequisite[];
  stamps: Stamp[];
  preset?: WizardPreset;
  initialClientId?: string;
}) {
  const supabase = createClient();
  const isNewVersion = !!preset;
  const [step, setStep] = useState(preset ? 4 : 1);

  const [clientList, setClientList] = useState(clients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    preset?.clientId ?? initialClientId ?? null,
  );
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    preset?.templateId ?? null,
  );
  const [caseTitle, setCaseTitle] = useState(preset?.caseTitle ?? '');

  const [clientValues, setClientValues] = useState<Record<string, string>>({});
  const [manualValues, setManualValues] = useState<Record<string, string>>(preset?.values ?? {});

  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | ''>('');
  const [selectedStampId, setSelectedStampId] = useState<string | ''>('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    filename: string;
    warnings: string[];
    caseId: string;
  } | null>(null);

  const orgValueByKey = useMemo(
    () => new Map(orgRequisites.map((r) => [r.field_key, r])),
    [orgRequisites],
  );

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const signatures = stamps.filter((s) => s.type === 'signature');
  const stampImages = stamps.filter((s) => s.type === 'stamp');

  useEffect(() => {
    if (!selectedClientId) return;
    supabase
      .from('requisites')
      .select('field_key, field_value')
      .eq('owner_type', 'client')
      .eq('owner_id', selectedClientId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data ?? []) map[row.field_key] = row.field_value;
        setClientValues(map);
      });
  }, [selectedClientId, supabase]);

  async function handleCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: insertError } = await supabase
      .from('clients')
      .insert({ user_id: user.id, name: newClientName.trim() })
      .select('id, name')
      .single();

    setCreatingClient(false);
    if (insertError || !data) {
      setError('Не удалось создать клиента');
      return;
    }
    setClientList((prev) => [...prev, data]);
    setSelectedClientId(data.id);
    setNewClientMode(false);
    setNewClientName('');
  }

  async function handleDownload(url: string, filename: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function goNext() {
    setError(null);
    setStep((s) => Math.min(s + 1, 4));
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleGenerate() {
    if (!selectedClientId || !selectedTemplateId) return;
    setGenerating(true);
    setError(null);

    const response = await fetch('/api/contracts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: selectedTemplateId,
        clientId: selectedClientId,
        values: manualValues,
        signatureId: selectedSignatureId || null,
        stampId: selectedStampId || null,
        caseTitle: caseTitle || null,
        caseId: preset?.caseId ?? null,
      }),
    });

    setGenerating(false);
    setShowSignatureDialog(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Не удалось сгенерировать договор');
      return;
    }

    setResult(await response.json());
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                step === i + 1
                  ? 'bg-gray-900 text-white'
                  : step > i + 1
                    ? 'bg-gray-300 text-gray-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
            <span className="ml-2 hidden text-sm text-gray-600 sm:inline">{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="mx-2 h-px flex-1 bg-gray-200" />}
          </div>
        ))}
      </div>

      {result ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Договор готов</h2>
          {result.warnings.length > 0 && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <p className="mb-1 font-medium">Проверьте перед отправкой:</p>
              <ul className="list-disc pl-5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDownload(result.url, result.filename)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Скачать {result.filename}
            </button>
            <Link
              href={`/dashboard/contracts/${result.caseId}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Открыть дело
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {step === 1 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Выберите клиента</h2>
              <div className="space-y-2">
                {clientList.map((client) => (
                  <label
                    key={client.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                      selectedClientId === client.id ? 'border-gray-900' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={selectedClientId === client.id}
                      onChange={() => setSelectedClientId(client.id)}
                    />
                    {client.name}
                  </label>
                ))}
              </div>

              {newClientMode ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Название клиента"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={creatingClient}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Создать
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNewClientMode(true)}
                  className="mt-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  + Новый клиент
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Выберите режим</h2>
              <div className="space-y-2">
                <div className="rounded-lg border border-gray-900 bg-gray-50 p-3 text-sm font-medium text-gray-900">
                  Строго по шаблону
                </div>
                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-400">
                  Шаблон + правки ИИ <span className="text-xs">— скоро</span>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-400">
                  С нуля по материалам <span className="text-xs">— скоро</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Выберите шаблон</h2>
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500">Сначала загрузите шаблон в разделе «Шаблоны».</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm ${
                        selectedTemplateId === template.id ? 'border-gray-900' : 'border-gray-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectedTemplateId === template.id}
                          onChange={() => setSelectedTemplateId(template.id)}
                        />
                        {template.name}
                      </span>
                      {template.category && (
                        <span className="text-xs text-gray-400">{template.category}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && selectedTemplate && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Заполните поля</h2>

              {!isNewVersion && (
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Название дела</label>
                  <input
                    value={caseTitle}
                    onChange={(e) => setCaseTitle(e.target.value)}
                    placeholder={`Договор с ${
                      clientList.find((c) => c.id === selectedClientId)?.name ?? 'клиентом'
                    }`}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Договор попадёт в дело клиента. Если оставить пустым — подставим название по
                    умолчанию.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {selectedTemplate.fields
                  .filter((f) => f.source.type !== 'signature' && f.source.type !== 'stamp')
                  .map((field) => {
                    if (field.source.type === 'org_requisite') {
                      const req = orgValueByKey.get(field.source.field_key);
                      return (
                        <div key={field.id}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {field.name}
                          </label>
                          <input
                            readOnly
                            value={req?.field_value ?? ''}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                          />
                          <p className="mt-1 text-xs text-gray-400">Из реквизитов организации</p>
                        </div>
                      );
                    }

                    if (field.source.type === 'client_requisite') {
                      const value = clientValues[field.source.field_key];
                      if (value !== undefined) {
                        return (
                          <div key={field.id}>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              {field.name}
                            </label>
                            <input
                              readOnly
                              value={value}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                            />
                            <p className="mt-1 text-xs text-gray-400">Из реквизитов клиента</p>
                          </div>
                        );
                      }
                      return (
                        <div key={field.id}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {field.name}
                          </label>
                          <input
                            value={manualValues[field.id] ?? ''}
                            onChange={(e) =>
                              setManualValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                          />
                          <p className="mt-1 text-xs text-gray-400">
                            У клиента нет этого реквизита — впишите вручную
                          </p>
                        </div>
                      );
                    }

                    if (field.source.type === 'manual') {
                      const inputType =
                        field.source.input_type === 'date'
                          ? 'date'
                          : field.source.input_type === 'amount' || field.source.input_type === 'number'
                            ? 'number'
                            : 'text';
                      return (
                        <div key={field.id}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {field.name}
                          </label>
                          <input
                            type={inputType}
                            step={field.source.input_type === 'amount' ? '0.01' : undefined}
                            value={manualValues[field.id] ?? ''}
                            onChange={(e) =>
                              setManualValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                          />
                          <p className="mt-1 text-xs text-gray-400">
                            Ручной ввод ({MANUAL_INPUT_LABELS[field.source.input_type]})
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })}
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-5 flex justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || isNewVersion}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-0"
            >
              Назад
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={
                  (step === 1 && !selectedClientId) || (step === 3 && !selectedTemplateId)
                }
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Далее
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSignatureDialog(true)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Сгенерировать договор
              </button>
            )}
          </div>
        </div>
      )}

      {showSignatureDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Подпись и печать</h2>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Подпись</label>
              <select
                value={selectedSignatureId}
                onChange={(e) => setSelectedSignatureId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              >
                <option value="">Без подписи</option>
                {signatures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Печать</label>
              <select
                value={selectedStampId}
                onChange={(e) => setSelectedStampId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              >
                <option value="">Без печати</option>
                {stampImages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSignatureDialog(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {generating ? 'Готовим…' : 'Готово'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
