import client from './client';

export interface StoreSettingsData {
  free_shipping_threshold: number;
  standard_shipping_cost: number;
  announcement_text: string;
}

export const storeApi = {
  /** Shipping rule and announcement set in Admin > Settings */
  settings: () => client.get<StoreSettingsData>('/store/settings').then((res) => res.data),
};
