import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, WaterLog, ReadingLog, ExerciseItem, Transaction, MealEntry, MediaItem } from '../types';

interface AppState {
  profile: UserProfile;
  waterLog: WaterLog;
  readingLog: ReadingLog;
  exercises: ExerciseItem[];
  transactions: Transaction[];
  meals: MealEntry[];
  media: MediaItem[];
  
  // Actions
  updateWaterLog: (ml: number) => void;
  updateReadingLog: (pages: number) => void;
  addExercise: (exercise: ExerciseItem) => void;
  addTransaction: (transaction: Transaction) => void;
  addMeal: (meal: MealEntry) => void;
  addMedia: (media: MediaItem) => void;
  updateMediaProgress: (id: string, season: number, episode: number) => void;
}

const defaultProfile: UserProfile = {
  name: 'Selin',
  email: 'selin@example.com',
  bio: '',
  birthDate: '',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6pbBf1WbDO9xMS_XZVPq3Hat-IK7RVbQRVC5-9p8PWsv7SHG_Yojo0BjpUQAjhbGfBVWyXpGohNDbHg-yOrIOtX0zvzHvWJ0XjCLkLb4jDyzHW1tUnhdG4g69-o5TjKC7k0rOwSaXpzWjKDRZIhOzP1obI9IDh1PtPTw3cqmnIhUiMtmYi4lnBR1JB31WEtk7J5y65lOTNGEai5pKftjSXWP6cklloZAmRN4fheHJAMy0AjKzxoBO',
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      waterLog: { currentMl: 1250, targetMl: 2000 },
      readingLog: { pagesReadToday: 45, currentBookTitle: 'Atomik Alışkanlıklar', booksCompleted: 2, targetBooks: 5 },
      exercises: [
        { id: '1', name: 'Bench Press', sets: 4, reps: 8, weightKg: 60, category: 'Upper Body' },
        { id: '2', name: 'Squat', sets: 3, reps: 12, weightKg: 40, category: 'Lower Body' }
      ],
      transactions: [],
      meals: [],
      media: [],

      updateWaterLog: (ml) => set((state) => ({
        waterLog: { ...state.waterLog, currentMl: Math.min(state.waterLog.currentMl + ml, state.waterLog.targetMl) }
      })),
      
      updateReadingLog: (pages) => set((state) => ({
        readingLog: { ...state.readingLog, pagesReadToday: pages }
      })),

      addExercise: (exercise) => set((state) => ({
        exercises: [...state.exercises, exercise]
      })),

      addTransaction: (transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions]
      })),

      addMeal: (meal) => set((state) => ({
        meals: [meal, ...state.meals]
      })),

      addMedia: (media) => set((state) => ({
        media: [media, ...state.media]
      })),
      
      updateMediaProgress: (id, season, episode) => set((state) => ({
        media: state.media.map(m => m.id === id ? { ...m, currentSeason: season, currentEpisode: episode } : m)
      })),
    }),
    {
      name: 'mylife-storage',
    }
  )
);
