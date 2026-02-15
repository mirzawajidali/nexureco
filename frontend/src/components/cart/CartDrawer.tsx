import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ShoppingBagIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/utils/formatters';
import Button from '@/components/ui/Button';

export default function CartDrawer() {
  const { items, isCartOpen, setCartOpen, removeItem, updateQuantity, subtotal } = useCartStore();
  const total = subtotal();

  return (
    <Transition show={isCartOpen} as={Fragment}>
      <Dialog onClose={() => setCartOpen(false)} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel className="fixed inset-y-0 right-0 w-full max-w-md bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b">
              <DialogTitle className="font-heading font-bold text-lg uppercase tracking-wider">
                Your Bag ({items.length})
              </DialogTitle>
              <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-gray-100">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <ShoppingBagIcon className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-heading-sm font-heading uppercase mb-2">Your bag is empty</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Looks like you haven't added any items yet.
                  </p>
                  <Button onClick={() => setCartOpen(false)} variant="secondary">
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex gap-4 p-4">
                      {/* Image */}
                      <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-sm uppercase truncate">
                          {item.name}
                        </p>
                        {item.variantInfo && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.variantInfo}</p>
                        )}
                        <p className="text-sm font-bold mt-1">{formatPrice(item.price)}</p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-gray-300">
                            <button
                              onClick={() =>
                                updateQuantity(item.productId, item.variantId, item.quantity - 1)
                              }
                              className="p-1.5 hover:bg-gray-100"
                            >
                              <MinusIcon className="h-3 w-3" />
                            </button>
                            <span className="px-3 text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() =>
                                updateQuantity(item.productId, item.variantId, item.quantity + 1)
                              }
                              className="p-1.5 hover:bg-gray-100"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="p-1.5 text-gray-400 hover:text-brand-accent"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Line Total */}
                      <p className="text-sm font-bold flex-shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-heading font-bold uppercase">Subtotal</span>
                  <span className="text-lg font-bold">{formatPrice(total)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Shipping & taxes calculated at checkout.
                </p>
                <Link
                  to="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="btn-primary block text-center"
                >
                  Checkout
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setCartOpen(false)}
                  className="block text-center text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black"
                >
                  View Cart
                </Link>
              </div>
            )}
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
