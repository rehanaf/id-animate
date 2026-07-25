import { Transform } from './Transform.js';

export class Bone {
  constructor(name) {
    this.name = name;
    this.id = 'bone_' + Math.random().toString(36).substr(2, 9);
    
    // Setup transform (Default Rig Pose)
    this.setupTransform = new Transform();
    
    // Local transform (relative to parent, used for active rendering)
    this.localTransform = new Transform();
    
    // Posisi pergeseran (offset) untuk gambar/aset agar pas dengan engsel
    this.assetOffset = { x: 0, y: 0 };
    
    // Properti khusus untuk gambar/sprite/shape
    this.assetType = 'image'; // 'image' or 'shape'
    this.shapeType = 'rect'; // 'rect' or 'circle'
    this.shapeColor = '#ff0000';
    this.assetUrl = null; 
    this.assetData = null; // Base64 image data
    this.assetWidth = 100;
    this.assetHeight = 100;
    this.assetScaleX = 1.0;
    this.assetScaleY = 1.0;
    this.assetRotation = 0;
    this.imageObj = null; // Objek Image HTML5
    
    // Properti Sprite Sheet
    this.sheetFrames = []; // Array of base64 strings
    this.sheetImageObjs = []; // Array of Image objects
    this.sheetIndex = 0; // Current active frame

    // We update this based on parent's world transform (calculated absolute position on screen)
    // We update this based on parent's world transform
    this.worldTransform = new Transform();
    
    this.worldTransform = new Transform();
    
    this.length = 0;
    
    this.parent = null;
    this.children = [];
  }

  // Save current localTransform to setupTransform
  saveSetupPose() {
    this.setupTransform = this.localTransform.clone();
    for (const child of this.children) {
      child.saveSetupPose();
    }
  }

  // Restore localTransform from setupTransform
  restoreSetupPose() {
    this.localTransform = this.setupTransform.clone();
    for (const child of this.children) {
      child.restoreSetupPose();
    }
  }

  // Add a child bone
  addChild(childBone) {
    childBone.parent = this;
    this.children.push(childBone);
  }

  // Calculate world transform recursively based on parent
  updateWorldTransform() {
    if (this.parent) {
      // Mengubah rotasi parent menjadi radian
      const angle = this.parent.worldTransform.rotation * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Memutar posisi lokal (x, y) anak mengitari sumbu parent
      const rx = (this.localTransform.x * cos - this.localTransform.y * sin) * this.parent.worldTransform.scaleX;
      const ry = (this.localTransform.x * sin + this.localTransform.y * cos) * this.parent.worldTransform.scaleY;

      this.worldTransform.x = this.parent.worldTransform.x + rx;
      this.worldTransform.y = this.parent.worldTransform.y + ry;
      this.worldTransform.rotation = this.parent.worldTransform.rotation + this.localTransform.rotation;
      this.worldTransform.scaleX = this.parent.worldTransform.scaleX * this.localTransform.scaleX;
      this.worldTransform.scaleY = this.parent.worldTransform.scaleY * this.localTransform.scaleY;
    } else {
      // If root bone, world is same as local
      this.worldTransform = this.localTransform.clone();
    }

    // Update all children recursively
    for (const child of this.children) {
      child.updateWorldTransform();
    }
  }

