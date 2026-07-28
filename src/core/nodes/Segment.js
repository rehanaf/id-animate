export class Segment {
  constructor(type = 'line') {
    this.id = 'seg_' + Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.point1Index = 0;
    this.point2Index = 1;
    this.color = '#d1d5db';
    this.width = 8;
    this.lineCap = 'round';
    this.layer = 0;
    this.curved = false;
    this.curvature = 0.3;
    this.hidden = false;
    this.imageData = null;
    this.imageObj = null;
    this.imageWidth = 100;
    this.imageHeight = 'auto';
    this.shapeClosed = true;
    this.filled = type !== 'circle';
  }

  getPoint1(figure) {
    return figure.points[this.point1Index];
  }

  getPoint2(figure) {
    return figure.points[this.point2Index];
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      point1Index: this.point1Index,
      point2Index: this.point2Index,
      color: this.color,
      width: this.width,
      lineCap: this.lineCap,
      layer: this.layer,
      curved: this.curved,
      curvature: this.curvature,
      hidden: this.hidden,
      imageData: this.imageData,
      imageWidth: this.imageWidth,
      imageHeight: this.imageHeight,
      shapeClosed: this.shapeClosed,
      filled: this.filled,
    };
  }

  static fromJSON(data) {
    const seg = new Segment(data.type);
    seg.id = data.id || seg.id;
    seg.point1Index = data.point1Index ?? 0;
    seg.point2Index = data.point2Index ?? 1;
    seg.color = data.color || '#d1d5db';
    seg.width = data.width ?? 3;
    seg.lineCap = data.lineCap || 'round';
    seg.layer = data.layer ?? 0;
    seg.curved = data.curved ?? false;
    seg.curvature = data.curvature ?? 0.3;
    seg.hidden = data.hidden ?? false;
    seg.imageData = data.imageData || null;
    seg.imageWidth = data.imageWidth ?? 100;
    seg.imageHeight = data.imageHeight ?? 'auto';
    seg.shapeClosed = data.shapeClosed ?? true;
    seg.filled = data.filled ?? (seg.type !== 'circle');
    if (seg.imageData) {
      seg.imageObj = new Image();
      seg.imageObj.src = seg.imageData;
    }
    return seg;
  }
}
