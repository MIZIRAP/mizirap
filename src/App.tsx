import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { FabMenu } from './components/FabMenu';

// View placeholders
import { DashboardView } from './views/DashboardView';
import { WorkoutView } from './views/WorkoutView';
import { FinanceView } from './views/FinanceView';
import { HabitsView } from './views/HabitsView';
import { CalorieView } from './views/CalorieView';
import { MediaView } from './views/MediaView';
import { MoreView } from './views/MoreView';

function App() {
  return (
    <Router>
      <div className="bg-background text-on-background min-h-screen flex flex-col relative overscroll-y-contain antialiased pb-32">
        <Header />
        
        <main className="flex-1 px-5 pt-4 max-w-2xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/habits" element={<HabitsView />} />
            <Route path="/workout" element={<WorkoutView />} />
            <Route path="/finance" element={<FinanceView />} />
            <Route path="/calories" element={<CalorieView />} />
            <Route path="/media" element={<MediaView />} />
            <Route path="/more" element={<MoreView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <FabMenu />
        <Navbar />
      </div>
    </Router>
  );
}

export default App;
