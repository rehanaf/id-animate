export class Animator {
  constructor(skeleton) {
    this.skeleton = skeleton;
    this.currentAnimation = null;
    this.currentTime = 0;
    this.isPlaying = false;
    this.stepMode = true; // true = hold/step, false = linear interpolation
  }

  play(animation) {
    this.currentAnimation = animation;
    this.currentTime = 0;
    this.isPlaying = true;
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.currentAnimation) return;

    this.currentTime += deltaTime;
    
    // Looping animasi
    if (this.currentAnimation.duration > 0 && this.currentTime > this.currentAnimation.duration) {
      this.currentTime %= this.currentAnimation.duration;
    }

    this.applyPose(this.currentTime);
  }

  applyPose(time = this.currentTime) {
    if (!this.currentAnimation) return;
    for (const track of this.currentAnimation.tracks) {
      const bone = this.findBone(this.skeleton.root, track.boneName);
      if (bone) {
        const value = this.interpolateTrack(track, time);
        if (track.property === 'length' || track.property === 'sheetIndex') {
          bone[track.property] = value;
        } else {
          bone.localTransform[track.property] = value;
        }
      }
    }
  }

  findBone(bone, name) {
    if (bone.name === name) return bone;
    for (const child of bone.children) {
      const found = this.findBone(child, name);
      if (found) return found;
    }
    return null;
  }

  interpolateTrack(track, time) {
    const keys = track.keyframes;
    if (keys.length === 0) return 0;
    if (keys.length === 1 || time <= keys[0].time) return keys[0].value;
    if (time >= keys[keys.length - 1].time) return keys[keys.length - 1].value;

    // Step/Hold Interpolation: return most recent keyframe value
    if (this.stepMode) {
      for (let i = keys.length - 1; i >= 0; i--) {
        if (keys[i].time <= time + 0.001) return keys[i].value;
      }
      return keys[0].value;
    }

    // Cari dua keyframe yang mengapit waktu saat ini
    for (let i = 0; i < keys.length - 1; i++) {
      if (time >= keys[i].time && time < keys[i + 1].time) {
        const start = keys[i];
        const end = keys[i + 1];
        
        // Hitung rasio waktu (0.0 sampai 1.0)
        const t = (time - start.time) / (end.time - start.time);
        
        // Step/Hold Interpolation untuk properti diskrit
        if (track.property === 'sheetIndex') {
           return start.value;
        }
        
        // Interpolasi Linier (Lerp)
        return start.value + (end.value - start.value) * t;
      }
    }
    return 0;
  }
}
