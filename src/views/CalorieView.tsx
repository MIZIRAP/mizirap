import { motion } from 'framer-motion';
import { Flame, Plus, Search, Beef, Wheat, Droplet } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';

export const CalorieView = () => {
  const { meals, addMeal } = useStore();
  
  // Dummy target values
  const targetCals = 2000;
  const targetProtein = 120;
  const targetCarbs = 200;
  const targetFat = 65;

  const currentCals = meals.reduce((acc, curr) => acc + curr.calories, 0) + 1450;
  const currentProtein = meals.reduce((acc, curr) => acc + curr.proteinGrams, 0) + 85;
  const currentCarbs = meals.reduce((acc, curr) => acc + curr.carbsGrams, 0) + 140;
  const currentFat = meals.reduce((acc, curr) => acc + curr.fatGrams, 0) + 40;

  // Circle gauge math
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(currentCals / targetCals, 1) * circumference);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [foodName, setFoodName] = useState('');

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (foodName) {
      addMeal({
        id: Date.now().toString(),
        mealType: 'Öğle',
        foodName,
        portionDescription: '1 Porsiyon',
        calories: 350,
        proteinGrams: 20,
        carbsGrams: 40,
        fatGrams: 10
      });
      setFoodName('');
      setIsModalOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 pb-10"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-on-background">Beslenme</h2>
        <span className="bg-surface-container-low px-3 py-1 rounded-full text-xs font-semibold text-primary">
          Bugün
        </span>
      </div>

      {/* Main Calorie Ring */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 card-shadow flex flex-col items-center justify-center gap-6">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-surface-container"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <Flame className="w-5 h-5 text-primary mb-1" />
            <span className="text-3xl font-bold text-on-surface">{currentCals}</span>
            <span className="text-xs text-on-surface-variant uppercase">/ {targetCals} kcal</span>
          </div>
        </div>

        {/* Macro Bars */}
        <div className="w-full grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span className="flex items-center gap-1"><Beef className="w-3 h-3"/> Protein</span>
              <span>{currentProtein}g</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.min((currentProtein / targetProtein) * 100, 100)}%` }}></div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span className="flex items-center gap-1"><Wheat className="w-3 h-3"/> Karb</span>
              <span>{currentCarbs}g</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min((currentCarbs / targetCarbs) * 100, 100)}%` }}></div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span className="flex items-center gap-1"><Droplet className="w-3 h-3"/> Yağ</span>
              <span>{currentFat}g</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-tertiary-fixed rounded-full" style={{ width: `${Math.min((currentFat / targetFat) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Add Meal Action */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-surface-container-lowest rounded-3xl p-4 card-shadow flex items-center justify-between hover:bg-surface-container-low transition-colors active:scale-95"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-semibold text-on-surface">Yiyecek Ekle</span>
        </div>
        <Search className="w-5 h-5 text-outline" />
      </button>

      {/* Recent Meals List */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-outline px-1">Öğünler</h3>
        {meals.map(meal => (
          <div key={meal.id} className="bg-surface-container-lowest rounded-2xl p-4 flex justify-between items-center card-shadow">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-on-surface">{meal.foodName}</span>
              <span className="text-[11px] text-on-surface-variant">{meal.mealType} • {meal.portionDescription}</span>
            </div>
            <div className="text-sm font-bold text-primary">{meal.calories} kcal</div>
          </div>
        ))}
      </section>

      {/* Simple Modal overlay for Demo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 flex flex-col gap-4 shadow-2xl"
          >
            <h3 className="text-xl font-bold">Kütüphaneden Yiyecek Seç</h3>
            <form onSubmit={handleAddMeal} className="flex flex-col gap-4">
              <input 
                type="text" 
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Örn: Yulaf Ezmesi"
                className="bg-surface-container-low p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 rounded-xl font-semibold bg-surface-container text-on-surface-variant">İptal</button>
                <button type="submit" className="flex-1 p-3 rounded-xl font-semibold bg-primary text-on-primary">Ekle</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
