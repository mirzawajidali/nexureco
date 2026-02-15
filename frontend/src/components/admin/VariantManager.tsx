import { useEffect, useState, useCallback } from 'react';
import { PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { ProductOption, ProductVariant } from '@/types/product';

// --- Types ---

export interface OptionFormRow {
  id: string;
  name: string;
  values: string[];
}

export interface VariantFormRow {
  id: string;
  optionValueCombo: string[];
  price: number | null;
  sku: string;
  stockQuantity: number;
  isActive: boolean;
  imageUrl: string;
}

export interface VariantFormData {
  hasVariants: boolean;
  options: OptionFormRow[];
  variants: VariantFormRow[];
}

export interface VariantImageOption {
  url: string;
  alt: string;
}

interface VariantManagerProps {
  initialOptions: ProductOption[];
  initialVariants: ProductVariant[];
  basePrice: number;
  productImages: VariantImageOption[];
  onDataChange: (data: VariantFormData) => void;
}

// --- Helpers ---

function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );
}

function generateVariants(
  options: OptionFormRow[],
  existingVariants: VariantFormRow[],
  basePrice: number,
): VariantFormRow[] {
  const validOptions = options.filter(
    (o) => o.name.trim() && o.values.filter((v) => v.trim()).length > 0,
  );
  if (validOptions.length === 0) return [];

  const valueSets = validOptions.map((o) => o.values.filter((v) => v.trim()));
  const combos = cartesianProduct(valueSets);

  return combos.map((combo) => {
    const comboKey = combo.join(' / ');
    const existing = existingVariants.find(
      (v) => v.optionValueCombo.join(' / ') === comboKey,
    );
    if (existing) return existing;

    return {
      id: crypto.randomUUID(),
      optionValueCombo: combo,
      price: basePrice,
      sku: '',
      stockQuantity: 0,
      isActive: true,
      imageUrl: '',
    };
  });
}

// --- Component ---

