import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, History, TrendingUp, Equal, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';

export const WorkoutView = () => {
  const { exercises, addExercise } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  const toggleHistory = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && sets && reps && weight) {
      addExercise({
        id: Date.now().toString(),
        name,
        sets: parseInt(sets),
        reps: parseInt(reps),
        weightKg: parseFloat(weight),
        category: 'Upper Body', // default for now
      });
      setName(''); setSets(''); setReps(''); setWeight('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-8 pb-10"
    >
      {/* Weekly Summary Widget */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Bu Hafta</h2>
          <Calendar className="text-primary-container w-6 h-6" />
        </div>
        <p className="text-sm text-on-surface-variant mb-4">Bu hafta 3 gün antrenman yapıldı</p>
        <div className="flex gap-2">
          {['Pz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day, idx) => (
            <div 
              key={day}
              className={`flex-1 h-8 rounded-md flex items-center justify-center text-[11px] font-medium
                ${[1, 3, 5].includes(idx) ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
            >
              {day}
            </div>
          ))}
        </div>
      </section>

      {/* Today's Workout */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline">
          <h2 className="text-2xl font-semibold text-on-background">Günün Programı</h2>
          <span className="text-xs font-semibold text-outline">Tüm Vücut</span>
        </div>

        <div className="space-y-3">
          {exercises.map((ex) => (
            <div key={ex.id} className="w-full text-left bg-surface-container-lowest rounded-3xl p-4 card-shadow">
              <button 
                onClick={() => toggleHistory(ex.id)}
                className="w-full text-left flex justify-between items-center mb-2 group"
              >
                <h3 className="text-xl font-semibold text-on-background">{ex.name}</h3>
                <History className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors" />
              </button>
              
              <div className="flex justify-between items-end">
                <div className="text-base text-on-surface-variant">
                  <span className="font-medium text-primary">{ex.sets}</span> set × <span className="font-medium text-primary">{ex.reps}</span> tekrar
                </div>
                
                <div className="flex flex-col items-end">
                  {ex.name === 'Bench Press' && (
                    <div className="flex items-center gap-1 bg-primary-container text-on-primary-container px-2 py-0.5 rounded-md text-[11px] font-medium mb-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>+5kg</span>
                    </div>
                  )}
                  {ex.name === 'Squat' && (
                    <div className="flex items-center gap-1 bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded-md text-[11px] font-medium mb-1">
                      <Equal className="w-3 h-3" />
                      <span>=</span>
                    </div>
                  )}
                  <div className="text-xl font-semibold text-primary">
                    {ex.weightKg}<span className="text-sm font-normal text-on-surface-variant ml-1">kg</span>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === ex.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-surface-variant space-y-2 overflow-hidden"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">22 Tem</span>
                      <span className="text-on-background">4x8 {ex.weightKg}kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-outline">20 Tem</span>
                      <span className="text-outline">4x8 {Math.max(ex.weightKg - 5, 0)}kg</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* New Exercise Entry */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 card-shadow border border-surface-container">
        <h3 className="text-xl font-semibold text-on-background mb-4">Egzersiz Ekle</h3>
        <form onSubmit={handleAddExercise} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Egzersiz Adı</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm py-3 px-4 transition-colors outline-none" 
              placeholder="Örn. Deadlift" 
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Set</label>
              <input 
                type="number" 
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm py-3 px-4 transition-colors outline-none" 
                placeholder="3" 
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tekrar</label>
              <input 
                type="number" 
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm py-3 px-4 transition-colors outline-none" 
                placeholder="10" 
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Ağırlık (kg)</label>
              <input 
                type="number" 
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm py-3 px-4 transition-colors outline-none" 
                placeholder="0" 
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full bg-primary text-on-primary rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-surface-tint transition-colors active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Kaydet
          </button>
        </form>
      </section>
    </motion.div>
  );
};
