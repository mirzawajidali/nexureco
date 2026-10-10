import client from './client';

export const pagesApi = {
  list: () => client.get('/pages/'),
  getBySlug: (slug: string) => client.get(`/pages/${slug}`),
};

export interface BannerData {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  /** Alt text for the slide image; null/empty means decorative */
  image_alt?: string | null;
  link_url: string | null;
  button_text: string | null;
  position: string;
  display_order: number;
}

export interface MenuItemData {
  id: number;
  menu_id: number;
  parent_id: number | null;
  title: string;
  url: string;
  link_type: string;
  open_in_new_tab: boolean;
  display_order: number;
  is_active: boolean;
  children: MenuItemData[];
}

export interface MenuData {
  id: number;
  name: string;
  handle: string;
  items: MenuItemData[];
}

export const menusApi = {
  getByHandle: (handle: string) => client.get<MenuData>(`/menus/${handle}`),
};

export const bannersApi = {
  getActive: (position?: string) =>
    client.get<BannerData[]>('/banners/active', { params: position ? { position } : undefined }),
};

declare global {
  interface Window {
    /** Hero banners request started by an inline script in index.html on the homepage */
    __heroBanners?: Promise<BannerData[]>;
  }
}

/** Hero banners, reusing the request index.html started early (once), otherwise fetching normally. */
export function getHeroBanners(): Promise<BannerData[]> {
  const fetchBanners = () => bannersApi.getActive('hero').then((res) => res.data);
  const early = window.__heroBanners;
  window.__heroBanners = undefined;
  return early ? early.catch(fetchBanners) : fetchBanners();
}
