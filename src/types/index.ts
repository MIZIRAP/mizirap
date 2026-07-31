export interface UserProfile {
  name: string;
  email: string;
  bio: string;
  birthDate: string;
  avatarUrl: string;
}

export interface WaterLog {
  currentMl: number;
  targetMl: number;
}

export interface ReadingLog {
  pagesReadToday: number;
  currentBookTitle: string;
  booksCompleted: number;
  targetBooks: number;
}

export interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  category: 'Upper Body' | 'Lower Body' | 'Core' | 'Cardio';
}

export interface Transaction {
  id: string;
  title: string;
  category: 'Market' | 'Eğlence' | 'Fatura' | 'Yeme/İçme' | 'Maaş' | 'Diğer';
  paymentMethod: 'Nakit' | 'Bonus Kart' | 'Axess' | 'Banka Havalesi';
  amount: number; // Pozitif: Gelir, Negatif: Gider
  date: string;
}

export interface FoodItem {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface MealEntry {
  id: string;
  mealType: 'Kahvaltı' | 'Öğle' | 'Akşam' | 'Ara Öğün';
  foodName: string;
  portionDescription: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'Dizi' | 'Film';
  status: 'İzliyorum' | 'İzlenecek' | 'Tamamlandı' | 'Yarım Bıraktım';
  currentSeason?: number;
  currentEpisode?: number;
  timestampProgress?: string;
}
