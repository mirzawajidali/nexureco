import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { useCartStore } from '@/store/cartStore';
import { restoreCheckoutDraft } from '@/utils/checkoutDraft';
import { trackEvent } from '@/utils/analytics';

/** /bag/:token — the link in a WhatsApp reminder: puts the saved items back in the bag, then shows it. */
export default function RestoreBagPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in development
    started.current = true;
    restoreCheckoutDraft(token)
      .then((lines) => {
        const inBag = useCartStore.getState().items;
        for (const line of lines) {
          // Only add what isn't already there, so opening the link twice doesn't double the bag
          if (inBag.some((i) => i.productId === line.product_id && i.variantId === line.variant_id)) continue;
          addItem({
            productId: line.product_id,
            variantId: line.variant_id,
            quantity: line.quantity,
            name: line.name,
            slug: line.slug,
            price: line.price,
            image: line.image ?? '',
            variantInfo: line.variant_info ?? undefined,
          });
        }
        trackEvent('restore_bag', { items: lines.length });
        toast.success(lines.length ? 'Your bag is back' : 'Those items are no longer available');
        navigate('/cart', { replace: true });
      })
      .catch(() => setFailed(true));
  }, [token, addItem, navigate]);

  return (
    <>
      <Helmet>
        <title>Your Bag</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="container-custom py-16 text-center">
        {failed ? (
          <>
            <h1 className="type-section mb-4">This bag link has expired</h1>
            <Link to="/" className="btn-primary inline-block">Continue shopping</Link>
          </>
        ) : (
          <Spinner size="lg" />
        )}
      </div>
    </>
  );
}