  // Serialize just the bone structure (not animation yet) to JSON format
  toJSON() {
    return {
      name: this.name,
      x: this.setupTransform.x,
      y: this.setupTransform.y,
      rotation: this.setupTransform.rotation,
      scaleX: this.setupTransform.scaleX,
      scaleY: this.setupTransform.scaleY,
      length: this.length,
      assetOffset: { x: this.assetOffset.x, y: this.assetOffset.y },
      zIndex: this.zIndex,
      assetType: this.assetType,
      shapeType: this.shapeType,
      shapeColor: this.shapeColor,
      shapeClosed: this.shapeClosed,
      shapeOpacity: this.shapeOpacity,
      pathStyle: this.pathStyle,
      pathGradient: this.pathGradient,
      pathGradientColor: this.pathGradientColor,
      pathLineCap: this.pathLineCap,
      pathThickness: this.pathThickness,
      pathPoints: this.pathPoints,
      pathIsCurved: this.pathIsCurved,
      assetUrl: this.assetUrl,
      assetData: this.assetData,
      assetWidth: this.assetWidth,
      assetHeight: this.assetHeight,
      assetScaleX: this.assetScaleX,
      assetScaleY: this.assetScaleY,
      assetRotation: this.assetRotation || 0,
      sheetFrames: this.sheetFrames,
      sheetIndex: this.sheetIndex,
      children: this.children.map(child => child.toJSON()) // recursive serialization
    };
  }
  
  static fromJSON(data) {
    const bone = new Bone(data.name);
    bone.setupTransform.x = data.x || 0;
    bone.setupTransform.y = data.y || 0;
    bone.setupTransform.rotation = data.rotation || 0;
    bone.setupTransform.scaleX = data.scaleX !== undefined ? data.scaleX : 1;
    bone.setupTransform.scaleY = data.scaleY !== undefined ? data.scaleY : 1;
    
    // Sync localTransform to setupTransform initially
    bone.localTransform = bone.setupTransform.clone();
    
    bone.length = data.length || 0;
    
    if (data.assetOffset) {
      bone.assetOffset.x = data.assetOffset.x;
      bone.assetOffset.y = data.assetOffset.y;
    }
    
    bone.zIndex = data.zIndex || 0;
    bone.assetType = data.assetType || 'image';
    bone.shapeType = data.shapeType || 'rect';
    bone.shapeColor = data.shapeColor || '#ff0000';
    bone.shapeOpacity = data.shapeOpacity !== undefined ? data.shapeOpacity : 100;
    bone.shapeClosed = data.shapeClosed !== undefined ? data.shapeClosed : true;
    bone.pathStyle = data.pathStyle || 'solid';
    bone.pathGradient = data.pathGradient || null;
    bone.pathGradientColor = data.pathGradientColor || '#000000';
    bone.pathLineCap = data.pathLineCap || 'round';
    bone.pathThickness = data.pathThickness || 3;
    bone.pathPoints = data.pathPoints || [];
    bone.pathIsCurved = data.pathIsCurved !== undefined ? data.pathIsCurved : true;
    
    if (data.assetUrl) {
      bone.assetUrl = data.assetUrl;
    }
    if (data.assetData) {
      bone.assetData = data.assetData;
    }
    bone.assetWidth = data.assetWidth || 100;
    bone.assetHeight = data.assetHeight || 100;

    if (bone.assetUrl || bone.assetData) {
      bone.imageObj = new Image();
      // Wait, we need the base64 or path. Assuming assetUrl is a base64 or path
      const src = bone.assetData || bone.assetUrl;
      if (src.startsWith('data:')) {
         bone.imageObj.src = src;
      } else {
         bone.imageObj.src = '/assets/' + src; // fallback
      }
    }
    
    bone.assetScaleX = data.assetScaleX !== undefined ? data.assetScaleX : 1.0;
    bone.assetScaleY = data.assetScaleY !== undefined ? data.assetScaleY : 1.0;
    bone.assetRotation = data.assetRotation || 0;
    
    bone.sheetIndex = data.sheetIndex || 0;
    if (data.sheetFrames) {
       bone.sheetFrames = data.sheetFrames;
       bone.sheetImageObjs = bone.sheetFrames.map(base64 => {
          const img = new Image();
          img.src = base64;
          return img;
       });
    }
    
    if (data.children) {
      data.children.forEach(childData => {
        const childBone = Bone.fromJSON(childData);
        bone.addChild(childBone);
      });
    }
    
    return bone;
  }
}
