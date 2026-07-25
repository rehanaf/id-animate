import type { Project } from "../App";
import { Skeleton } from "./Skeleton.js";
import { Animation } from "./Animation.js";
import { Animator } from "./Animator.js";

const drawPath = (ctx: CanvasRenderingContext2D, points: {x:number, y:number, isCurved?: boolean}[], isClosed: boolean, isGlobalCurved: boolean) => {
    if (points.length < 2) return;
    ctx.beginPath();
    if (!isGlobalCurved) {
      points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      if (points.length > 2) {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
      } else {
        ctx.lineTo(points[1].x, points[1].y);
      }
    }
    if (isClosed) ctx.closePath();
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // return broken image
    img.src = src;
  });
}

export const generateProjectThumbnail = async (proj: Project): Promise<string> => {
  if (!proj.data) return "";

  let skeleton: any = null;
  let anim: any = null;

  try {
    if (proj.type === "skeleton") {
      skeleton = Skeleton.fromJSON(typeof proj.data === "string" ? proj.data : JSON.stringify(proj.data));
    } else {
      if (proj.data.skeleton) {
        skeleton = Skeleton.fromJSON(typeof proj.data.skeleton === "string" ? proj.data.skeleton : JSON.stringify(proj.data.skeleton));
      }
      if (proj.data.animation) {
        anim = Animation.fromJSON(typeof proj.data.animation === "string" ? proj.data.animation : JSON.stringify(proj.data.animation));
      }
    }
  } catch(e) { return ""; }

  if (!skeleton) return "";

  if (anim) {
    const animator = new Animator(skeleton);
    animator.currentAnimation = anim;
    animator.applyPose(0); // apply frame 0
    skeleton.root.updateWorldTransform();
  } else {
    skeleton.root.updateWorldTransform();
  }

  const canvas = document.createElement("canvas");
  canvas.width = proj.canvasWidth || 800;
  canvas.height = proj.canvasHeight || 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Draw background matching editor
  ctx.fillStyle = "#1c1c24";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  const drawBone = async (bone: any) => {
    ctx.save();
    
    // 2. Draw Assets (Shapes / Images)
    ctx.save();
    ctx.translate(bone.worldTransform.x, bone.worldTransform.y);
    ctx.rotate((bone.worldTransform.rotation * Math.PI) / 180);
    ctx.scale(bone.worldTransform.scaleX, bone.worldTransform.scaleY);

    if (bone.assetType === "image" && bone.assetUrl) {
      // apply image-specific scale before drawing
      ctx.scale(bone.assetScaleX || 1, bone.assetScaleY || 1);
      if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y);
      if (bone.assetRotation) ctx.rotate((bone.assetRotation * Math.PI) / 180);
      
      const img = await loadImage(bone.assetUrl);
      if (img.width > 0) {
        ctx.globalAlpha = bone.opacity !== undefined ? bone.opacity : 1;
        ctx.drawImage(img, -bone.assetWidth/2, -bone.assetHeight/2, bone.assetWidth, bone.assetHeight);
      }
    } else if (bone.assetType === "shape" || bone.assetType === "path") {
      if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y);
      if (bone.assetRotation) ctx.rotate((bone.assetRotation * Math.PI) / 180);

      ctx.fillStyle = bone.shapeColor || "#3b82f6";
      ctx.globalAlpha = bone.opacity !== undefined ? bone.opacity : 1;
      
      const actW = bone.assetWidth;
      const actH = bone.assetHeight;
      
      if (bone.shapeType === "rect" || bone.shapeType === "square") {
        ctx.fillRect(-actW/2, -actH/2, actW, actH);
      } else if (bone.shapeType === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(actW, actH)/2, 0, Math.PI * 2);
        ctx.fill();
      } else if (bone.shapeType === "triangle") {
        ctx.beginPath();
        ctx.moveTo(0, -actH/2);
        ctx.lineTo(actW/2, actH/2);
        ctx.lineTo(-actW/2, actH/2);
        ctx.closePath();
        ctx.fill();
      } else if (bone.assetType === "path" && bone.pathPoints) {
         drawPath(ctx, bone.pathPoints, bone.shapeClosed, bone.pathIsCurved !== false);
         ctx.fill();
         if (bone.pathThickness > 0) {
           ctx.lineWidth = bone.pathThickness;
           ctx.strokeStyle = bone.shapeColor || '#3b82f6';
           ctx.lineCap = bone.pathLineCap || 'round';
           ctx.stroke();
         }
      }
    }
    ctx.restore(); // restore asset transform
    ctx.restore(); // restore bone world transform offset (if any)

    for (const child of bone.children) {
      await drawBone(child);
    }
  };

  await drawBone(skeleton.root);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.5);
}

