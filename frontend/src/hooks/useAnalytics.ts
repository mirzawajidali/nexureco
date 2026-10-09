import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { productToItem, trackPageView, trackViewItemList, type ItemList } from '@/utils/analytics';

/**
 * Sends a GA4 page_view on every route change. Waits for the new page to set its
 * <title> (Helmet updates it after render/data load), falling back after 1s.
 */
export function usePageViews() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const pageLocation = window.location.href;
    const previousTitle = document.title;

    const send = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      trackPageView(pageLocation, document.title);
    };
    const observer = new MutationObserver(() => {
      if (document.title !== previousTitle) send();
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    const timer = window.setTimeout(send, 1000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [pathname, search]);
}

/**
 * Runs `track` once per distinct non-empty `key` — survives re-renders, refetches
 * and StrictMode's double effect run. Pass '' while data isn't ready.
 */
export function useTrackOnce(key: string, track: () => void) {
  const lastKey = useRef('');

  useEffect(() => {
    if (!key || key === lastKey.current) return;
    lastKey.current = key;
    track();
  }, [key]);
}

interface ListProduct {
  id: number;
  name: string;
  base_price: number;
  category_name: string | null;
}

/** Fires view_item_list whenever a product list (or its page of results) is shown. */
export function useViewItemList(products: ListProduct[], list?: ItemList) {
  const key = list && products.length ? `${list.id}:${products.map((p) => p.id).join(',')}` : '';

  useTrackOnce(key, () => {
    trackViewItemList(products.map((p, index) => productToItem(p, { index })), list!);
  });
}
