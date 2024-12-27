import { api } from '@/lib/api';
import { Drug } from '@/services/prescriptions.service';

export const drugsService = {
  search: async (query: string): Promise<Drug[]> => {
    const response = await api.get('/drugs/search', {
      params: { q: query }
    });
    return response.data;
  },

  getActive: async (): Promise<Drug[]> => {
    // console.log('drugsService.getActive called');
    try {
      // console.log('Making request to /drugs');
      const response = await api.get('/drugs', {
        params: { active: true }
      });
      // console.log('Received response from /drugs:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in drugsService.getActive:', error);
      throw error;
    }
  }
}; 