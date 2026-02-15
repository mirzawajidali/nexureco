import client from './client';

export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  order_number?: string;
  subject: string;
  message: string;
}

export const contactApi = {
  submit: (data: ContactFormData) => client.post('/contact/', data),
};
