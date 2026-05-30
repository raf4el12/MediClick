import { api } from '@/libs/axios';
import type {
  Review,
  DoctorReviews,
  CreateReviewPayload,
} from '@/views/reviews/types';

export const reviewsService = {
  create: async (payload: CreateReviewPayload): Promise<Review> => {
    const response = await api.post<Review>('/reviews', payload);

    return response.data;
  },

  getMine: async (): Promise<Review[]> => {
    const response = await api.get<Review[]>('/reviews/my');

    return response.data;
  },

  getDoctorReviews: async (doctorId: number): Promise<DoctorReviews> => {
    const response = await api.get<DoctorReviews>(`/reviews/doctor/${doctorId}`);

    return response.data;
  },

  // Moderación: incluye reseñas ocultas (requiere UPDATE:REVIEWS)
  getDoctorReviewsAll: async (doctorId: number): Promise<DoctorReviews> => {
    const response = await api.get<DoctorReviews>(
      `/reviews/doctor/${doctorId}/all`,
    );

    return response.data;
  },

  // Moderación (admin)
  setVisibility: async (id: number, isVisible: boolean): Promise<Review> => {
    const response = await api.patch<Review>(`/reviews/${id}/visibility`, {
      isVisible,
    });

    return response.data;
  },
};
