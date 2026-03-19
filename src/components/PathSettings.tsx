import type { PathPoint } from '../types/simulator';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  inflows: PathPoint[];
  outflows: PathPoint[];
  onInflowsChange: (inflows: PathPoint[]) => void;
  onOutflowsChange: (outflows: PathPoint[]) => void;
}

export function PathSettings({ inflows, outflows, onInflowsChange, onOutflowsChange }: Props) {
  
  const addPath = (type: 'in' | 'out') => {
    const list = type === 'in' ? inflows : outflows;
    const newItem: PathPoint = {
      id: `${type}-${Date.now()}`,
      position: 0,
      vehiclesPerHour: 500
    };
    if (type === 'in') onInflowsChange([...list, newItem]);
    else onOutflowsChange([...list, newItem]);
  };

  const updatePath = (type: 'in' | 'out', id: string, data: Partial<PathPoint>) => {
    const list = type === 'in' ? inflows : outflows;
    const updated = list.map(item => item.id === id ? { ...item, ...data } : item);
    if (type === 'in') onInflowsChange(updated);
    else onOutflowsChange(updated);
  };

  const removePath = (type: 'in' | 'out', id: string) => {
    const list = type === 'in' ? inflows : outflows;
    const filtered = list.filter(item => item.id !== id);
    if (type === 'in') onInflowsChange(filtered);
    else onOutflowsChange(filtered);
  };

  const renderPathList = (type: 'in' | 'out', paths: PathPoint[]) => (
    <div className="flex flex-col gap-3">
      {paths.map((path) => (
        <div key={path.id} className="p-3 rounded-lg border flex flex-col gap-3" style={{ borderColor: 'var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between">
            <span className="text-secondary text-sm font-medium">Path ID: {path.id.slice(0, 8)}</span>
            <button className="btn-icon" onClick={() => removePath(type, path.id)}><Trash2 size={16} /></button>
          </div>
          <div className="flex gap-2">
            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Position (0-1)</label>
              <input 
                type="number" min="0" max="1" step="0.1" 
                className="input-premium" style={{ padding: '0.4rem 0.6rem' }}
                value={path.position}
                onChange={(e) => updatePath(type, path.id, { position: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Cars / hr</label>
              <input 
                type="number" min="0" step="100" 
                className="input-premium" style={{ padding: '0.4rem 0.6rem' }}
                value={path.vehiclesPerHour}
                onChange={(e) => updatePath(type, path.id, { vehiclesPerHour: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="input-label">Inflow Paths</label>
          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => addPath('in')}>
            <Plus size={14} /> Add
          </button>
        </div>
        {renderPathList('in', inflows)}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="input-label">Outflow Paths</label>
          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => addPath('out')}>
            <Plus size={14} /> Add
          </button>
        </div>
        {renderPathList('out', outflows)}
      </div>
    </div>
  );
}
