import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { menusApi, type MenuItemData } from '@/api/pages.api';

/**
 * Header navigation, from the "header" menu in Admin → Menus:
 *   top-level item            → a nav link (MEN, SALE, ...)
 *   its children with links   → mega-menu columns (title = column heading, "#" = heading without a link)
 *   their children            → the links in that column
 * A top-level item's children without children of their own are shown as one column of links.
 */
export interface NavLink {
  label: string;
  /** null for a column heading that isn't a link (URL "#" or empty in the admin) */
  href: string | null;
  accent?: boolean;
  target?: '_blank';
  children?: NavLink[];
}

export interface MegaColumn {
  heading: NavLink | null;
  links: NavLink[];
}

// Only shown if the header menu can't be loaded; lists pages that have products
export const FALLBACK_NAV_LINKS: NavLink[] = [
  { label: 'New Arrivals', href: '/collections/new-arrivals' },
  { label: 'Men', href: '/category/men' },
  { label: 'Best Sellers', href: '/collections/best-sellers' },
  { label: 'Sale', href: '/collections/sale', accent: true },
];

function mapMenuItems(items: MenuItemData[]): NavLink[] {
  return items.map((item) => {
    const url = item.url?.trim();
    return {
      label: item.title,
      href: url && url !== '#' ? url : null,
      accent: !!url && url.includes('sale'),
      target: item.open_in_new_tab ? ('_blank' as const) : undefined,
      children: item.children?.length > 0 ? mapMenuItems(item.children) : undefined,
    };
  });
}

/** The header menu (shared by the desktop header and the mobile menu; one request, cached) */
export function useHeaderNav(): NavLink[] {
  const { data } = useQuery({
    queryKey: ['menu', 'header'],
    queryFn: () => menusApi.getByHandle('header'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return useMemo(() => {
    const items = data?.data?.items;
    return items && items.length > 0 ? mapMenuItems(items) : FALLBACK_NAV_LINKS;
  }, [data]);
}

/** Columns of a top-level item's mega menu: loose links first (one unheaded column), then headed columns */
export function megaColumns(link: NavLink): MegaColumn[] {
  const children = link.children ?? [];
  const loose = children.filter((c) => !c.children?.length && c.href);
  const headed = children
    .filter((c) => c.children?.length)
    .map((c) => ({ heading: c, links: c.children!.filter((l) => l.href) }));
  return [...(loose.length ? [{ heading: null, links: loose }] : []), ...headed];
}

/** Small links above the main navigation (desktop), like a store's utility bar */
export const UTILITY_LINKS = [
  { label: 'help', href: '/page/faq' },
  { label: 'track order', href: '/track-order' },
  { label: 'shipping & returns', href: '/page/shipping' },
  { label: 'contact us', href: '/contact' },
];
