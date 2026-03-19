import type { SimulatorConfig } from '../types/simulator';
import { Vehicle } from './Vehicle';

export class World {
  public config: SimulatorConfig;
  public vehicles: Vehicle[] = [];
  private time = 0;
  private spawnedCounts: Record<string, number> = {};

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.vehicles = [];
    this.config.vehicleGroups.forEach(g => {
      this.spawnedCounts[g.id] = 0;
    });
  }

  public updateConfig(newConfig: SimulatorConfig) {
    this.config = newConfig;
    // If lanes changed, clamp existing vehicles to max valid lane
    const maxLane = this.config.road.lanes - 1;
    this.vehicles.forEach(v => {
      if (v.lane > maxLane) {
        v.lane = maxLane;
        v.targetLane = maxLane;
        v.isChangingLane = false;
      }
    });
  }

  // Find the vehicle immediately ahead in a given lane
  private getLeader(position: number, lane: number): Vehicle | null {
    let leader = null;
    let minDistance = Infinity;
    const isCircular = this.config.road.type === 'circular';
    const length = this.config.road.length;

    for (const v of this.vehicles) {
      // Consider vehicles currently in the lane, or transitioning to it
      if (v.lane !== lane && v.targetLane !== lane) continue;

      let dist = v.position - position;
      if (dist < 0 && isCircular) {
        dist += length;
      }

      // If we found a vehicle ahead, and it's the closest one
      // dist > 0 check handles the case where vehicles are at exact same position (should avoid)
      if (dist > 0 && dist < minDistance) {
        minDistance = dist;
        leader = v;
      }
    }

    return leader;
  }

  private getFollower(position: number, lane: number): Vehicle | null {
    let follower = null;
    let minDistance = Infinity;
    const isCircular = this.config.road.type === 'circular';
    const length = this.config.road.length;

    for (const v of this.vehicles) {
      if (v.lane !== lane && v.targetLane !== lane) continue;

      let dist = position - v.position;
      if (dist < 0 && isCircular) {
        dist += length;
      }

      if (dist > 0 && dist < minDistance) {
        minDistance = dist;
        follower = v;
      }
    }
    return follower;
  }

  // Simplified MOBIL lane change decision
  private tryLaneChange(v: Vehicle) {
    if (v.isChangingLane || this.config.road.lanes <= 1) return;

    if (v.group.laneBehavior === 'stay') return;

    const length = this.config.road.length;
    const isCirc = this.config.road.type === 'circular';

    // 1. Try returning to lower lane (right side) if behavior requires it
    if (v.group.laneBehavior === 'return-to-lower' && v.lane < this.config.road.lanes - 1) {
      const newLane = v.lane + 1;
      const newLeader = this.getLeader(v.position, newLane);
      const newFollower = this.getFollower(v.position, newLane);

      let safe = true;
      if (newLeader) {
        let sLeader = newLeader.position - v.position;
        if (sLeader < 0 && isCirc) sLeader += length;
        if (sLeader < v.group.safeDistance * 1.5) safe = false; // generous gap to return
      }
      if (newFollower && safe) {
        let sFollower = v.position - newFollower.position;
        if (sFollower < 0 && isCirc) sFollower += length;
        if (sFollower < newFollower.group.safeDistance * 1.2) safe = false;
      }

      if (safe) {
        const accInNewLane = v.calculateAcceleration(newLeader, length, isCirc);
        // If returning doesn't cause us to brake heavily
        if (accInNewLane > -0.5) {
          v.isChangingLane = true;
          v.targetLane = newLane;
          v.laneChangeProgress = 0;
          return;
        }
      }
    }

    // 2. Overtaking logic (if blocked)
    const leader = this.getLeader(v.position, v.lane);
    if (!leader) return;

    const myAcc = v.calculateAcceleration(leader, length, isCirc);
    
    // If not heavily decelerating, don't bother overtaking
    if (myAcc > -0.5 && v.speed > (v.maxSpeed / 3.6) * 0.8) return;

    // Evaluate adjacent lanes
    const candidates = [];
    if (v.lane > 0) candidates.push(v.lane - 1); // Upper/passing lane
    // Allow undertaking if 'freely'
    if (v.group.laneBehavior === 'freely' && v.lane < this.config.road.lanes - 1) {
      candidates.push(v.lane + 1);
    }

    for (const newLane of candidates) {
      const newLeader = this.getLeader(v.position, newLane);
      const newFollower = this.getFollower(v.position, newLane);

      // Verify safe gap
      let safe = true;
      if (newLeader) {
        let sLeader = newLeader.position - v.position;
        if (sLeader < 0 && isCirc) sLeader += length;
        if (sLeader < v.group.safeDistance) safe = false; 
      }
      
      if (newFollower && safe) {
        let sFollower = v.position - newFollower.position;
        if (sFollower < 0 && isCirc) sFollower += length;
        if (sFollower < newFollower.group.safeDistance) safe = false; 
      }

      if (safe) {
        // Evaluate advantage
        const newAcc = v.calculateAcceleration(newLeader, length, isCirc);
        if (newAcc > myAcc + 0.2) {
           v.isChangingLane = true;
           v.targetLane = newLane;
           v.laneChangeProgress = 0;
           break;
        }
      }
    }
  }

  // Spawn cars at inflows
  private handleSpawning(dt: number) {
    // Basic spawning logic based on inflows
    // This is simplified: in reality we need to respect vehiclesPerHour and check for safe gaps
    for (const inflow of this.config.inflows) {
      if (inflow.vehiclesPerHour <= 0) continue;
      
      const spawnProb = (inflow.vehiclesPerHour / 3600) * dt;
      if (Math.random() < spawnProb) {
        const totalWeight = this.config.vehicleGroups.reduce((s, g) => s + g.spawnRatio, 0);
        if (totalWeight <= 0) continue; 
        
        let roll = Math.random() * totalWeight;
        let group = this.config.vehicleGroups[0];
        for (const g of this.config.vehicleGroups) {
           roll -= g.spawnRatio;
           if (roll <= 0) {
             group = g; break;
           }
        }
        
        // Pick empty lane
        let targetLane = 0;
        let spawned = false;
        
        // Try to find a lane that has a safe gap at the entry position
        const entryPos = inflow.position * this.config.road.length;
        
        for (let l = 0; l < this.config.road.lanes; l++) {
          const follower = this.getFollower(entryPos, l);
          let safe = true;
          if (follower) {
             let dist = entryPos - follower.position;
             if (dist < 0 && this.config.road.type === 'circular') dist += this.config.road.length;
             // We need at least safe distance + a buffer to not cause immediate hard braking
             if (dist < group.safeDistance + 10) safe = false;
          }
          if (safe) {
            targetLane = l;
            spawned = true;
            break;
          }
        }

        if (spawned) {
          const newVehicle = new Vehicle(`v-${Date.now()}-${Math.random()}`, group, entryPos, targetLane);
          this.vehicles.push(newVehicle);
          this.spawnedCounts[group.id] = (this.spawnedCounts[group.id] || 0) + 1;
        }
      }
    }
  }

  private handleDespawning(dt: number) {
    if (this.config.road.type === 'circular') {
      // Wrap around
      for (const v of this.vehicles) {
        if (v.position > this.config.road.length) {
          v.position -= this.config.road.length;
        }
      }
    } else {
      // One-way straight: despawn at the end
      this.vehicles = this.vehicles.filter(v => v.position <= this.config.road.length);
    }

    // Outflow paths removing cars
    // Assuming out paths pull a certain number of passing vehicles out per hour
    for (const outflow of this.config.outflows) {
      if (outflow.vehiclesPerHour <= 0) continue;
      const removeProb = (outflow.vehiclesPerHour / 3600) * dt;
      const outflowPos = outflow.position * this.config.road.length;
      
      // Look for cars immediately passing this outflow
      for (let i = this.vehicles.length - 1; i >= 0; i--) {
        const v = this.vehicles[i];
        // If the car just passed the outflow in this timestep
        const previousPos = v.position - (v.speed * dt);
        let justPassed = previousPos <= outflowPos && v.position > outflowPos;
        
        if (justPassed && Math.random() < removeProb) { // Simplified probabilistic removal matching rate
          this.vehicles.splice(i, 1);
        }
      }
    }
  }

  public step(dt: number) {
    this.time += dt;

    this.handleSpawning(dt);

    // Calculate accelerations
    const accelerations = new Map<string, number>();
    for (const v of this.vehicles) {
      const leader = this.getLeader(v.position, v.lane);
      const acc = v.calculateAcceleration(leader, this.config.road.length, this.config.road.type === 'circular');
      accelerations.set(v.id, acc);
    }

    // Update positions and lane changes
    for (const v of this.vehicles) {
      const acc = accelerations.get(v.id) || 0;
      v.update(dt, acc);
      this.tryLaneChange(v);
    }

    this.handleDespawning(dt);
  }
}
