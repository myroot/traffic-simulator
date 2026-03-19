import type { RoadConfig } from '../types/simulator';

interface Props {
  config: RoadConfig;
  onChange: (config: RoadConfig) => void;
}

export function RoadSettings({ config, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="input-group">
        <label className="input-label">Road Type</label>
        <select 
          className="input-premium"
          value={config.type}
          onChange={(e) => onChange({ ...config, type: e.target.value as any })}
        >
          <option value="circular">Circular (Ring Road)</option>
          <option value="one-way">One-Way (Straight)</option>
        </select>
      </div>

      <div className="flex gap-4">
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label">Lanes</label>
          <input 
            type="number" 
            min="1" max="6"
            className="input-premium"
            value={config.lanes}
            onChange={(e) => onChange({ ...config, lanes: parseInt(e.target.value) || 1 })}
          />
        </div>

        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label">Length (m)</label>
          <input 
            type="number" 
            min="100" max="10000" step="100"
            className="input-premium"
            value={config.length}
            onChange={(e) => onChange({ ...config, length: parseInt(e.target.value) || 1000 })}
          />
        </div>
      </div>
    </div>
  );
}
