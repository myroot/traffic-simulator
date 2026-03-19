import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Move, Crosshair } from 'lucide-react';
import type { SimulatorConfig } from '../types/simulator';
import { World } from '../engine/World';
import { Renderer } from '../engine/Renderer';
import { Vehicle } from '../engine/Vehicle';

interface Props {
  config: SimulatorConfig;
  isRunning: boolean;
  timeScale: number;
}

export function SimulationView({ config, isRunning, timeScale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const reqFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [followedVehicle, setFollowedVehicle] = useState<Vehicle | null>(null);
  const [stats, setStats] = useState({ count: 0, flow: 0, avgSpeed: 0 });
  const lastStatsUpdateRef = useRef<number>(0);

  // Initialize or update World
  useEffect(() => {
    if (!worldRef.current) {
      worldRef.current = new World(config);
    } else {
      worldRef.current.updateConfig(config);
    }
  }, [config]);

  // Handle Reset Event
  useEffect(() => {
    const handleReset = () => {
      worldRef.current = new World(config);
      setStats({ count: 0, flow: 0, avgSpeed: 0 });
      setFollowedVehicle(null);
      if (rendererRef.current && canvasRef.current) {
        // Redraw immediately on reset if not running
        rendererRef.current.render(worldRef.current);
      }
    };
    window.addEventListener('reset-simulation', handleReset);
    return () => window.removeEventListener('reset-simulation', handleReset);
  }, [config]);

  // Setup Canvas and Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new Renderer(canvas);
    rendererRef.current.onVehicleClick = (v: Vehicle | null) => {
       setFollowedVehicle(v);
    };
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        if (worldRef.current && !isRunning) {
          rendererRef.current?.render(worldRef.current);
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []); // Only run once to setup

  // Simulation Loop
  useEffect(() => {
    if (!isRunning) {
      // Just render the current state paused
      if (worldRef.current && rendererRef.current) {
        rendererRef.current.render(worldRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      let dt = (time - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = time;

      if (worldRef.current && rendererRef.current) {
        // Cap dt to avoid huge jumps if tab was inactive
        const cappedDt = Math.min(dt, 0.1);
        worldRef.current.step(cappedDt * timeScale);
        rendererRef.current.render(worldRef.current);

        // Update stats at ~4 FPS (250ms interval) to keep React overhead low while feeling real-time
        if (time - lastStatsUpdateRef.current > 250) {
           lastStatsUpdateRef.current = time;
           const cars = worldRef.current.vehicles;
           const count = cars.length;
           const roadLengthKm = worldRef.current.config.road.length / 1000;
           
           let totalSpeed = 0;
           for (const v of cars) totalSpeed += v.speed;
           
           const avgSpeedMs = count > 0 ? totalSpeed / count : 0;
           const avgSpeedKmh = avgSpeedMs * 3.6;
           
           // Throughput (q) = Density (k) * Space-mean Speed (v)
           // k = count / roadLengthKm
           // q = (count / roadLengthKm) * avgSpeedKmh (veh/hr)
           const flow = roadLengthKm > 0 ? (count / roadLengthKm) * avgSpeedKmh : 0;

           setStats({ count, flow: Math.round(flow), avgSpeed: Math.round(avgSpeedKmh) });
        }
      }

      reqFrameRef.current = requestAnimationFrame(loop);
    };

    reqFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqFrameRef.current);
    };
  }, [isRunning]);

  return (
    <div className="h-full w-full relative">
      <canvas 
        ref={canvasRef} 
        className="block" 
        style={{ width: '100%', height: '100%', background: 'var(--bg-primary)' }}
      />
      
      {!isRunning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
          <div className="p-6 rounded-xl glass-panel text-center pointer-events-auto flex flex-col items-center gap-2">
            <h2 className="text-2xl font-bold text-gradient m-0">Simulation Paused</h2>
            <p className="text-secondary text-sm m-0">Configure settings or click Start Simulation</p>
          </div>
        </div>
      )}
      
      {/* Follow Vehicle UI */}
      {followedVehicle && (
        <div className="absolute top-4 left-4 glass-panel p-4 flex flex-col gap-2 shadow-xl" style={{ background: 'rgba(30, 41, 59, 0.9)', minWidth: 200, zIndex: 10 }}>
          <div className="flex justify-between items-center gap-4 border-b border-slate-700 pb-2">
             <div className="flex items-center gap-2">
                <Crosshair size={16} className="text-primary" />
                <span className="text-sm font-semibold">Following Vehicle</span>
             </div>
             <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: followedVehicle.group.color }}></div>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mt-1">
            <span className="text-secondary font-medium">Speed:</span>
            <span className="font-mono text-right">{Math.round(followedVehicle.speed * 3.6)} km/h</span>
            
            <span className="text-secondary font-medium">Lane:</span>
            <span className="font-mono text-right">{followedVehicle.lane + 1}</span>
            
            <span className="text-secondary font-medium">Group:</span>
            <span className="text-right truncate" title={followedVehicle.group.name}>{followedVehicle.group.name}</span>
          </div>
          <button 
            className="btn btn-secondary w-full text-xs py-2 mt-2"
            onClick={() => rendererRef.current?.resetView()}
          >
            Unfollow & Reset View
          </button>
        </div>
      )}

      {/* Simulation Stats Overlay */}
      <div 
        className="glass-panel p-4 flex flex-col gap-2 shadow-xl" 
        style={{ 
          position: 'absolute', 
          top: '16px', 
          right: '16px', 
          background: 'rgba(30, 41, 59, 0.9)', 
          minWidth: '220px', 
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
          <h3 className="text-sm font-semibold text-primary border-b border-slate-700 pb-2 mb-1">Traffic Statistics</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-secondary">Throughput:</span>
              <span className="font-mono text-emerald-400 font-bold">{stats.flow.toLocaleString()} <span className="text-xs font-normal text-slate-400">veh/h</span></span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-secondary">Avg Speed:</span>
              <span className="font-mono">{stats.avgSpeed} <span className="text-xs font-normal text-slate-400">km/h</span></span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-secondary">Total Vehicles:</span>
              <span className="font-mono">{stats.count}</span>
            </div>
          </div>
        </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <div className="glass-panel flex flex-col gap-1 p-2">
          <button 
            className="btn-icon" 
            onClick={() => rendererRef.current?.handleZoom(1.2)}
            title="Zoom In"
          >
            <Plus size={20}/>
          </button>
          <button 
            className="btn-icon" 
            onClick={() => rendererRef.current?.handleZoom(1 / 1.2)}
            title="Zoom Out"
          >
            <Minus size={20}/>
          </button>
          <button 
            className="btn-icon" 
            onClick={() => rendererRef.current?.resetView()}
            title="Reset View"
          >
            <Move size={20}/>
          </button>
        </div>
      </div>
    </div>
  );
}
