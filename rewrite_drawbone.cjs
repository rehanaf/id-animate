const fs = require('fs');

const path = 'src/components/editor/CanvasArea.tsx';
let content = fs.readFileSync(path, 'utf8');

const drawBoneRegex = /const drawBone = \(bone: any, onionMode: "none" \| "prev" \| "next" = "none"\) => \{[\s\S]*?bone\.children\.forEach\(\(c: any\) => drawBone\(c, onionMode\)\)\n\s*\}/;

const replacement = `const drawBoneAssets = (bone: any, onionMode: "none" | "prev" | "next" = "none") => {
        // Calculate actual dimensions handling 'auto'
        let actW = 100;
        let actH = 100;
        if (bone.assetType === "image" && bone.imageObj && bone.imageObj.complete) {
          const natW = bone.imageObj.width;
          const natH = bone.imageObj.height;
          const ratio = natW / natH;
          if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
            actW = 100; actH = 100 / ratio;
          } else if (bone.assetWidth === "auto") {
            actH = Number(bone.assetHeight); actW = actH * ratio;
          } else if (bone.assetHeight === "auto") {
            actW = Number(bone.assetWidth); actH = actW / ratio;
          } else {
            actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100);
          }
        } else {
          if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
            actW = 100; actH = 100;
          } else if (bone.assetWidth === "auto") {
            actH = Number(bone.assetHeight); actW = actH;
          } else if (bone.assetHeight === "auto") {
            actW = Number(bone.assetWidth); actH = actW;
          } else {
            actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100);
          }
        }

        // Draw Asset/Shape if attached
        if (bone.assetType === "image") {
          ctx.save()
          if (onionMode !== "none") ctx.globalAlpha = 0.3
          ctx.translate(bone.worldTransform.x, bone.worldTransform.y)
          ctx.rotate(bone.worldTransform.rotation * Math.PI / 180)
          ctx.scale(bone.worldTransform.scaleX * (bone.assetScaleX || 1), bone.worldTransform.scaleY * (bone.assetScaleY || 1))
          
          if (bone.imageObj && bone.imageObj.complete) {
            ctx.drawImage(bone.imageObj, -actW / 2, -actH / 2, actW, actH)
          }
          ctx.restore()
        } else if (bone.assetType === "shape") {
          ctx.save()
          if (onionMode !== "none") ctx.globalAlpha = 0.3
          
          ctx.translate(bone.worldTransform.x, bone.worldTransform.y)
          ctx.rotate(bone.worldTransform.rotation * Math.PI / 180)
          ctx.scale(bone.worldTransform.scaleX, bone.worldTransform.scaleY)
          
          ctx.fillStyle = bone.shapeColor || "#3b82f6"
          
          if (bone.shapeType === "rect" || bone.shapeType === "square") {
            ctx.fillRect(-actW/2, -actH/2, actW, actH)
          } else if (bone.shapeType === "circle") {
            ctx.beginPath()
            ctx.arc(0, 0, Math.max(actW, actH)/2, 0, Math.PI * 2)
            ctx.fill()
          } else if (bone.shapeType === "triangle") {
            ctx.beginPath()
            ctx.moveTo(0, -actH/2)
            ctx.lineTo(actW/2, actH/2)
            ctx.lineTo(-actW/2, actH/2)
            ctx.closePath()
            ctx.fill()
          } else if (bone.shapeType === "path" && bone.pathPoints) {
            drawPath(ctx, bone.pathPoints, bone.shapeClosed, bone.pathIsCurved !== false)
            ctx.fill()
            if (bone.pathThickness > 0) {
              ctx.lineWidth = bone.pathThickness
              ctx.strokeStyle = bone.shapeColor || '#3b82f6'
              ctx.lineCap = (bone.pathLineCap as CanvasLineCap) || 'round'
              ctx.stroke()
            }
          }
          ctx.restore()
        }
        
        bone.children.forEach((c: any) => drawBoneAssets(c, onionMode))
      }

      const drawBoneRig = (bone: any, onionMode: "none" | "prev" | "next" = "none") => {
        const isSelected = bone.id === selectedBoneIdRef.current && onionMode === "none"

        if (bone.name === 'root') {
          // Do not draw root joint or lines, just its children
          bone.children.forEach((c: any) => drawBoneRig(c, onionMode))
          return
        }

        // Hide joints and lines if playing or if drawing onion skin
        if (!isPlayingRef.current && onionMode === "none") {
          // Draw connection line to parent (only if parent is not root)
          const z = cameraRef.current.zoom
          if (bone.parent && bone.parent.name !== 'root') {
            ctx.beginPath()
            ctx.moveTo(bone.parent.worldTransform.x, bone.parent.worldTransform.y)
            ctx.lineTo(bone.worldTransform.x, bone.worldTransform.y)
            ctx.strokeStyle = isSelected ? "rgba(59, 130, 246, 0.9)" : "rgba(255, 255, 255, 0.4)"
            ctx.lineWidth = (isSelected ? 5 : 3) / z
            ctx.stroke()
          }
          
          ctx.beginPath()
          ctx.arc(bone.worldTransform.x, bone.worldTransform.y, (isSelected ? 6 : 4) / z, 0, Math.PI * 2)
          
          const isRootChild = bone.parent && bone.parent.name === 'root'
          ctx.fillStyle = isSelected ? "#facc15" : (isRootChild ? "#f97316" : "white") 
          
          if (isSelected) {
            ctx.lineWidth = 2 / z
            ctx.strokeStyle = "#ffffff"
            ctx.stroke()
          }
          ctx.fill()
          
          // Draw Tail for bones with no children (including shapes so they can be rotated!)
          if (bone.children.length === 0) {
            const rad = bone.worldTransform.rotation * Math.PI / 180
            const tailX = bone.worldTransform.x + Math.sin(rad) * 50
            const tailY = bone.worldTransform.y - Math.cos(rad) * 50
            bone.tailWorld = { x: tailX, y: tailY }
            
            ctx.beginPath()
            ctx.moveTo(bone.worldTransform.x, bone.worldTransform.y)
            ctx.lineTo(tailX, tailY)
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
            ctx.lineWidth = 2 / z
            ctx.stroke()
            
            // Draw tail knob
            ctx.beginPath()
            ctx.arc(tailX, tailY, 4 / z, 0, Math.PI * 2)
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
            ctx.fill()
          }
        } else {
          // Update tail world position silently for hit detection even if hidden
          if (bone.children.length === 0) {
            const rad = bone.worldTransform.rotation * Math.PI / 180
            bone.tailWorld = { 
              x: bone.worldTransform.x + Math.cos(rad) * 50, 
              y: bone.worldTransform.y + Math.sin(rad) * 50 
            }
          }
        }
        
        bone.children.forEach((c: any) => drawBoneRig(c, onionMode))
      }`;

content = content.replace(drawBoneRegex, replacement);

content = content.replace(/drawBone\(currentSkel\.root, "prev"\)/g, 'drawBoneAssets(currentSkel.root, "prev");\n          drawBoneRig(currentSkel.root, "prev")');
content = content.replace(/drawBone\(currentSkel\.root, "next"\)/g, 'drawBoneAssets(currentSkel.root, "next");\n          drawBoneRig(currentSkel.root, "next")');
content = content.replace(/drawBone\(currentSkel\.root, "none"\)/g, 'drawBoneAssets(currentSkel.root, "none");\n        drawBoneRig(currentSkel.root, "none")');

fs.writeFileSync(path, content);
console.log("Success");
