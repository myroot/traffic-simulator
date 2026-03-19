import type { VehicleGroup } from '../types/simulator';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  groups: VehicleGroup[];
  onChange: (groups: VehicleGroup[]) => void;
}

export function GroupSettings({ groups, onChange }: Props) {
  const addGroup = () => {
    const newGroup: VehicleGroup = {
      id: `g-${Date.now()}`,
      name: `Group ${groups.length + 1}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      maxSpeed: [70, 90],
      safeDistance: 20,
      laneBehavior: 'return-to-lower',
      spawnRatio: 50
    };
    onChange([...groups, newGroup]);
  };

  const updateGroup = (id: string, data: Partial<VehicleGroup>) => {
    onChange(groups.map(g => g.id === id ? { ...g, ...data } : g));
  };

  const removeGroup = (id: string) => {
    onChange(groups.filter(g => g.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.id} className="p-4 rounded-lg border flex flex-col gap-4" style={{ borderColor: 'var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={group.color} 
                onChange={(e) => updateGroup(group.id, { color: e.target.value })}
                style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                className="input-premium" 
                style={{ padding: '0.2rem 0.5rem', flex: 1, border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 600 }}
                value={group.name}
                onChange={(e) => updateGroup(group.id, { name: e.target.value })}
              />
            </div>
            <button className="btn-icon" onClick={() => removeGroup(group.id)}><Trash2 size={16} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="input-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>Speed Range (km/h)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="input-premium"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', flex: 1 }}
                  value={group.maxSpeed[0]}
                  onChange={(e) => updateGroup(group.id, { maxSpeed: [parseInt(e.target.value) || 0, group.maxSpeed[1]] })}
                />
                <span className="text-secondary self-center">-</span>
                <input 
                  type="number" 
                  className="input-premium"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', flex: 1 }}
                  value={group.maxSpeed[1]}
                  onChange={(e) => updateGroup(group.id, { maxSpeed: [group.maxSpeed[0], parseInt(e.target.value) || 0] })}
                />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Safe Distance (m)</label>
              <input 
                type="number" min="5" max="100" 
                className="input-premium" style={{ padding: '0.4rem 0.6rem' }}
                value={group.safeDistance}
                onChange={(e) => updateGroup(group.id, { safeDistance: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Spawn Ratio</label>
              <input 
                type="number" min="1" max="1000" 
                className="input-premium" style={{ padding: '0.4rem 0.6rem' }}
                value={group.spawnRatio}
                onChange={(e) => updateGroup(group.id, { spawnRatio: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>Lane Behavior</label>
              <select 
                className="input-premium"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                value={group.laneBehavior}
                onChange={(e) => updateGroup(group.id, { laneBehavior: e.target.value as any })}
              >
                <option value="freely">Freely Overtake</option>
                <option value="return-to-lower">Return to Right Lane</option>
                <option value="stay">Stay in Lane</option>
              </select>
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary w-full" onClick={addGroup} style={{ marginTop: '0.5rem' }}>
        <Plus size={16} /> Add Vehicle Group
      </button>
    </div>
  );
}
