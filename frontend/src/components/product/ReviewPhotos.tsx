import { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { resizedImage } from '@/utils/image';
import type { ReviewImage } from '@/types/review';

/** A review's customer photos as thumbnails; tapping one shows it full size. */
export default function ReviewPhotos({ images, reviewer }: { images: ReviewImage[]; reviewer: string }) {
  const [open, setOpen] = useState<ReviewImage | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 mt-3">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(img)}
            aria-label={`View photo ${idx + 1} from ${reviewer}`}
            className="w-20 h-20 bg-gray-100 overflow-hidden"
          >
            <img
              src={resizedImage(img.url, 160)}
              alt=""
              width={80}
              height={80}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onClose={() => setOpen(null)} className="relative z-[70]">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="relative max-w-3xl w-full">
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close photo"
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center text-white"
            >
              <XMarkIcon className="w-7 h-7" />
            </button>
            {open && (
              <img
                src={resizedImage(open.url, 1280)}
                alt={`Customer photo from ${reviewer}`}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