export const generateFrameThumbnail = async (
  skeletonData: any, 
  animData: any, 
  frame: number, 
  canvasWidth: number, 
  canvasHeight: number
): Promise<string> => {
  if (!skeletonData) return "";

  let skeleton: any = null;
  let anim: any = null;

  try {
    const skelStr = typeof skeletonData === "string" ? skeletonData : 
      (typeof skeletonData.exportToJSON === "function" ? skeletonData.exportToJSON() : JSON.stringify(skeletonData));
    skeleton = Skeleton.fromJSON(skelStr);
    
    if (animData) {
      const animStr = typeof animData === "string" ? animData : 
        (typeof animData.exportToJSON === "function" ? animData.exportToJSON() : JSON.stringify(animData));
      anim = Animation.fromJSON(animStr);
    }
  } catch(e) { return ""; }

  if (!skeleton) return "";

  if (anim) {
    const animator = new Animator(skeleton);
    animator.currentAnimation = anim;
    animator.applyPose(frame);
    skeleton.root.updateWorldTransform();
  } else {
    skeleton.root.updateWorldTransform();
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth || 800;
  canvas.height = canvasHeight || 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#1c1c24";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  const drawBone = async (bone: any) => {
    ctx.save();
    ctx.save();
    ctx.translate(bone.worldTransform.x, bone.worldTransform.y);
    ctx.rotate((bone.worldTransform.rotation * Math.PI) / 180);
    ctx.scale(bone.worldTransform.scaleX, bone.worldTransform.scaleY);

    if (bone.assetType === "image" && bone.assetUrl) {
      ctx.scale(bone.assetScaleX || 1, bone.assetScaleY || 1);
      if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y);
      if (bone.assetRotation) ctx.rotate((bone.assetRotation * Math.PI) / 180);
      
      const img = await loadImage(bone.assetUrl);
      if (img.width > 0) {
        ctx.globalAlpha = bone.opacity !== undefined ? bone.opacity : 1;
        ctx.drawImage(img, -bone.assetWidth/2, -bone.assetHeight/2, bone.assetWidth, bone.assetHeight);
      }
    } else if (bone.assetType === "shape" || bone.assetType === "path") {
      if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y);
      if (bone.assetRotation) ctx.rotate((bone.assetRotation * Math.PI) / 180);

      ctx.fillStyle = bone.shapeColor || "#3b82f6";
      ctx.globalAlpha = bone.opacity !== undefined ? bone.opacity : 1;
      
      const actW = bone.assetWidth;
      const actH = bone.assetHeight;
      
      if (bone.shapeType === "rect" || bone.shapeType === "square") {
        ctx.fillRect(-actW/2, -actH/2, actW, actH);
      } else if (bone.shapeType === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(actW, actH)/2, 0, Math.PI * 2);
        ctx.fill();
      } else if (bone.shapeType === "triangle") {
        ctx.beginPath();
        ctx.moveTo(0, -actH/2);
        ctx.lineTo(actW/2, actH/2);
        ctx.lineTo(-actW/2, actH/2);
        ctx.closePath();
        ctx.fill();
      } else if (bone.assetType === "path" && bone.pathPoints) {
         drawPath(ctx, bone.pathPoints, bone.shapeClosed, bone.pathIsCurved !== false);
         ctx.fill();
         if (bone.pathThickness > 0) {
           ctx.lineWidth = bone.pathThickness;
           ctx.strokeStyle = bone.shapeColor || '#3b82f6';
           ctx.lineCap = bone.pathLineCap || 'round';
           ctx.stroke();
         }
      }
    }
    ctx.restore();
    ctx.restore();

    for (const child of bone.children) {
      await drawBone(child);
    }
  };

  await drawBone(skeleton.root);
  ctx.restore();

  // Draw frame number overlay for clarity? Optional.
  // We won't do it so the preview is clean.
  
  return canvas.toDataURL("image/jpeg", 0.5);
}
