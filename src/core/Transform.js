export class Transform {
  constructor(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
    this.x = x;
    this.y = y;
    this.rotation = rotation; // In degrees
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  // Clone to duplicate the transform (useful for keyframes)
  clone() {
    return new Transform(this.x, this.y, this.rotation, this.scaleX, this.scaleY);
  }

  // Simple interpolation (Lerp) for animation between two transforms
  static lerp(start, end, t) {
    const lerp = (a, b, t) => a + (b - a) * t;
    return new Transform(
      lerp(start.x, end.x, t),
      lerp(start.y, end.y, t),
      lerp(start.rotation, end.rotation, t), // Note: might need shortest path rotation later
      lerp(start.scaleX, end.scaleX, t),
      lerp(start.scaleY, end.scaleY, t)
    );
  }
}
