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
