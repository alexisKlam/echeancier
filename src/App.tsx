import { useTournamentStore } from './store';
import { ConfigPhase, SchedulePhase } from './components';

function App() {
  const currentPhase = useTournamentStore((state) => state.currentPhase);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏸</span>
            <div>
              <h1 className="text-2xl font-bold">Échéancier Tournoi Badminton</h1>
              <p className="text-sm opacity-80">Planifiez votre tournoi facilement</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                currentPhase === 'config'
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'bg-white/20'
              }`}
            >
              1. Configuration
            </div>
            <div className="w-8 h-0.5 bg-white/40"></div>
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                currentPhase === 'schedule'
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'bg-white/20'
              }`}
            >
              2. Échéancier
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-6">
        {currentPhase === 'config' ? <ConfigPhase /> : <SchedulePhase />}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-4 text-center text-sm">
        <p>
          💾 Données sauvegardées automatiquement dans votre navigateur
        </p>
      </footer>
    </div>
  );
}

export default App;
