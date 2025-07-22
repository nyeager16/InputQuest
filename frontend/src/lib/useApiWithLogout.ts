import * as api from './api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { AnswerSubmission, UserPreferences } from '@/types/types';

export function useApiWithLogout() {
  const { logout } = useUserPreferences();

  return {
    getUser: () => api.getUser(logout),
    getUserPreferences: () => api.getUserPreferences(logout),
    updateUserPreferences: (updates: Partial<UserPreferences>) =>
      api.updateUserPreferences(updates, logout),
    getUserWords: (filter: number) => api.getUserWords(filter, logout),
    getWordsLearn: (pageOrUrl: number | string) => api.getWordsLearn(pageOrUrl, logout),
    getUserReviews: () => api.getUserReviews(logout),
    submitReview: (id: number, rating: 0 | 1) => api.submitReview(id, rating, logout),
    addUserWords: (ids: number[]) => api.addUserWords(ids, logout),
    logoutUser: (token: string) => api.logoutUser(token), // no auth
    getDefinition: (id: number) => api.getDefinition(id, logout),
    saveDefinition: (id: number, text: string) => api.saveDefinition(id, text, logout),
    deleteUserWords: (ids: number[]) => api.deleteUserWords(ids, logout),
    getVideos: (query: string) => api.getVideos(query, logout),
    getVideoWords: (id: number) => api.getVideoWords(id, logout),
    getQuestions: (id: number) => api.getQuestions(id, logout),
    submitAnswers: (payload: AnswerSubmission) => api.submitAnswers(payload, logout),
    getConjugations: (id: number) => api.getConjugations(id, logout),
    getLearnData: (id: number) => api.getLearnData(id, logout),
    updateUserWordConjugations: (payload: { word_id: number; needs_review: boolean }[]) =>
      api.updateUserWordConjugations(payload, logout),
    getLanguages: () => api.getLanguages(logout),
    getCommonWords: (language: number, count: number, exclude: number[] = []) =>
      api.getCommonWords(language, count, exclude, logout),
    getSearchWords: (language: number, exclude: number[] = [], term: string) =>
      api.getSearchWords(language, exclude, term, logout),
    signupUser: api.signupUser, // no auth
    loginUser: api.loginUser,   // no auth
  };
}
