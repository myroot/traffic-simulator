export type RoadType = 'circular' | 'one-way';

export interface RoadConfig {
  type: RoadType;
  lanes: number;
  length: number; // in meters
}

export interface PathPoint {
  id: string;
  position: number; // 0 to 1 along the road length
  vehiclesPerHour: number;
}

export type LaneBehavior = 'stay' | 'freely' | 'return-to-lower';

export interface VehicleGroup {
  id: string;
  name: string;
  color: string;
  maxSpeed: [number, number]; // [min, max] km/h
  safeDistance: number;    // meters
  laneBehavior: LaneBehavior;
  spawnRatio: number;      // Random weight to spawn into the simulation
}

export interface SimulatorConfig {
  road: RoadConfig;
  inflows: PathPoint[];
  outflows: PathPoint[];
  vehicleGroups: VehicleGroup[];
}

export const DEFAULT_CONFIG: SimulatorConfig = {
  road: {
    type: 'circular',
    lanes: 2,
    length: 1000 // 1km default
  },
  inflows: [
    { id: 'in-1', position: 0, vehiclesPerHour: 1000 }
  ],
  outflows: [
    { id: 'out-1', position: 0.5, vehiclesPerHour: 500 }
  ],
  vehicleGroups: [
    {
      id: 'group-1',
      name: 'Normal Cars',
      color: '#3b82f6',
      maxSpeed: [70, 90],
      safeDistance: 20,
      laneBehavior: 'return-to-lower',
      spawnRatio: 50
    },
    {
      id: 'group-2',
      name: 'Trucks',
      color: '#ef4444',
      maxSpeed: [50, 70],
      safeDistance: 30,
      laneBehavior: 'stay',
      spawnRatio: 10
    }
  ]
};
