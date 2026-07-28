import { Segment } from './Segment.js';

export class Figure {
  constructor(name = 'Figure') {
    this.name = name;
    this.points = [{ x: 0, y: -50 }, { x: 0, y: 50 }];
    this.segments = [];
    this.animations = [];
    this.canvasWidth = 800;
    this.canvasHeight = 600;
    this.fps = 12;
  }

  addPoint(x, y) {
    const index = this.points.length;
    this.points.push({ x, y });
    return index;
  }

  removePoint(index) {
    const segsUsing = this.segments.filter(
      s => s.point1Index === index || s.point2Index === index
    );
    if (segsUsing.length > 0 && this.points.length <= 2) return false;
    segsUsing.forEach(s => {
      if (s.point1Index === index) s.point1Index = 0;
      if (s.point2Index === index) s.point2Index = 0;
    });
    const removed = this.points[index];
    this.segments.forEach(s => {
      if (s.point1Index > index) s.point1Index--;
      if (s.point2Index > index) s.point2Index--;
    });
    this.points.splice(index, 1);
    return removed;
  }

  addSegment(type = 'line') {
    const seg = new Segment(type);
    const p1Idx = this.addPoint(0, 0);
    const p2Idx = this.addPoint(30, 0);
    seg.point1Index = p1Idx;
    seg.point2Index = p2Idx;
    seg.layer = this.segments.length;
    this.segments.push(seg);
    return seg;
  }

  removeSegment(segId) {
    const idx = this.segments.findIndex(s => s.id === segId);
    if (idx === -1) return null;
    const removed = this.segments[idx];
    this.segments.splice(idx, 1);
    return removed;
  }

  getSegment(segId) {
    return this.segments.find(s => s.id === segId);
  }

  toJSON() {
    return {
      name: this.name,
      points: this.points,
      segments: this.segments.map(s => s.toJSON()),
      animations: this.animations,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      fps: this.fps,
    };
  }

  exportToJSON() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  static fromJSON(data) {
    const fig = new Figure(data.name || 'Figure');
    fig.points = data.points || [{ x: 0, y: -50 }, { x: 0, y: 50 }];
    fig.segments = (data.segments || []).map(sd => Segment.fromJSON(sd));
    fig.animations = data.animations || [];
    fig.canvasWidth = data.canvasWidth || 800;
    fig.canvasHeight = data.canvasHeight || 600;
    fig.fps = data.fps || 12;
    return fig;
  }

  static fromJSONString(jsonString) {
    return Figure.fromJSON(JSON.parse(jsonString));
  }
}
