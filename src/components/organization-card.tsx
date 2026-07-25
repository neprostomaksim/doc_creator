'use client';

import { useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasTransparency } from '@/lib/check-transparency';
import { RequisitesEditor, type Requisite } from './requisites-editor';

type Organization = {
  id: string;
  owner_id: string;
  name: string;
  country: string | null;
  logo_path: string | null;
};

export function OrganizationCard({
  organization,
  requisites,
  initialLogoUrl,
}: {
  organization: Organization;
  requisites: Requisite[];
  initialLogoUrl: string | null;
}) {
  const [name, setName] = useState(organization.name);
  const [country, setCountry] = useState(organization.country ?? '');
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [transparencyWarning, setTransparencyWarning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  async function persistOrganization(patch: Partial<Pick<Organization, 'name' | 'country'>>) {
    await supabase.from('organizations').update(patch).eq('id', organization.id);
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setTransparencyWarning(!(await hasTransparency(file)));
    setUploading(true);

    const path = `${organization.owner_id}/logo.png`;
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: 'image/png' });

    if (!uploadError) {
      await supabase.from('organizations').update({ logo_path: path }).eq('id', organization.id);
      const { data } = await supabase.storage.from('logos').createSignedUrl(path, 3600);
      setLogoUrl(data?.signedUrl ?? null);
    }

    setUploading(false);
    event.target.value = '';
  }

  return (
    <div className="card p-4">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <div className="checkered-bg flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Логотип организации" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-muted">Нет лого</span>
            )}
          </div>
          <label className="mt-2 block cursor-pointer text-center text-xs font-medium text-muted hover:text-fg">
            {uploading ? 'Загрузка…' : 'Загрузить'}
            <input type="file" accept="image/png" className="hidden" onChange={handleLogoChange} />
          </label>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div>
            <label className="label">Название организации</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => persistOrganization({ name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Страна</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onBlur={(e) => persistOrganization({ country: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {transparencyWarning && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          У загруженного логотипа не найден прозрачный фон — при вставке в договор он может
          перекрыть текст.
        </p>
      )}

      <h2 className="mb-2 text-sm font-medium text-fg">Реквизиты</h2>
      <RequisitesEditor
        ownerType="organization"
        ownerId={organization.id}
        initialRequisites={requisites}
        onPresetApplied={(countryLabel) => {
          setCountry(countryLabel);
          persistOrganization({ country: countryLabel });
        }}
      />
    </div>
  );
}
