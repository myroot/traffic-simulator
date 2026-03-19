import { useState } from 'react';
import type { SimulatorConfig } from './types/simulator';
import { DEFAULT_CONFIG } from './types/simulator';
import { SettingsPanel } from './components/SettingsPanel';
import { SimulationView } from './components/SimulationView';

function App() {
  const [config, setConfig] = useState<SimulatorConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [timeScale, setTimeScale] = useState(1);

  return (
    <div className="flex w-full h-full" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Settings Panel */}
      <div 
        style={{ 
          width: '380px', 
          height: '100%', 
          borderRight: '1px solid var(--border-color)', 
          backgroundColor: 'var(--bg-secondary)', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
          <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Traffic Flow</h1>
          <p className="text-sm text-secondary" style={{ marginTop: '0.25rem', marginBottom: 0 }}>Simulation Environment</p>
        </div>
        
        <div className="p-6 flex-1">
          <SettingsPanel 
            config={config} 
            setConfig={setConfig} 
          />
        </div>

        <div className="p-6 border-t flex flex-col gap-4" style={{ borderColor: 'var(--border-color)', position: 'sticky', bottom: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary text-center">Simulation Speed</span>
            <div className="flex justify-center gap-2">
              {[1, 2, 5, 10].map(speed => (
                <button 
                  key={speed}
                  className={`btn ${timeScale === speed ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.8rem', flex: 1 }}
                  onClick={() => setTimeScale(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
          <button 
            className="btn btn-primary w-full" 
            style={{ padding: '1rem', fontSize: '1.1rem' }}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? 'Pause Simulation' : 'Start Simulation'}
          </button>
          <button 
            className="btn btn-secondary w-full"
            onClick={() => window.dispatchEvent(new CustomEvent('reset-simulation'))}
          >
            Reset Environment
          </button>
        </div>
      </div>

      {/* Main Simulation Area */}
      <div className="flex-1 h-full relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <SimulationView config={config} isRunning={isRunning} timeScale={timeScale} />
      </div>
    </div>
  );
}

export default App;
