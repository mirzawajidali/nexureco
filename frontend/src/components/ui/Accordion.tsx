import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  titleRight?: React.ReactNode;
}

export default function Accordion({ title, children, defaultOpen = false, titleRight }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-brand-black">{title}</span>
          {titleRight}
        </div>
        <ChevronDownIcon
          className={clsx(
            'h-5 w-5 text-brand-black transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[2000px] opacity-100 pb-6' : 'max-h-0 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  );
}
