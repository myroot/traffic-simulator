import { World } from './World';
import { Vehicle } from './Vehicle';

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private isMapDragging = false;
  private dragStart = { x: 0, y: 0 };
  public camera = { x: 0, y: 0, zoom: 1 };
  private lastWorld: World | null = null;
  public followedVehicle: Vehicle | null = null;
  public onVehicleClick: ((v: Vehicle | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Pan with mouse
    this.canvas.addEventListener('mousedown', (e) => {
      this.isMapDragging = true;
      this.dragStart = { x: e.offsetX - this.camera.x, y: e.offsetY - this.camera.y };
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isMapDragging) {
        this.camera.x = e.offsetX - this.dragStart.x;
        this.camera.y = e.offsetY - this.dragStart.y;
        if (this.lastWorld) this.render(this.lastWorld);
      }
    });
    this.canvas.addEventListener('mouseup', () => this.isMapDragging = false);
    this.canvas.addEventListener('mouseleave', () => this.isMapDragging = false);

    // Zoom with scroll wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      const amount = e.deltaY < 0 ? zoomFactor : (1 / zoomFactor);
      
      const relX = (e.offsetX - this.camera.x) / this.camera.zoom;
      const relY = (e.offsetY - this.camera.y) / this.camera.zoom;
      
      this.camera.zoom *= amount;
      
      this.camera.x = e.offsetX - relX * this.camera.zoom;
      this.camera.y = e.offsetY - relY * this.camera.zoom;
      if (this.lastWorld) this.render(this.lastWorld);
    });

    // Hit-testing for clicking vehicles
    this.canvas.addEventListener('click', (e) => {
      // Ignore if it was a drag
      if (Math.abs(e.offsetX - this.dragStart.x - this.camera.x) > 5) return;
      if (!this.lastWorld) return;

      const wx = (e.offsetX - this.camera.x) / this.camera.zoom;
      const wy = (e.offsetY - this.camera.y) / this.camera.zoom;

      let closest: Vehicle | null = null;
      let minDist = 20; // max pixel distance to click

      for (const v of this.lastWorld.vehicles) {
         const pos = this.getVehiclePos(v, this.lastWorld, this.canvas.width, this.canvas.height);
         if (!pos) continue;

         const dist = Math.hypot(wx - pos.x, wy - pos.y);
         if (dist < minDist) {
            minDist = dist;
            closest = v;
         }
      }

      this.followedVehicle = closest;
      if (this.onVehicleClick) this.onVehicleClick(closest);
      if (this.lastWorld) this.render(this.lastWorld);
    });

    // Double click to move to start of road
    this.canvas.addEventListener('dblclick', () => {
      if (!this.lastWorld) return;
      const metrics = this.getRoadMetrics(this.lastWorld, this.canvas.width, this.canvas.height);
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;

      if (metrics.isCirc) {
        this.camera.x = cx - cx * this.camera.zoom;
        this.camera.y = cy - (cy - metrics.outerRadius! + metrics.totalRoadWidth / 2) * this.camera.zoom;
      } else {
        this.camera.x = 100 - metrics.startX! * this.camera.zoom;
        this.camera.y = cy - cy * this.camera.zoom;
      }
      
      this.followedVehicle = null;
      if (this.onVehicleClick) this.onVehicleClick(null);
      this.render(this.lastWorld);
    });
  }

  private getRoadMetrics(world: World, canvasWidth: number, canvasHeight: number) {
    const PIXELS_PER_METER = 1.0; 
    const lengthPx = world.config.road.length * PIXELS_PER_METER;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    const lanes = world.config.road.lanes;
    const laneWidth = 14; 
    const totalRoadWidth = lanes * laneWidth;

    if (world.config.road.type === 'circular') {
      let outerRadius = lengthPx / (2 * Math.PI);
      outerRadius = Math.max(outerRadius, 100);
      const innerRadius = outerRadius - totalRoadWidth;
      return { isCirc: true, cx, cy, outerRadius, innerRadius, totalRoadWidth, laneWidth };
    } else {
      const startX = cx - lengthPx / 2;
      const endX = cx + lengthPx / 2;
      const startY = cy - totalRoadWidth / 2;
      return { isCirc: false, cx, cy, startX, endX, startY, totalRoadWidth, laneWidth };
    }
  }

  private getVehiclePos(v: Vehicle, world: World, width: number, height: number): { x: number, y: number } | null {
    const length = world.config.road.length;
    const metrics = this.getRoadMetrics(world, width, height);

    if (metrics.isCirc) {
      const angle = (v.position / length) * Math.PI * 2 - Math.PI / 2;
      const vLane = v.getRenderLane();
      const r = metrics.innerRadius! + (vLane + 0.5) * metrics.laneWidth;
      
      return { x: metrics.cx + Math.cos(angle) * r, y: metrics.cy + Math.sin(angle) * r };
    } else {
      if (v.position < 0 || v.position > length) return null;
      
      const vLane = v.getRenderLane();
      const x = metrics.startX! + (v.position / length) * (metrics.endX! - metrics.startX!);
      const y = metrics.startY! + (vLane + 0.5) * metrics.laneWidth;
      
      return { x, y };
    }
  }

  public handleZoom(amount: number) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const relX = (cx - this.camera.x) / this.camera.zoom;
    const relY = (cy - this.camera.y) / this.camera.zoom;
    
    this.camera.zoom *= amount;
    this.camera.x = cx - relX * this.camera.zoom;
    this.camera.y = cy - relY * this.camera.zoom;
    
    if (this.lastWorld) this.render(this.lastWorld);
  }

  public resetView() {
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.followedVehicle = null;
    if (this.onVehicleClick) this.onVehicleClick(null);
    if (this.lastWorld) this.render(this.lastWorld);
  }

  public render(world: World) {
    this.lastWorld = world;
    const { width, height } = this.canvas;
    const cx = width / 2;
    const cy = height / 2;
    const ctx = this.ctx;
    
    // Clear background
    ctx.fillStyle = '#0f172a'; // bg-primary
    ctx.fillRect(0, 0, width, height);

    // Follow vehicle logic
    if (this.followedVehicle && world.vehicles.includes(this.followedVehicle)) {
       const pos = this.getVehiclePos(this.followedVehicle, world, width, height);
       if (pos) {
          this.camera.x = cx - pos.x * this.camera.zoom;
          this.camera.y = cy - pos.y * this.camera.zoom;
       }
    } else if (this.followedVehicle) {
       // Vehicle despawned
       this.followedVehicle = null;
       if (this.onVehicleClick) this.onVehicleClick(null);
    }

    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    if (world.config.road.type === 'circular') {
      this.renderCircularTarget(world, ctx, width, height);
    } else {
      this.renderStraightTarget(world, ctx, width, height);
    }

    ctx.restore();
  }

  private renderCircularTarget(world: World, ctx: CanvasRenderingContext2D, width: number, height: number) {
    const metrics = this.getRoadMetrics(world, width, height);
    const cx = metrics.cx;
    const cy = metrics.cy;
    const outerRadius = metrics.outerRadius!;
    const innerRadius = metrics.innerRadius!;
    const lanes = world.config.road.lanes;
    const laneWidth = metrics.laneWidth;

    // Draw road base
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = '#334155'; // Slate 700
    ctx.fill();

    // Draw lane markings
    ctx.strokeStyle = '#64748b'; // Slate 500
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 15]);

    for (let i = 1; i < lanes; i++) {
        const r = innerRadius + i * laneWidth;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // We must map position (0 -> road.length) to angle (0 -> 2*PI)
    const length = world.config.road.length;

    // Optional: Draw entry/exit points
    // (Could be drawn as small lines crossing the road at specific angles)

    // Draw vehicles
    for (const v of world.vehicles) {
      const pos = this.getVehiclePos(v, world, width, height);
      if (!pos) continue;

      const angle = (v.position / length) * Math.PI * 2 - Math.PI / 2; // start at top

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle + Math.PI / 2); // align car to tangent

      // Car body
      const carLen = 8;
      const carWid = 4;
      ctx.fillStyle = v.group.color;
      
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.roundRect(-carWid / 2, -carLen / 2, carWid, carLen, 2);
      ctx.fill();

      // Highlight/Glass
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(-carWid / 2 + 1, -carLen / 2 + 1, carWid - 2, carLen / 2, 1);
      // Highlight if followed
      if (this.followedVehicle === v) {
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 2;
         ctx.strokeRect(-carWid / 2 - 2, -carLen / 2 - 2, carWid + 4, carLen + 4);
      }

      ctx.restore();
    }
  }

  private renderStraightTarget(world: World, ctx: CanvasRenderingContext2D, width: number, height: number) {
    const metrics = this.getRoadMetrics(world, width, height);
    const startX = metrics.startX!;
    const endX = metrics.endX!;
    const startY = metrics.startY!;
    const totalRoadWidth = metrics.totalRoadWidth;
    const lanes = world.config.road.lanes;
    const laneWidth = metrics.laneWidth;

    // Draw road base
    ctx.fillStyle = '#334155';
    ctx.fillRect(startX, startY, endX - startX, totalRoadWidth);

    // Draw lane markings
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([15, 20]);
    for (let i = 1; i < lanes; i++) {
        const y = startY + i * laneWidth;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw start and end lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY + totalRoadWidth);
    ctx.moveTo(endX, startY);
    ctx.lineTo(endX, startY + totalRoadWidth);
    ctx.stroke();



    // Draw vehicles
    for (const v of world.vehicles) {
      const pos = this.getVehiclePos(v, world, width, height); 
      if (!pos) continue;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      const carLen = 10;
      const carWid = 5;
      ctx.fillStyle = v.group.color;
      
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      // facing right
      ctx.roundRect(-carLen / 2, -carWid / 2, carLen, carWid, 2);
      ctx.fill();

      // Window reflection
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-carLen/4, -carWid/2 + 1, carLen/4, carWid - 2);

      // Highlight if followed
      if (this.followedVehicle === v) {
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 2;
         ctx.strokeRect(-carLen / 2 - 2, -carWid / 2 - 2, carLen + 4, carWid + 4);
      }

      ctx.restore();
    }
  }
}
