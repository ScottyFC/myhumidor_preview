'use client';

import { Camera } from 'lucide-react';
import type { ProfileFields } from '@/lib/profile';

export function Avatar({
  profile,
  editable,
  onChange,
  size = 88,
}: {
  profile: ProfileFields;
  editable?: boolean;
  onChange?: (dataUrl: string) => void;
  size?: number;
}) {
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => onChange?.(reader.result as string);
    reader.readAsDataURL(file);
  }
  const initials = profile.displayName.charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center overflow-hidden rounded-full bg-ember-600/30 ring-1 ring-ember-400/30"
        style={{ width: size, height: size }}
      >
        {profile.avatarDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarDataUrl} alt={profile.displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-3xl text-ember-100">{initials}</span>
        )}
      </div>
      {editable && (
        <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ember-400 text-paper ring-2 ring-char transition hover:bg-ember-600">
          <Camera size={15} strokeWidth={1.5} />
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>
      )}
    </div>
  );
}
