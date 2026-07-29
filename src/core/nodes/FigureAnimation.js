export class PointKeyframe {
  constructor(time, x, y) {
    this.time = time;
    this.x = x;
    this.y = y;
  }
}

export class PointTrack {
  constructor(pointIndex) {
    this.pointIndex = pointIndex;
    this.keyframes = [];
  }

  addKeyframe(time, x, y) {
    const existing = this.keyframes.find(kf => Math.abs(kf.time - time) < 0.001);
    if (existing) {
      existing.x = x;
      existing.y = y;
    } else {
      this.keyframes.push(new PointKeyframe(time, x, y));
      this.keyframes.sort((a, b) => a.time - b.time);
    }
  }

  removeKeyframe(time) {
    const idx = this.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.001);
    if (idx !== -1) {
      this.keyframes.splice(idx, 1);
      return true;
    }
    return false;
  }

  getValue(time) {
    const keys = this.keyframes;
    if (keys.length === 0) return null;
    if (keys.length === 1 || time <= keys[0].time) return { x: keys[0].x, y: keys[0].y };
    if (time >= keys[keys.length - 1].time) return { x: keys[keys.length - 1].x, y: keys[keys.length - 1].y };

    for (let i = 0; i < keys.length - 1; i++) {
      if (time >= keys[i].time && time < keys[i + 1].time) {
        const start = keys[i];
        const end = keys[i + 1];
        const t = (time - start.time) / (end.time - start.time);
        return {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        };
      }
    }
    return null;
  }

  toJSON() {
    return {
      pointIndex: this.pointIndex,
      keyframes: this.keyframes.map(kf => ({
        time: kf.time, x: kf.x, y: kf.y,
      })),
    };
  }

  static fromJSON(data) {
    const track = new PointTrack(data.pointIndex);
    if (data.keyframes) {
      data.keyframes.forEach((kf) => track.addKeyframe(kf.time, kf.x, kf.y));
    }
    return track;
  }
}

export class FigureAnimation {
  constructor(name = 'Animation') {
    this.name = name;
    this.duration = 0;
    this.tracks = [];
  }

  addTrack(track) {
    this.tracks.push(track);
  }

  getTrack(pointIndex) {
    return this.tracks.find(t => t.pointIndex === pointIndex);
  }

  getOrCreateTrack(pointIndex) {
    let track = this.getTrack(pointIndex);
    if (!track) {
      track = new PointTrack(pointIndex);
      this.tracks.push(track);
    }
    return track;
  }

  setPointPose(time, pointIndex, x, y) {
    const track = this.getOrCreateTrack(pointIndex);
    track.addKeyframe(time, x, y);
    if (this.duration < time) this.duration = time;
  }

  removePointPose(time, pointIndex) {
    const track = this.getTrack(pointIndex);
    if (!track) return false;
    const removed = track.removeKeyframe(time);
    if (track.keyframes.length === 0) {
      this.tracks = this.tracks.filter(t => t !== track);
    }
    return removed;
  }

  applyToFigure(figure, time) {
    for (const track of this.tracks) {
      const pt = figure.points[track.pointIndex];
      if (!pt) continue;
      const val = track.getValue(time);
      if (val) {
        pt.x = val.x;
        pt.y = val.y;
      }
    }
  }

  toJSON() {
    return {
      name: this.name,
      duration: this.duration,
      tracks: this.tracks.map(t => t.toJSON()),
    };
  }

  exportToJSON() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  static fromJSON(data) {
    const anim = new FigureAnimation(data.name || 'Animation');
    anim.duration = data.duration || 0;
    if (data.tracks) {
      data.tracks.forEach((td) => anim.addTrack(PointTrack.fromJSON(td)));
    }
    return anim;
  }

  static fromJSONString(jsonString) {
    return FigureAnimation.fromJSON(JSON.parse(jsonString));
  }
}
