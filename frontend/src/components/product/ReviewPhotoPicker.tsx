import { useEffect, useMemo, useRef } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Same limits as the backend (review_service.MAX_REVIEW_PHOTOS, settings.MAX_FILE_SIZE, file_upload.ALLOWED_EXTENSIONS)
export const MAX_REVIEW_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

interface ReviewPhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
}

/** Choose up to 3 photos for a review, with previews and a remove button on each. */
export default function ReviewPhotoPicker({ files, onChange }: ReviewPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFiles = (picked: FileList | null) => {
    if (!picked) return;
    const accepted: File[] = [];
    for (const file of Array.from(picked)) {
      if (!ACCEPT.split(',').includes(file.type)) {
        toast.error(`${file.name}: please choose a JPEG, PNG or WebP photo`);
      } else if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5 MB`);
      } else {
        accepted.push(file);
      }
    }
    const next = [...files, ...accepted];
    if (next.length > MAX_REVIEW_PHOTOS) toast.error(`You can add up to ${MAX_REVIEW_PHOTOS} photos`);
    onChange(next.slice(0, MAX_REVIEW_PHOTOS));
  };

  return (
    <div>
      <p className="text-xs font-bold text-brand-black mb-1">Photos (optional)</p>
      <p className="text-xs text-gray-600 mb-2">Show how it fits: up to {MAX_REVIEW_PHOTOS} photos, 5 MB each.</p>
      <div className="flex flex-wrap gap-2">
        {previews.map((url, idx) => (
          <div key={url} className="relative w-20 h-20">
            <img src={url} alt={`Photo ${idx + 1} to upload`} className="w-full h-full object-cover bg-gray-100" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, i) => i !== idx))}
              aria-label={`Remove photo ${idx + 1}`}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-brand-black text-white flex items-center justify-center"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        {files.length < MAX_REVIEW_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 border border-dashed border-gray-400 flex flex-col items-center justify-center gap-1 text-xs text-gray-600 hover:border-brand-black hover:text-brand-black transition-colors"
          >
            <CameraIcon className="w-6 h-6" aria-hidden="true" />
            Add photo
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