export default function VariantManager({
  initialOptions,
  initialVariants,
  basePrice,
  productImages,
  onDataChange,
}: VariantManagerProps) {
  const [hasVariants, setHasVariants] = useState(false);
  const [options, setOptions] = useState<OptionFormRow[]>([]);
  const [variants, setVariants] = useState<VariantFormRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from product data
  useEffect(() => {
    if (initialized) return;

    if (initialOptions.length > 0) {
      const opts: OptionFormRow[] = initialOptions.map((opt) => ({
        id: crypto.randomUUID(),
        name: opt.name,
        values: opt.values.map((v) => v.value),
      }));

      const vars: VariantFormRow[] = initialVariants.map((v) => {
        const combo = initialOptions.map((opt) => {
          const matchingOV = v.option_values.find((ov) =>
            opt.values.some((val) => val.id === ov.option_value_id),
          );
          const matchedValue = matchingOV
            ? opt.values.find((val) => val.id === matchingOV.option_value_id)
            : null;
          return matchedValue?.value ?? '';
        });

        return {
          id: crypto.randomUUID(),
          optionValueCombo: combo,
          price: v.price,
          sku: v.sku ?? '',
          stockQuantity: v.stock_quantity,
          isActive: v.is_active,
          imageUrl: v.image_url ?? '',
        };
      });

      setHasVariants(true);
      setOptions(opts);
      setVariants(vars);
    }
    setInitialized(true);
  }, [initialOptions, initialVariants, initialized]);

  // Notify parent on data changes
  const notifyParent = useCallback(
    (h: boolean, o: OptionFormRow[], v: VariantFormRow[]) => {
      onDataChange({ hasVariants: h, options: o, variants: v });
    },
    [onDataChange],
  );

  useEffect(() => {
    if (initialized) {
      notifyParent(hasVariants, options, variants);
    }
  }, [hasVariants, options, variants, initialized, notifyParent]);

  // Regenerate variants when options change
  function regenerateVariants(newOptions: OptionFormRow[]) {
    const newVariants = generateVariants(newOptions, variants, basePrice);
    setVariants(newVariants);
  }

  // --- Option handlers ---

  function addOption() {
    if (options.length >= 3) return;
    const newOpts = [
      ...options,
      { id: crypto.randomUUID(), name: '', values: [] },
    ];
    setOptions(newOpts);
  }

  function removeOption(optionId: string) {
    const newOpts = options.filter((o) => o.id !== optionId);
    setOptions(newOpts);
    regenerateVariants(newOpts);
  }

  function updateOptionName(optionId: string, name: string) {
    const newOpts = options.map((o) =>
      o.id === optionId ? { ...o, name } : o,
    );
    setOptions(newOpts);
  }

  function updateOptionValues(optionId: string, rawValues: string) {
    const values = rawValues.split(',').map((v) => v.trim()).filter(Boolean);
    const newOpts = options.map((o) =>
      o.id === optionId ? { ...o, values } : o,
    );
    setOptions(newOpts);
    regenerateVariants(newOpts);
  }

  // --- Variant handlers ---

  function updateVariantField(
    variantId: string,
    field: keyof VariantFormRow,
    value: unknown,
  ) {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
    );
  }

  // --- Toggle ---

  function toggleHasVariants(checked: boolean) {
    setHasVariants(checked);
    if (checked && options.length === 0) {
      addOption();
    }
    if (!checked) {
      setOptions([]);
      setVariants([]);
    }
  }

  const totalVariants = variants.length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">
        Variants
      </h2>

      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hasVariants}
          onChange={(e) => toggleHasVariants(e.target.checked)}
          className="h-4 w-4 border-gray-300 rounded text-gray-900 focus:ring-gray-500"
        />
        <span className="text-sm">
          This product has options, like size or color
        </span>
      </label>

      {hasVariants && (
        <>
          {/* Options editor */}
          <div className="space-y-4 pt-2">
            {options.map((option, idx) => (
              <div
                key={option.id}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Option {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove option"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Option name</label>
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) =>
                        updateOptionName(option.id, e.target.value)
                      }
                      placeholder="e.g. Size, Color, Material"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Option values</label>
                    <input
                      type="text"
                      defaultValue={option.values.join(', ')}
                      onBlur={(e) =>
                        updateOptionValues(option.id, e.target.value)
                      }
                      placeholder="e.g. Small, Medium, Large"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Separate values with commas
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {options.length < 3 && (
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:underline"
              >
                <PlusIcon className="h-4 w-4" />
                Add another option
              </button>
            )}
          </div>

          {/* Variants table */}
          {totalVariants > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-500">
                  Variants ({totalVariants})
                </h3>
                {totalVariants > 100 && (
                  <span className="text-xs text-amber-600 font-medium">
                    Too many variants. Consider reducing option values.
                  </span>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">
                          Variant
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-28">
                          Price
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-32">
                          SKU
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-20">
                          Stock
                        </th>
                        <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-16">
                          Active
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => (
                        <tr
                          key={variant.id}
                          className={clsx(
                            'border-b border-gray-100 last:border-0',
                            !variant.isActive && 'opacity-50',
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {variant.imageUrl && (
                                <img
                                  src={variant.imageUrl}
                                  alt=""
                                  className="w-8 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
                                />
                              )}
                              <span className="font-medium text-gray-900">
                                {variant.optionValueCombo.join(' / ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              value={variant.price ?? ''}
                              onChange={(e) =>
                                updateVariantField(
                                  variant.id,
                                  'price',
                                  e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                                )
                              }
                              placeholder={String(basePrice)}
                              min="0"
                              step="1"
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={variant.sku}
                              onChange={(e) =>
                                updateVariantField(
                                  variant.id,
                                  'sku',
                                  e.target.value,
                                )
                              }
                              placeholder="SKU"
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              value={variant.stockQuantity}
                              onChange={(e) =>
                                updateVariantField(
                                  variant.id,
                                  'stockQuantity',
                                  Number(e.target.value) || 0,
                                )
                              }
                              min="0"
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(e) =>
                                updateVariantField(
                                  variant.id,
                                  'isActive',
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 border-gray-300 rounded text-gray-900 focus:ring-gray-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Variant image assignment — separate section below the table */}
              {productImages.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-xs font-medium text-gray-500">
                    Assign images to variants
                  </h3>
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {variant.optionValueCombo.join(' / ')}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {/* None option */}
                        <button
                          type="button"
                          onClick={() =>
                            updateVariantField(variant.id, 'imageUrl', '')
                          }
                          className={clsx(
                            'w-14 h-[70px] rounded-md border-2 flex items-center justify-center text-[10px] text-gray-400 transition-colors',
                            !variant.imageUrl
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400',
                          )}
                        >
                          None
                        </button>
                        {productImages.map((img) => (
                          <button
                            key={img.url}
                            type="button"
                            onClick={() =>
                              updateVariantField(variant.id, 'imageUrl', img.url)
                            }
                            className={clsx(
                              'w-14 h-[70px] rounded-md border-2 overflow-hidden flex-shrink-0 transition-colors',
                              variant.imageUrl === img.url
                                ? 'border-gray-900'
                                : 'border-gray-200 hover:border-gray-400',
                            )}
                          >
                            <img
                              src={img.url}
                              alt={img.alt}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state: options defined but no valid values yet */}
          {totalVariants === 0 && options.some((o) => o.name.trim()) && (
            <p className="text-sm text-gray-500 pt-2">
              Add option values to generate variants.
            </p>
          )}
        </>
      )}
    </div>
  );
}
