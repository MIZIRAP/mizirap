import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Film } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';

export const MediaView = () => {
  const { media, updateMediaProgress } = useStore();
  const [activeTab, setActiveTab] = useState('İzliyorum');

  const tabs = ['İzliyorum', 'İzlenecek', 'Tamamlandı'];

  const filteredMedia = media.filter(m => m.status === activeTab) || [];
  
  // For demo if empty
  const defaultMedia = [
    { id: 'm1', title: 'Succession', type: 'Dizi', status: 'İzliyorum', currentSeason: 4, currentEpisode: 3 },
    { id: 'm2', title: 'The Bear', type: 'Dizi', status: 'İzliyorum', currentSeason: 2, currentEpisode: 8 }
  ];

  const displayMedia = filteredMedia.length > 0 ? filteredMedia : (activeTab === 'İzliyorum' ? defaultMedia : []);

  const handleEpisodePlus = (id: string, s: number, e: number) => {
    updateMediaProgress(id, s, e + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 pb-10"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-on-background">Eğlence</h2>
        <button className="bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-tint">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container-low p-1 rounded-full overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-24 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Media List */}
      <div className="grid grid-cols-2 gap-4">
        {displayMedia.length === 0 ? (
          <div className="col-span-2 text-center text-sm text-on-surface-variant py-10">
            Bu kategoride kayıt bulunamadı.
          </div>
        ) : (
          displayMedia.map(item => (
            <div key={item.id} className="bg-surface-container-lowest rounded-3xl p-4 card-shadow flex flex-col gap-3 relative overflow-hidden group">
              <div className="w-full h-32 bg-surface-container rounded-2xl flex items-center justify-center text-outline-variant">
                 <Film className="w-10 h-10 opacity-50" />
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-outline px-1">{item.type}</span>
                <h3 className="text-sm font-bold text-on-surface leading-tight px-1">{item.title}</h3>
              </div>

              {item.type === 'Dizi' && item.status === 'İzliyorum' && (
                <div className="mt-auto flex items-center justify-between bg-surface-container-low p-2 rounded-xl">
                  <span className="text-xs font-semibold text-primary px-1">
                    S{item.currentSeason} • B{item.currentEpisode}
                  </span>
                  <button 
                    onClick={() => handleEpisodePlus(item.id, item.currentSeason || 1, item.currentEpisode || 1)}
                    className="w-7 h-7 bg-primary text-on-primary rounded-full flex items-center justify-center hover:bg-surface-tint active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
              {item.status === 'Tamamlandı' && (
                <div className="mt-auto flex items-center justify-center bg-secondary-container p-2 rounded-xl gap-1 text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[11px] font-bold">Bitti</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
