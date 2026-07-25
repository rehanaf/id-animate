import { Bone } from './Bone.js';

export class Skeleton {
  constructor(name) {
    this.name = name;
    this.root = new Bone('root'); // All skeletons have a root bone
  }

  // Generate the JSON string representing the bone hierarchy
  exportToJSON() {
    const data = {
      skeletonName: this.name,
      bones: this.root.toJSON(),
      animations: {} // Later we can add animation tracks (keyframes) here
    };
    return JSON.stringify(data, null, 2); // format with 2 spaces
  }

  // Rebuild skeleton structure from JSON data
  static fromJSON(jsonString) {
    const data = JSON.parse(jsonString);
    const skeleton = new Skeleton(data.skeletonName);
    
    if (data.bones) {
      // Create root bone correctly using Bone.fromJSON
      const newRoot = Bone.fromJSON(data.bones);
      // Force root to 0, 0 to heal old corrupted saves
      newRoot.localTransform.x = 0;
      newRoot.localTransform.y = 0;
      newRoot.setupTransform.x = 0;
      newRoot.setupTransform.y = 0;
      skeleton.root = newRoot;
    }
    
    return skeleton;
  }
}
