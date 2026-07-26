export class Keyframe {
  constructor(time, value) {
    this.time = time; // Time in seconds or frames
    this.value = value; // Value (can be number for rotation, or object for pos)
  }
}

export class AnimationTrack {
  constructor(boneName, property) {
    this.boneName = boneName;
    this.property = property; // e.g., 'rotation', 'x', 'y'
    this.keyframes = []; // Array of Keyframe objects
  }

  addKeyframe(time, value) {
    const existing = this.keyframes.find(kf => Math.abs(kf.time - time) < 0.001);
    if (existing) {
      existing.value = value;
    } else {
      this.keyframes.push(new Keyframe(time, value));
      this.keyframes.sort((a, b) => a.time - b.time);
    }
  }
}

export class Animation {
  constructor(name, duration) {
    this.name = name;
    this.duration = duration; // Total length of animation in seconds
    this.tracks = []; // Array of AnimationTrack
  }

  setBonePose(time, boneName, property, value, setupValue = undefined, fps = 8, isSmooth = false) {
    let track = this.tracks.find(t => t.boneName === boneName && t.property === property);
    if (!track) {
      track = new AnimationTrack(boneName, property);
      this.tracks.push(track);
      
      // Auto-insert a keyframe at time 0 to preserve the initial setup pose
      if (time > 0 && setupValue !== undefined) {
        track.addKeyframe(0, setupValue);
      }
    }

    // Auto-hold logic when smooth interpolation is inactive
    if (!isSmooth && time > 0) {
      const keys = track.keyframes;
      let lastKey = null;
      for (let i = keys.length - 1; i >= 0; i--) {
        if (keys[i].time < time - 0.001) {
          lastKey = keys[i];
          break;
        }
      }
      
      if (lastKey) {
        const frameTime = 1 / fps;
        if (time - lastKey.time > frameTime + 0.001) {
          track.addKeyframe(time - frameTime, lastKey.value);
        }
      }
    }

    track.addKeyframe(time, value);
    if (this.duration < time) this.duration = time;
  }

  addTrack(track) {
    this.tracks.push(track);
  }

  // Convert this specific animation to JSON
  toJSON() {
    return {
      name: this.name,
      duration: this.duration,
      tracks: this.tracks.map(track => ({
        boneName: track.boneName,
        property: track.property,
        keyframes: track.keyframes.map(kf => ({
          time: kf.time,
          value: kf.value
        }))
      }))
    };
  }

  exportToJSON() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  // Rebuild Animation from JSON data
  static fromJSON(jsonString) {
    const data = JSON.parse(jsonString);
    const anim = new Animation(data.name, data.duration);
    if (data.tracks) {
      data.tracks.forEach(t => {
        const track = new AnimationTrack(t.boneName, t.property);
        if (t.keyframes) {
          t.keyframes.forEach(kf => track.addKeyframe(kf.time, kf.value));
        }
        anim.addTrack(track);
      });
    }
    return anim;
  }
}
