import type { SimulatorConfig } from '../types/simulator';
import { RoadSettings } from './RoadSettings';
import { GroupSettings } from './GroupSettings';
import { PathSettings } from './PathSettings';
import { Settings, CarFront, Navigation } from 'lucide-react';

interface Props {
  config: SimulatorConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulatorConfig>>;
}

export function SettingsPanel({ config, setConfig }: Props) {
  return (
    <div className="flex flex-col gap-8">
      
      {/* Road Settings Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded bg-indigo-500 bg-opacity-20 text-indigo-400" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderRadius: '8px', padding: '0.4rem' }}>
            <Navigation size={18} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Road Configuration</h3>
        </div>
        <RoadSettings config={config.road} onChange={(road) => setConfig({ ...config, road })} />
      </section>

      {/* Path Settings Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '8px', padding: '0.4rem' }}>
            <Settings size={18} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Entry & Exit Paths</h3>
        </div>
        <PathSettings 
          inflows={config.inflows} 
          outflows={config.outflows}
          onInflowsChange={(inflows) => setConfig({ ...config, inflows })}
          onOutflowsChange={(outflows) => setConfig({ ...config, outflows })}
        />
      </section>

      {/* Vehicle Groups Section */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
          <div className="p-2 rounded" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185', borderRadius: '8px', padding: '0.4rem' }}>
            <CarFront size={18} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Vehicle Groups</h3>
        </div>
        <GroupSettings 
          groups={config.vehicleGroups} 
          onChange={(vehicleGroups) => setConfig({ ...config, vehicleGroups })} 
        />
      </section>

    </div>
  );
}
