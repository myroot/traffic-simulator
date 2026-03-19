import type { VehicleGroup } from '../types/simulator';

export class Vehicle {
  public id: string;
  public group: VehicleGroup;
  public maxSpeed: number; // Actual instanced max speed
  
  public position: number = 0; // meters along the road
  public lane: number = 0; // 0-indexed lane
  public speed: number = 0; // m/s
  public acceleration: number = 0; // m/s^2

  // IDM parameters
  public a_max = 2.0; // max acceleration m/s^2
  public b = 1.67; // comfortable deceleration m/s^2
  public T = 1.5; // safe time headway in seconds
  public length = 5; // average vehicle length in meters

  // Lane changing state
  public isChangingLane = false;
  public targetLane = 0;
  public laneChangeProgress = 0; // 0 to 1

  constructor(id: string, group: VehicleGroup, initialPosition: number, initialLane: number, initialSpeed: number = 0) {
    this.id = id;
    this.group = group;
    this.position = initialPosition;
    this.lane = initialLane;
    this.targetLane = initialLane;

    // Pick a varied speed from the group's range
    const [minRange, maxRange] = this.group.maxSpeed;
    this.maxSpeed = minRange + Math.random() * (maxRange - minRange);

    this.speed = initialSpeed || (this.maxSpeed / 3.6); // Convert km/h to m/s
  }

  // IDM (Intelligent Driver Model) Acceleration calculation
  // Returns acceleration in m/s^2
  public calculateAcceleration(leader: Vehicle | null, roadLength: number, isCircular: boolean): number {
    const v0 = this.maxSpeed / 3.6; // target speed in m/s
    const s0 = this.group.safeDistance; // minimum gap in meters

    // Free road term
    const freeTerm = 1 - Math.pow(this.speed / v0, 4);

    if (!leader) {
      if (this.speed >= v0) return 0; // Don't exceed max speed
      return this.a_max * freeTerm;
    }

    // Interaction term
    let s = leader.position - this.position - leader.length;
    // Handle wrap-around for circular roads
    if (s < 0 && isCircular) {
      s += roadLength;
    }

    // Fallback if s is still < 0 (shouldn't happen unless collision)
    if (s <= 0) s = 0.1;

    const delta_v = this.speed - leader.speed;
    const s_star = s0 + Math.max(0, this.speed * this.T + (this.speed * delta_v) / (2 * Math.sqrt(this.a_max * this.b)));

    return this.a_max * (freeTerm - Math.pow(s_star / s, 2));
  }

  public update(dt: number, acceleration: number) {
    this.acceleration = acceleration;
    this.speed += this.acceleration * dt;
    this.speed = Math.max(0, this.speed); // no reversing
    this.position += this.speed * dt;

    if (this.isChangingLane) {
      this.laneChangeProgress += dt / 2; // lane change takes 2 seconds
      if (this.laneChangeProgress >= 1) {
        this.lane = this.targetLane;
        this.isChangingLane = false;
        this.laneChangeProgress = 0;
      }
    }
  }

  public getRenderLane(): number {
    if (!this.isChangingLane) return this.lane;
    // Smooth transition between lanes
    const t = this.laneChangeProgress;
    // ease in-out cubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return this.lane + (this.targetLane - this.lane) * ease;
  }
}
