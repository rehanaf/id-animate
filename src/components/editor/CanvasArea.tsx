import React, { useRef, useEffect } from "react"
import { useEditor } from "@/context/EditorContext"
import { Skeleton } from "@/core/Skeleton.js"
import { Bone } from "@/core/Bone.js"
import { Animator } from "@/core/Animator.js"

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { skeleton, setSkeleton, selectedBoneId, setSelectedBoneId, isPlaying, setIsPlaying, editorMode, currentAnimation, currentTime, setCurrentTime, duration, activeTool, selectMode, activeShape, pushHistory, canvasWidth, canvasHeight, fps, onionPrev, onionNext, forceUpdate, smoothInterpolation } = useEditor()
  
  // High-frequency drag state via Ref to avoid render stuttering
  const dragState = useRef({ isDragging: false, bone: null as any, isTail: false, isAssetDrag: false, isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0, startX: 0, startY: 0, startLocalX: 0, startLocalY: 0, startAssetOffX: 0, startAssetOffY: 0 })
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 })
  const penPointsRef = useRef<{x: number, y: number, isCurved: boolean}[]>([])
  const penMousePosRef = useRef<{x: number, y: number} | null>(null)
  
  // Track pen dragging state to detect swipe vs click
  const penDragState = useRef({ isDragging: false, pointIndex: -1, startX: 0, startY: 0, isNewPoint: false })
  const meshDragState = useRef({ isDragging: false, bone: null as any, pointIndex: -1, startX: 0, startY: 0, startW: 0, startH: 0, startLocalX: 0, startLocalY: 0, startPathPoints: [] as any[], startAssetRot: 0, startAssetOffX: 0, startAssetOffY: 0 })
  const pathDragState = useRef({ isDragging: false, bone: null as any, pointIndex: -1, startX: 0, startY: 0, startNodeX: 0, startNodeY: 0 })
  const shapeCreateState = useRef({ isCreating: false, bone: null as any, startX: 0, startY: 0 })
  
  // Touch Pointers for Pinch to Zoom
  const activePointersRef = useRef(new Map<number, {x: number, y: number}>())
  const initialPinchDistRef = useRef<number | null>(null)
  const initialPinchCamRef = useRef<{zoom: number, x: number, y: number} | null>(null)
  
  const activeToolRef = useRef(activeTool)
  const activeShapeRef = useRef(activeShape)
  // activeToolRef is now updated further down after createPathBone
  
  // Ref to hold the latest selectedBoneId for the animation loop
  const selectedBoneIdRef = useRef(selectedBoneId)
  useEffect(() => {
    selectedBoneIdRef.current = selectedBoneId
  }, [selectedBoneId])

  const drawPath = (ctx: CanvasRenderingContext2D, points: {x:number, y:number, isCurved?: boolean}[], isClosed: boolean, isGlobalCurved: boolean) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    
    // If globally not curved, override all to straight
    if (!isGlobalCurved) {
      points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      if (isClosed) ctx.closePath();
      return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    const tension = 1.0; // Smooth tension
    
    const segments = isClosed ? points.length : points.length - 1;
    const len = points.length;
    
    for (let i = 0; i < segments; i++) {
      const p0 = points[(i - 1 + len) % len];
      const p1 = points[i % len];
      const p2 = points[(i + 1) % len];
      const p3 = points[(i + 2) % len];
      
      const realP0 = (!isClosed && i === 0) ? p1 : p0;
      const realP3 = (!isClosed && i === segments - 1) ? p2 : p3;

      const p1Curved = p1.isCurved !== false;
      const p2Curved = p2.isCurved !== false;

      const cp1x = p1Curved ? p1.x + (p2.x - realP0.x) / 6 * tension : p1.x;
      const cp1y = p1Curved ? p1.y + (p2.y - realP0.y) / 6 * tension : p1.y;

      const cp2x = p2Curved ? p2.x - (realP3.x - p1.x) / 6 * tension : p2.x;
      const cp2y = p2Curved ? p2.y - (realP3.y - p1.y) / 6 * tension : p2.y;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  // Handle Zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const zoomDelta = 1 - (e.deltaY * zoomSensitivity);
      
      const newZoom = Math.max(0.1, Math.min(cameraRef.current.zoom * zoomDelta, 10));
      const zoomFactor = newZoom / cameraRef.current.zoom;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cx = rect.width / 2;
      const cy = rect.height / 2 + 100;
      
      cameraRef.current.x = mouseX - cx - (mouseX - cx - cameraRef.current.x) * zoomFactor;
      cameraRef.current.y = mouseY - cy - (mouseY - cy - cameraRef.current.y) * zoomFactor;
      cameraRef.current.zoom = newZoom;
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const currentTimeRef = useRef(currentTime)
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const currentAnimationRef = useRef(currentAnimation)
  useEffect(() => {
    currentAnimationRef.current = currentAnimation
  }, [currentAnimation])
  
  const skeletonRef = useRef(skeleton)
  useEffect(() => {
    skeletonRef.current = skeleton
  }, [skeleton])
  
  const editorModeRef = useRef(editorMode)
  useEffect(() => {
    editorModeRef.current = editorMode
  }, [editorMode])

  const selectModeRef = useRef(selectMode)
  useEffect(() => {
    selectModeRef.current = selectMode
  }, [selectMode])

  const durationRef = useRef(duration)
  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  const fpsRef = useRef(fps)
  useEffect(() => {
    fpsRef.current = fps
  }, [fps])

  const onionPrevRef = useRef(onionPrev)
  useEffect(() => {
    onionPrevRef.current = onionPrev
  }, [onionPrev])

  const onionNextRef = useRef(onionNext)
  useEffect(() => {
    onionNextRef.current = onionNext
  }, [onionNext])

  const smoothInterpRef = useRef(smoothInterpolation)
  useEffect(() => {
    smoothInterpRef.current = smoothInterpolation
  }, [smoothInterpolation])

  useEffect(() => {
    let animFrame: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Listen for fit-to-screen request
    const handleResetCamera = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cw = canvasWidth || 800
      const ch = canvasHeight || 600
      
      // Dynamic padding: use less padding on smaller screens
      const paddingW = rect.width < 500 ? 20 : 40
      const paddingH = rect.height < 500 ? 100 : 240
      
      const availableW = Math.max(100, rect.width - paddingW)
      const availableH = Math.max(100, rect.height - paddingH)
      
      const fitZoom = Math.min(availableW / cw, availableH / ch)
      // Enforce a minimum zoom of 35% (0.35) so it doesn't become microscopic, and cap at 100% (1.0) on desktop
      const finalZoom = Math.max(0.35, fitZoom < 1.0 ? fitZoom : 1.0)
      
      cameraRef.current = {
        x: 0,
        y: rect.height < 500 ? -50 : -100, // offset vertically to center above the timeline
        zoom: Number(finalZoom.toFixed(2))
      }
    }
    window.addEventListener("reset-camera", handleResetCamera)

    // Listen for zoom buttons (+/-)
    const handleZoomStep = (e: any) => {
      const step = e.detail; // 1 for +, -1 for -
      let currentPct = cameraRef.current.zoom * 100;
      let nextPct;
      if (step > 0) {
        nextPct = Math.ceil((currentPct + 1) / 5) * 5; 
      } else {
        nextPct = Math.floor((currentPct - 1) / 5) * 5;
      }
      nextPct = Math.max(5, Math.min(nextPct, 1000));
      cameraRef.current.zoom = nextPct / 100;
    }
    window.addEventListener("zoom-step", handleZoomStep)

    // Global failsafe for pointer release to prevent sticky drags
    const handleGlobalPointerUp = () => {
      dragState.current.isDragging = false
      dragState.current.bone = null
      dragState.current.isTail = false
      penDragState.current.isDragging = false
      meshDragState.current.isDragging = false
      pathDragState.current.isDragging = false
      dragState.current.isPanning = false
      activePointersRef.current.clear()
    }
    window.addEventListener("pointerup", handleGlobalPointerUp)
    window.addEventListener("pointercancel", handleGlobalPointerUp)

    let animationId: number
    let lastTime = performance.now()
    let animator = new Animator(skeleton)
    
    const render = (now: number) => {
      animationId = requestAnimationFrame(render)

      const currentSkel = skeletonRef.current
      if (!currentSkel) return

      animator.skeleton = currentSkel

      const dt = (now - lastTime) / 1000 // delta in seconds
      lastTime = now

      // Animation Logic
      if (currentAnimationRef.current && editorModeRef.current === "animate") {
        animator.currentAnimation = currentAnimationRef.current
        
        if (isPlayingRef.current) {
          let newTime = currentTimeRef.current + dt
          if (durationRef.current > 0) {
             if (newTime > durationRef.current) {
                newTime %= durationRef.current
             }
          } else {
             newTime = 0
          }
          setCurrentTime(newTime)
          if (!dragState.current.isDragging) {
            animator.applyPose(newTime)
          }
        } else {
          if (!dragState.current.isDragging) {
            animator.applyPose(currentTimeRef.current)
          }
        }
      } else if (editorModeRef.current === "rig") {
        if (!dragState.current.isDragging) {
          currentSkel.root.restoreSetupPose()
        }
      }

      // If we are dragging in animate mode, we don't want the pose application to OVERRIDE our drag!
      // But applyPose runs before dragging calculation in the same frame? No, dragging is event based.
      // So if applyPose is called, it might snap the bone back while dragging.
      // We should only apply pose if NOT dragging!
      if (!dragState.current.isDragging) {
        currentSkel.root.updateWorldTransform()
      }

      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1;
      const expectedWidth = Math.round(rect.width * dpr);
      const expectedHeight = Math.round(rect.height * dpr);

      // Auto-resize canvas if bounds or DPI changed
      if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
      }
      
      // Reset transform every frame to prevent stacking, then apply DPR scale
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      // Base canvas background
      ctx.clearRect(0, 0, rect.width, rect.height)
      
      // Update UI zoom indicator without triggering React re-renders
      const zoomIndicator = document.getElementById("zoom-indicator")
      if (zoomIndicator) {
        zoomIndicator.innerText = Math.round(cameraRef.current.zoom * 100) + "%"
      }

      // Setup camera matrix
      ctx.save()
      ctx.translate(rect.width / 2 + cameraRef.current.x, rect.height / 2 + 100 + cameraRef.current.y)
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom)

      // --- Draw Artboard (Canvas Bounds) ---
      const cw = canvasWidth || 800
      const ch = canvasHeight || 600

      // Draw canvas bounds
      ctx.fillStyle = "#1e1e1e" // slightly different from app background
      ctx.fillRect(-cw/2, -ch/2, cw, ch)
      
      // Draw Grid & Axes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"
      ctx.lineWidth = 1
      const gridSize = 50
      ctx.beginPath()
      for (let x = -cw/2; x <= cw/2; x += gridSize) {
        ctx.moveTo(x, -ch/2)
        ctx.lineTo(x, ch/2)
      }
      for (let y = -ch/2; y <= ch/2; y += gridSize) {
        ctx.moveTo(-cw/2, y)
        ctx.lineTo(cw/2, y)
      }
      ctx.stroke()
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.beginPath()
      ctx.moveTo(-cw/2, 0)
      ctx.lineTo(cw/2, 0)
      ctx.moveTo(0, -ch/2)
      ctx.lineTo(0, ch/2)
      ctx.stroke()

      // Origin Point (0,0)
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      // -------------------------

      const drawSingleBoneAsset = (bone: any, onionMode: "none" | "prev" | "next" = "none") => {
        if (bone.hidden) return;

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

        // Helper to parse gradient string from react-best-gradient-color-picker
        const applyFillStyle = (context: CanvasRenderingContext2D, colorStr: string, actW: number, actH: number) => {
          if (!colorStr) {
            context.fillStyle = "#d1d5db";
            return;
          }
          if (colorStr.includes('linear-gradient')) {
            try {
              const match = colorStr.match(/linear-gradient\((.*)\)/);
              if (match) {
                // Split by comma, but ignore commas inside parentheses (like in rgba)
                const parts = match[1].split(/,(?![^(]*\))/);
                let angle = 180; // default to bottom
                let stopsStart = 0;
                
                const firstPart = parts[0].trim();
                if (firstPart.endsWith('deg')) {
                  angle = parseFloat(firstPart);
                  stopsStart = 1;
                } else if (firstPart.startsWith('to ')) {
                  stopsStart = 1;
                }

                // Calculate gradient coordinates based on angle
                const rad = (angle - 90) * (Math.PI / 180);
                const halfW = actW / 2;
                const halfH = actH / 2;
                const x1 = -Math.cos(rad) * halfW;
                const y1 = -Math.sin(rad) * halfH;
                const x2 = Math.cos(rad) * halfW;
                const y2 = Math.sin(rad) * halfH;

                const grad = context.createLinearGradient(x1, y1, x2, y2);

                for (let i = stopsStart; i < parts.length; i++) {
                  const stopStr = parts[i].trim();
                  const lastSpace = stopStr.lastIndexOf(' ');
                  if (lastSpace !== -1) {
                    const color = stopStr.substring(0, lastSpace).trim();
                    const pctStr = stopStr.substring(lastSpace).trim();
                    const pct = parseFloat(pctStr) / 100;
                    if (!isNaN(pct)) grad.addColorStop(pct, color);
                  } else {
                    grad.addColorStop(i === stopsStart ? 0 : 1, stopStr);
                  }
                }
                context.fillStyle = grad;
                return;
              }
            } catch (e) { console.warn("Failed to parse linear gradient", e) }
          } else if (colorStr.includes('radial-gradient')) {
            try {
              const match = colorStr.match(/radial-gradient\((.*)\)/);
              if (match) {
                const parts = match[1].split(/,(?![^(]*\))/);
                const stopsStart = parts[0].includes('circle') || parts[0].includes('at ') ? 1 : 0;
                const radius = Math.max(actW, actH) / 2;
                const grad = context.createRadialGradient(0, 0, 0, 0, 0, radius);
                for (let i = stopsStart; i < parts.length; i++) {
                  const stopStr = parts[i].trim();
                  const lastSpace = stopStr.lastIndexOf(' ');
                  if (lastSpace !== -1) {
                    const color = stopStr.substring(0, lastSpace).trim();
                    const pctStr = stopStr.substring(lastSpace).trim();
                    const pct = parseFloat(pctStr) / 100;
                    if (!isNaN(pct)) grad.addColorStop(pct, color);
                  } else {
                    grad.addColorStop(i === stopsStart ? 0 : 1, stopStr);
                  }
                }
                context.fillStyle = grad;
                return;
              }
            } catch (e) { console.warn("Failed to parse radial gradient", e) }
          }
          
          context.fillStyle = colorStr;
        };

        const applyShadow = (context: CanvasRenderingContext2D, b: any) => {
          if (b.shadowEnabled) {
            context.shadowColor = b.shadowColor || '#000000';
            context.shadowBlur = b.shadowBlur || 0;
            context.shadowOffsetX = b.shadowOffsetX || 0;
            context.shadowOffsetY = b.shadowOffsetY || 0;
          } else {
            context.shadowColor = 'transparent';
          }
        };

        const drawStroke = (context: CanvasRenderingContext2D, b: any) => {
          if (b.strokeEnabled && b.strokeWidth > 0) {
            context.shadowColor = 'transparent'; // prevent shadow on stroke if already applied to fill
            context.lineWidth = b.strokeWidth;
            context.strokeStyle = b.strokeColor || '#000000';
            context.stroke();
          }
        };

        // Draw Asset/Shape if attached
        if (bone.assetType === "image") {
          ctx.save()
          if (onionMode !== "none") ctx.globalAlpha = 0.3
          ctx.translate(bone.worldTransform.x, bone.worldTransform.y)
          ctx.rotate(bone.worldTransform.rotation * Math.PI / 180)
          ctx.scale(bone.worldTransform.scaleX * (bone.assetScaleX || 1), bone.worldTransform.scaleY * (bone.assetScaleY || 1))
          
          if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y)
          if (bone.assetRotation) ctx.rotate(bone.assetRotation * Math.PI / 180)
          
          applyShadow(ctx, bone);

          if (bone.imageObj && bone.imageObj.complete) {
            ctx.drawImage(bone.imageObj, -actW / 2, -actH / 2, actW, actH)
            drawStroke(ctx, bone);
          }
          ctx.restore()
        } else if (bone.assetType === "shape" || bone.assetType === "path") {
          ctx.save()
          if (onionMode !== "none") ctx.globalAlpha = 0.3
          
          ctx.translate(bone.worldTransform.x, bone.worldTransform.y)
          ctx.rotate(bone.worldTransform.rotation * Math.PI / 180)
          ctx.scale(bone.worldTransform.scaleX, bone.worldTransform.scaleY)
          
          if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y)
          if (bone.assetRotation) ctx.rotate(bone.assetRotation * Math.PI / 180)
          
          applyFillStyle(ctx, bone.shapeColor || "#d1d5db", actW, actH);
          applyShadow(ctx, bone);
          
          if (bone.assetType === "path") {
            if (bone.pathPoints) {
              drawPath(ctx, bone.pathPoints, bone.shapeClosed, bone.pathIsCurved !== false)
              ctx.fill()
              
              // Path has its own pathThickness which acts as main stroke or outline
              if (bone.pathThickness > 0) {
                ctx.shadowColor = 'transparent';
                ctx.lineWidth = bone.pathThickness
                // Path stroke color defaults to shapeColor if not provided, or a separate color
                ctx.strokeStyle = bone.strokeEnabled ? bone.strokeColor : (bone.shapeColor || '#d1d5db')
                ctx.lineCap = (bone.pathLineCap as CanvasLineCap) || 'round'
                ctx.stroke()
              } else {
                 drawStroke(ctx, bone);
              }
            }
          } else if (bone.shapeType === "rect" || bone.shapeType === "square") {
            ctx.fillRect(-actW/2, -actH/2, actW, actH)
            drawStroke(ctx, bone)
          } else if (bone.shapeType === "circle") {
            ctx.beginPath()
            ctx.arc(0, 0, Math.max(actW, actH)/2, 0, Math.PI * 2)
            ctx.fill()
            drawStroke(ctx, bone)
          } else if (bone.shapeType === "triangle") {
            ctx.beginPath()
            ctx.moveTo(0, -actH/2)
            ctx.lineTo(actW/2, actH/2)
            ctx.lineTo(-actW/2, actH/2)
            ctx.closePath()
            ctx.fill()
            drawStroke(ctx, bone)
          }
          ctx.restore()
        }
      }

      const drawBoneAssets = (rootBone: any, onionMode: "none" | "prev" | "next" = "none") => {
        const flatBones: any[] = []
        const flatten = (b: any) => {
          if (!b.hidden) {
            flatBones.push(b)
            b.children.forEach(flatten)
          }
        }
        flatten(rootBone)
        flatBones.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        flatBones.forEach(b => drawSingleBoneAsset(b, onionMode))
      }

      const drawBoneRig = (rootBone: any, onionMode: "none" | "prev" | "next" = "none") => {
        // Collect all visible bones recursively
        const flatBones: any[] = []
        const collect = (b: any) => {
          if (!b.hidden) {
            flatBones.push(b)
            b.children.forEach(collect)
          }
        }
        collect(rootBone)

        const z = cameraRef.current.zoom
        const isSelectOrEdit = activeToolRef.current === "select" || activeToolRef.current === "edit_mesh" || activeToolRef.current === "edit"

        // 1. First Pass: Draw all connection lines (so they are drawn underneath all dots)
        if (!isPlayingRef.current && onionMode === "none" && isSelectOrEdit) {
          flatBones.forEach(bone => {
            if (bone.name === 'root') return;
            const isSelected = bone.id === selectedBoneIdRef.current

            // Draw connection line to parent (only if parent is not root)
            if (bone.parent && bone.parent.name !== 'root') {
              ctx.beginPath()
              ctx.moveTo(bone.parent.worldTransform.x, bone.parent.worldTransform.y)
              ctx.lineTo(bone.worldTransform.x, bone.worldTransform.y)
              ctx.strokeStyle = "rgba(14, 165, 233, 0.6)"
              ctx.lineWidth = 3 / z
              ctx.stroke()
            }

            // Tail line for leaf bones
            if (bone.children.length === 0) {
              const rad = bone.worldTransform.rotation * Math.PI / 180
              const tailX = bone.worldTransform.x + Math.sin(rad) * 50
              const tailY = bone.worldTransform.y - Math.cos(rad) * 50
              bone.tailWorld = { x: tailX, y: tailY }

              if (bone.tailWorld && activeToolRef.current === "select") {
                ctx.beginPath()
                ctx.moveTo(bone.worldTransform.x, bone.worldTransform.y)
                ctx.lineTo(bone.tailWorld.x, bone.tailWorld.y)
                ctx.strokeStyle = "rgba(14, 165, 233, 0.6)"
                ctx.lineWidth = 3 / z
                ctx.stroke()
              }
            }
          })
        } else {
          // Update tail world positions silently for physics/hits when hidden or playing
          flatBones.forEach(bone => {
            if (bone.children.length === 0) {
              const rad = bone.worldTransform.rotation * Math.PI / 180
              bone.tailWorld = { 
                x: bone.worldTransform.x + Math.cos(rad) * 50, 
                y: bone.worldTransform.y + Math.sin(rad) * 50 
              }
            }
          })
        }

        // 2. Second Pass: Draw all joint dots, tails, mesh outlines, and edit tools on top
        if (!isPlayingRef.current && onionMode === "none" && isSelectOrEdit) {
          flatBones.forEach(bone => {
            if (bone.name === 'root') return;
            const isSelected = bone.id === selectedBoneIdRef.current

            const isDraggingThis = dragState.current.isDragging && dragState.current.bone && dragState.current.bone.id === bone.id
            const isDraggingTail = isDraggingThis && dragState.current.isTail

            // Joint Circle
            const highlightJoint = isSelected && !isDraggingTail
            ctx.beginPath()
            ctx.arc(bone.worldTransform.x, bone.worldTransform.y, (highlightJoint ? 6 : 4) / z, 0, Math.PI * 2)

            const isRootChild = bone.parent && bone.parent.name === 'root'
            ctx.fillStyle = highlightJoint ? "#facc15" : (isRootChild ? "#f97316" : "#0ea5e9") 

            // White border outline
            ctx.lineWidth = 1.5 / z
            ctx.strokeStyle = "#ffffff"
            ctx.stroke()
            ctx.fill()

            // Tail helper dot
            if (bone.children.length === 0 && bone.tailWorld && activeToolRef.current === "select") {
              const highlightTail = isDraggingTail
              ctx.fillStyle = highlightTail ? "#facc15" : "#0ea5e9"
              ctx.beginPath()
              ctx.arc(bone.tailWorld.x, bone.tailWorld.y, (highlightTail ? 6 : 4) / z, 0, Math.PI * 2)
              ctx.lineWidth = 1.5 / z
              ctx.strokeStyle = "#ffffff"
              ctx.stroke()
              ctx.fill()
            }

            // Draw bounding box for edit_mesh (drawn on top of joints)
            if (isSelected && activeToolRef.current === "edit_mesh") {
              let actW = 100, actH = 100
              if (bone.assetType === "image" && bone.imageObj && bone.imageObj.complete) {
                const ratio = bone.imageObj.width / bone.imageObj.height
                if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
                  actW = bone.imageObj.width; actH = bone.imageObj.height
                } else if (bone.assetWidth === "auto") {
                  actH = Number(bone.assetHeight); actW = actH * ratio
                } else if (bone.assetHeight === "auto") {
                  actW = Number(bone.assetWidth); actH = actW / ratio
                } else {
                  actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100)
                }
              } else if (bone.assetType === "path" && bone.pathPoints && bone.pathPoints.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of bone.pathPoints) {
                  if (p.x < minX) minX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y > maxY) maxY = p.y;
                }
                actW = Math.max(10, maxX - minX);
                actH = Math.max(10, maxY - minY);
              } else {
                if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
                  actW = 100; actH = 100
                } else if (bone.assetWidth === "auto") {
                  actH = Number(bone.assetHeight); actW = actH
                } else if (bone.assetHeight === "auto") {
                  actW = Number(bone.assetWidth); actH = actW
                } else {
                  actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100)
                }
              }

              let boxX = -actW/2, boxY = -actH/2;
              if (bone.assetType === "path" && bone.pathPoints && bone.pathPoints.length > 0) {
                let minX = Infinity, minY = Infinity;
                for (const p of bone.pathPoints) {
                  if (p.x < minX) minX = p.x;
                  if (p.y < minY) minY = p.y;
                }
                boxX = minX; boxY = minY;
              }

              ctx.save()
              ctx.translate(bone.worldTransform.x, bone.worldTransform.y)
              ctx.rotate(bone.worldTransform.rotation * Math.PI / 180)
              ctx.scale(bone.worldTransform.scaleX, bone.worldTransform.scaleY)

              if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y)
              if (bone.assetRotation) ctx.rotate(bone.assetRotation * Math.PI / 180)

              ctx.strokeStyle = "#3b82f6"
              ctx.lineWidth = 1.5 / z
              ctx.setLineDash([5 / z, 5 / z])
              ctx.strokeRect(boxX, boxY, actW, actH)

              // Draw antenna line
              ctx.beginPath()
              ctx.moveTo(boxX + actW/2, boxY)
              ctx.lineTo(boxX + actW/2, boxY - 30/z)
              ctx.stroke()

              ctx.setLineDash([])

              ctx.fillStyle = "#ffffff"
              ctx.strokeStyle = "#3b82f6"
              ctx.lineWidth = 1.5 / z
              const pts = [
                {x: boxX, y: boxY}, {x: boxX + actW/2, y: boxY}, {x: boxX + actW, y: boxY},
                {x: boxX, y: boxY + actH/2},                          {x: boxX + actW, y: boxY + actH/2},
                {x: boxX, y: boxY + actH},  {x: boxX + actW/2, y: boxY + actH}, {x: boxX + actW, y: boxY + actH},
                {x: boxX + actW/2, y: boxY - 30/z, isAntenna: true} // 9th point
              ]
              for (const p of pts) {
                ctx.beginPath()
                if ((p as any).isAntenna) {
                  ctx.arc(p.x, p.y, 4/z, 0, Math.PI * 2)
                } else {
                  ctx.rect(p.x - 4/z, p.y - 4/z, 8/z, 8/z)
                }
                ctx.fill()
                ctx.stroke()
              }
              ctx.restore()
            }

            // Draw path vertices for edit (drawn on top of joints)
            if (isSelected && activeToolRef.current === "edit" && bone.assetType === "path" && bone.pathPoints) {
              ctx.save()
              ctx.translate(bone.worldTransform.x, bone.worldTransform.y)
              ctx.rotate(bone.worldTransform.rotation * Math.PI / 180)
              ctx.scale(bone.worldTransform.scaleX, bone.worldTransform.scaleY)

              if (bone.assetOffset) ctx.translate(bone.assetOffset.x, bone.assetOffset.y)
              if (bone.assetRotation) ctx.rotate(bone.assetRotation * Math.PI / 180)

              ctx.fillStyle = "#ffffff"
              ctx.strokeStyle = "#ef4444" // red to differentiate from blue mesh box
              ctx.lineWidth = 1.5 / z

              for (let i = 0; i < bone.pathPoints.length; i++) {
                const pt = bone.pathPoints[i]
                ctx.beginPath()
                ctx.arc(pt.x, pt.y, 4 / z, 0, Math.PI * 2)
                ctx.fill()
                ctx.stroke()
              }
              ctx.restore()
            }
          })
        }
      }
      
      // Draw Onion Skins if active and in Animate mode
      if (!isPlayingRef.current && editorModeRef.current === "animate" && currentAnimationRef.current) {
        
        // Save dragged bone's localTransform so animator doesn't overwrite it while dragging
        let draggedLocalTransform = null;
        if (dragState.current.isDragging && dragState.current.bone) {
          draggedLocalTransform = dragState.current.bone.localTransform.clone();
        }
        
        // Draw Onion Skins (Prev and Next)
        if (onionPrevRef.current && currentTimeRef.current > 0) {
          let prevTime = currentTimeRef.current - (1 / fpsRef.current)
          if (prevTime < 0) prevTime = 0
          
          animator.applyPose(prevTime)
          currentSkel.root.updateWorldTransform()
          drawBoneAssets(currentSkel.root, "prev")
          drawBoneRig(currentSkel.root, "prev")
        }
        if (onionNextRef.current && (durationRef.current === 0 || currentTimeRef.current < durationRef.current)) {
          let nextTime = currentTimeRef.current + (1 / fpsRef.current)
          if (durationRef.current > 0 && nextTime > durationRef.current) nextTime = durationRef.current
          
          animator.applyPose(nextTime)
          currentSkel.root.updateWorldTransform()
          drawBoneAssets(currentSkel.root, "next")
          drawBoneRig(currentSkel.root, "next")
        }
        // Restore to current time before drawing main skeleton
        animator.applyPose(currentTimeRef.current)
        
        // Restore dragged bone's localTransform
        if (draggedLocalTransform && dragState.current.bone) {
          const b = dragState.current.bone;
          b.localTransform.x = draggedLocalTransform.x;
          b.localTransform.y = draggedLocalTransform.y;
          b.localTransform.rotation = draggedLocalTransform.rotation;
          b.localTransform.scaleX = draggedLocalTransform.scaleX;
          b.localTransform.scaleY = draggedLocalTransform.scaleY;
        }
        
        currentSkel.root.updateWorldTransform()
      }

      if (currentSkel.root) {
        currentSkel.root.updateWorldTransform()
        drawBoneAssets(currentSkel.root, "none");
        drawBoneRig(currentSkel.root, "none")
      }
      
      // Draw Pen Tool Preview
      const z = cameraRef.current.zoom
      if (activeToolRef.current === "pen" && penPointsRef.current.length > 0) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2 / z
        
        // Draw the curved path preview
        ctx.beginPath()
        drawPath(ctx, penPointsRef.current, false, true)
        
        // Draw line to current mouse pos
        if (penMousePosRef.current && penPointsRef.current.length > 0) {
          const lastPt = penPointsRef.current[penPointsRef.current.length - 1]
          if (penPointsRef.current.length < 2) {
             ctx.moveTo(lastPt.x, lastPt.y)
          }
          ctx.lineTo(penMousePosRef.current.x, penMousePosRef.current.y)
        }
        ctx.stroke()

        // Draw points on top
        penPointsRef.current.forEach((pt) => {
          ctx.fillStyle = pt.isCurved ? "#facc15" : "#ffffff" // Yellow if curved, White if straight
          if (pt.isCurved) {
            ctx.beginPath()
            ctx.arc(pt.x, pt.y, 4 / z, 0, Math.PI * 2)
            ctx.fill()
          } else {
            const size = 6 / z
            ctx.fillRect(pt.x - size/2, pt.y - size/2, size, size)
          }
        })

        // Highlight first point if close
        if (penPointsRef.current.length > 2 && penMousePosRef.current) {
          const startPt = penPointsRef.current[0]
          const dx = startPt.x - penMousePosRef.current.x
          const dy = startPt.y - penMousePosRef.current.y
          if (Math.sqrt(dx*dx + dy*dy) < 15 / z) {
            ctx.fillStyle = "#facc15"
            ctx.beginPath()
            ctx.arc(startPt.x, startPt.y, 6 / z, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      
      ctx.restore()
    }
    
    render(performance.now())
    
    return () => {
      window.removeEventListener("reset-camera", handleResetCamera)
      window.removeEventListener("zoom-step", handleZoomStep)
      window.removeEventListener("pointerup", handleGlobalPointerUp)
      window.removeEventListener("pointercancel", handleGlobalPointerUp)
      cancelAnimationFrame(animationId)
    }
  }, [])

  const createPathBone = (closed = false) => {
    if (penPointsRef.current.length < 2 || !skeleton) {
      penPointsRef.current = []
      return
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    penPointsRef.current.forEach(pt => {
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    })
    
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    
    const bone = new Bone(`Path_${Math.floor(Math.random() * 1000)}`)
    bone.assetType = 'path'
    bone.shapeType = 'path'
    bone.shapeClosed = closed
    bone.shapeColor = '#d1d5db'
    bone.pathThickness = closed ? 0 : 3
    bone.pathIsCurved = true
    bone.pathPoints = penPointsRef.current.map(pt => ({ x: pt.x - cx, y: pt.y - cy, isCurved: pt.isCurved }))
    
    // Convert world coords to root local coords (root is absolute so it's the same)
    bone.localTransform.x = cx
    bone.localTransform.y = cy
    bone.setupTransform = bone.localTransform.clone()
    
    skeleton.root.addChild(bone)
    
    penPointsRef.current = []
    setSelectedBoneId(bone.id)
    forceUpdate()
    pushHistory()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeToolRef.current === "pen" && penPointsRef.current.length > 0) {
        if (e.key === "Enter" || e.key === "Escape") {
          createPathBone(false)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [skeleton])
  
  useEffect(() => {
    // If we switch away from Pen tool and there are unfinalized points, finalize them as an open path!
    if (activeToolRef.current === "pen" && activeTool !== "pen") {
      // Cancel drawing if tool changes
      penPointsRef.current = []
    }
    activeToolRef.current = activeTool
    activeShapeRef.current = activeShape
  }, [activeTool, activeShape, skeleton])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!skeleton || !canvasRef.current) return
    
    // Stop playback if playing (auto-pause on interact)
    if (isPlayingRef.current) {
      setIsPlaying(false)
    }
    
    // Capture pointer so we don't lose track if mouse leaves canvas bounds
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (err) {
      console.warn("Could not capture pointer:", err)
    }
    
    // Track pointer for pinch zoom
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values())
      const dx = pts[0].x - pts[1].x
      const dy = pts[0].y - pts[1].y
      initialPinchDistRef.current = Math.sqrt(dx*dx + dy*dy)
      initialPinchCamRef.current = { zoom: cameraRef.current.zoom, x: cameraRef.current.x, y: cameraRef.current.y }
      // Cancel other operations
      dragState.current.isDragging = false
      dragState.current.isPanning = false
      penDragState.current.isDragging = false
      return
    }

    if (activePointersRef.current.size > 2) return // Ignore 3+ fingers

    const rect = canvasRef.current.getBoundingClientRect()
    // Calculate raw mouse coordinates relative to canvas
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Convert screen coordinates to world coordinates
    const worldX = (mouseX - rect.width / 2 - cameraRef.current.x) / cameraRef.current.zoom
    const worldY = (mouseY - (rect.height / 2 + 100) - cameraRef.current.y) / cameraRef.current.zoom

    if (e.button === 1 || activeToolRef.current === "pan") {
      dragState.current = { isDragging: false, bone: null, isTail: false, isAssetDrag: false, isPanning: true, startPanX: e.clientX, startPanY: e.clientY, startCamX: cameraRef.current.x, startCamY: cameraRef.current.y, startX: 0, startY: 0, startLocalX: 0, startLocalY: 0, startAssetOffX: 0, startAssetOffY: 0 }
      return
    }

    if (activeToolRef.current === "pen") {
      // Check if clicking first point to close path
      if (penPointsRef.current.length > 2) {
        const startPt = penPointsRef.current[0]
        const dx = startPt.x - worldX
        const dy = startPt.y - worldY
        if (Math.sqrt(dx*dx + dy*dy) < 15 / cameraRef.current.zoom) {
          createPathBone(true) // Close path
          return
        }
      }
      
      // Check if clicking an existing point to toggle its curve state or drag it
      for (let i = 0; i < penPointsRef.current.length; i++) {
        const pt = penPointsRef.current[i]
        const dx = pt.x - worldX
        const dy = pt.y - worldY
        if (Math.sqrt(dx*dx + dy*dy) < 15 / cameraRef.current.zoom) {
          penDragState.current = { isDragging: true, pointIndex: i, startX: worldX, startY: worldY, isNewPoint: false }
          return
        }
      }

      // Add new point
      penPointsRef.current.push({ x: worldX, y: worldY, isCurved: false })
      penDragState.current = { isDragging: true, pointIndex: penPointsRef.current.length - 1, startX: worldX, startY: worldY, isNewPoint: true }
      return
    }

    // Check Gizmo points for edit_mesh and edit BEFORE regular bone/asset selection
    if (skeleton && selectedBoneIdRef.current) {
      const findBoneById = (bone: any, id: string): any => {
        if (bone.id === id) return bone;
        for (const child of bone.children) {
          const found = findBoneById(child, id);
          if (found) return found;
        }
        return null;
      };
      const bone = findBoneById(skeleton.root, selectedBoneIdRef.current);
      if (bone) {
        const rad = bone.worldTransform.rotation * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const sx = bone.worldTransform.scaleX, sy = bone.worldTransform.scaleY;
        const bx = bone.worldTransform.x, by = bone.worldTransform.y;
        
        if (activeToolRef.current === "edit_mesh") {
          let actW = 100, actH = 100
          if (bone.assetType === "image" && bone.imageObj && bone.imageObj.complete) {
            const ratio = bone.imageObj.width / bone.imageObj.height
            if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
              actW = bone.imageObj.width; actH = bone.imageObj.height
            } else if (bone.assetWidth === "auto") {
              actH = Number(bone.assetHeight); actW = actH * ratio
            } else if (bone.assetHeight === "auto") {
              actW = Number(bone.assetWidth); actH = actW / ratio
            } else {
              actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100)
            }
          } else if (bone.assetType === "path" && bone.pathPoints && bone.pathPoints.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of bone.pathPoints) {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.x > maxX) maxX = p.x;
              if (p.y > maxY) maxY = p.y;
            }
            actW = Math.max(10, maxX - minX);
            actH = Math.max(10, maxY - minY);
          } else {
            if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
              actW = 100; actH = 100
            } else if (bone.assetWidth === "auto") {
              actH = Number(bone.assetHeight); actW = actH
            } else if (bone.assetHeight === "auto") {
              actW = Number(bone.assetWidth); actH = actW
            } else {
              actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100)
            }
          }
          
          let boxX = -actW/2, boxY = -actH/2;
          if (bone.assetType === "path" && bone.pathPoints && bone.pathPoints.length > 0) {
            let minX = Infinity, minY = Infinity;
            for (const p of bone.pathPoints) {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
            }
            boxX = minX; boxY = minY;
          }
          
          const z = cameraRef.current.zoom;
          const pts = [
            {x: boxX, y: boxY}, {x: boxX + actW/2, y: boxY}, {x: boxX + actW, y: boxY},
            {x: boxX, y: boxY + actH/2},                          {x: boxX + actW, y: boxY + actH/2},
            {x: boxX, y: boxY + actH},  {x: boxX + actW/2, y: boxY + actH}, {x: boxX + actW, y: boxY + actH},
            {x: boxX + actW/2, y: boxY - 30/z, isAntenna: true} // 9th point
          ];
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            
            // Apply asset transform to point
            let apx = p.x;
            let apy = p.y;
            if (bone.assetRotation) {
              const arad = bone.assetRotation * Math.PI / 180;
              const tx = apx * Math.cos(arad) - apy * Math.sin(arad);
              const ty = apx * Math.sin(arad) + apy * Math.cos(arad);
              apx = tx;
              apy = ty;
            }
            if (bone.assetOffset) {
              apx += bone.assetOffset.x;
              apy += bone.assetOffset.y;
            }
            
            const px = bx + (apx * sx * cos - apy * sy * sin);
            const py = by + (apx * sx * sin + apy * sy * cos);
            const dist = Math.sqrt((px - worldX)**2 + (py - worldY)**2);
            if (dist < 10 / z) {
              const startPathPoints = bone.pathPoints ? JSON.parse(JSON.stringify(bone.pathPoints)) : [];
              meshDragState.current = { isDragging: true, bone, pointIndex: i, startX: worldX, startY: worldY, startW: actW, startH: actH, startLocalX: bone.localTransform.x, startLocalY: bone.localTransform.y, startPathPoints, startAssetRot: bone.assetRotation || 0, startAssetOffX: bone.assetOffset ? bone.assetOffset.x : 0, startAssetOffY: bone.assetOffset ? bone.assetOffset.y : 0 };
              return;
            }
          }
        } else if (activeToolRef.current === "edit" && bone.assetType === "path" && bone.pathPoints) {
          for (let i = 0; i < bone.pathPoints.length; i++) {
            const p = bone.pathPoints[i];
            let apx = p.x;
            let apy = p.y;
            
            if (bone.assetRotation) {
              const rad = bone.assetRotation * Math.PI / 180;
              const tx = apx * Math.cos(rad) - apy * Math.sin(rad);
              const ty = apx * Math.sin(rad) + apy * Math.cos(rad);
              apx = tx;
              apy = ty;
            }
            if (bone.assetOffset) {
              apx += bone.assetOffset.x;
              apy += bone.assetOffset.y;
            }
            
            const px = bx + (apx * sx * cos - apy * sy * sin);
            const py = by + (apx * sx * sin + apy * sy * cos);
            const dist = Math.sqrt((px - worldX)**2 + (py - worldY)**2);
            if (dist < 10 / cameraRef.current.zoom) {
              pathDragState.current = { isDragging: true, bone, pointIndex: i, startX: worldX, startY: worldY, startNodeX: p.x, startNodeY: p.y };
              return;
            }
          }
        }
      }
    }

    if (activeToolRef.current === "shape" && skeleton) {
      const newBone = new Bone(`Shape ${Math.floor(Math.random() * 1000)}`)
      newBone.assetType = "shape"
      newBone.shapeType = activeShapeRef.current === "square" ? "rect" : activeShapeRef.current
      newBone.assetWidth = 0
      newBone.assetHeight = 0
      newBone.localTransform.x = worldX - skeleton.root.worldTransform.x
      newBone.localTransform.y = worldY - skeleton.root.worldTransform.y
      newBone.setupTransform = newBone.localTransform.clone()
      
      skeleton.root.addChild(newBone)
      setSelectedBoneId(newBone.id)
      
      shapeCreateState.current = {
        isCreating: true,
        bone: newBone,
        startX: worldX,
        startY: worldY
      }
      return
    }

    // Find the closest bone joint or tail
    let closestBone: any = null
    let closestIsTail = false
    let lastAssetHit: any = null
    let minDist = 20 / cameraRef.current.zoom // Keep hit detection radius constant on screen
    
    const checkBone = (bone: any) => {
      // Root bone is invisible and cannot be clicked
      if (bone.name !== 'root') {
        // 1. Check joint hit
        const dx = bone.worldTransform.x - worldX
        const dy = bone.worldTransform.y - worldY
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < minDist) {
          minDist = dist
          closestBone = bone
          closestIsTail = false
        }

        // 2. Check tail hit (only in select mode)
        if (bone.tailWorld && activeToolRef.current === "select") {
          const dxt = bone.tailWorld.x - worldX
          const dyt = bone.tailWorld.y - worldY
          const distT = Math.sqrt(dxt * dxt + dyt * dyt)
          if (distT < minDist) {
            minDist = distT
            closestBone = bone
            closestIsTail = true
          }
        }
        
        // 3. Check asset bounding box hit
        if (bone.assetType && bone.assetType !== "none") {
          let actW = 100, actH = 100
          if (bone.assetType === "image" && bone.imageObj && bone.imageObj.complete) {
            const ratio = bone.imageObj.width / bone.imageObj.height
            if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
              actW = bone.imageObj.width; actH = bone.imageObj.height
            } else if (bone.assetWidth === "auto") {
              actH = Number(bone.assetHeight); actW = actH * ratio
            } else if (bone.assetHeight === "auto") {
              actW = Number(bone.assetWidth); actH = actW / ratio
            } else {
              actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100)
            }
          } else if (bone.assetType === "path" && bone.pathPoints && bone.pathPoints.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of bone.pathPoints) {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.x > maxX) maxX = p.x;
              if (p.y > maxY) maxY = p.y;
            }
            actW = Math.max(10, maxX - minX);
            actH = Math.max(10, maxY - minY);
          } else {
            if (bone.assetWidth === "auto" && bone.assetHeight === "auto") {
              actW = 100; actH = 100
            } else if (bone.assetWidth === "auto") {
              actH = Number(bone.assetHeight); actW = actH
            } else if (bone.assetHeight === "auto") {
              actW = Number(bone.assetWidth); actH = actW
            } else {
              actW = Number(bone.assetWidth || 100); actH = Number(bone.assetHeight || 100)
            }
          }
          
          let boxX = -actW/2, boxY = -actH/2;
          if (bone.assetType === "path" && bone.pathPoints && bone.pathPoints.length > 0) {
            let minX = Infinity, minY = Infinity;
            for (const p of bone.pathPoints) {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
            }
            boxX = minX; boxY = minY;
          }
          
          const rad = -bone.worldTransform.rotation * Math.PI / 180
          const rx = dx * Math.cos(rad) - dy * Math.sin(rad)
          const ry = dx * Math.sin(rad) + dy * Math.cos(rad)
          let localX = -rx / bone.worldTransform.scaleX // -rx because dx was bone.worldX - worldX, so mouse relative to bone is -dx
          let localY = -ry / bone.worldTransform.scaleY
          
          if (bone.assetOffset) {
             localX -= bone.assetOffset.x;
             localY -= bone.assetOffset.y;
          }
          if (bone.assetRotation) {
             const arad = -bone.assetRotation * Math.PI / 180;
             const tx = localX * Math.cos(arad) - localY * Math.sin(arad);
             const ty = localX * Math.sin(arad) + localY * Math.cos(arad);
             localX = tx;
             localY = ty;
          }
          
          if (localX >= boxX && localX <= boxX + actW && localY >= boxY && localY <= boxY + actH) {
            lastAssetHit = bone
          }
        }
      }
      
      bone.children.forEach(checkBone)
    }
    
    if (skeleton.root) checkBone(skeleton.root)

    const finalHitBone = closestBone || lastAssetHit;

    if (finalHitBone) {
      setSelectedBoneId(finalHitBone.id)
      const isAssetDrag = !closestBone && !!lastAssetHit;
      // If we hit via asset, we treat it like dragging the bone's origin (translation) unless in edit_mesh
      dragState.current = { 
        isDragging: true, 
        bone: finalHitBone, 
        isTail: closestBone ? closestIsTail : false, 
        isAssetDrag,
        isPanning: false, 
        startPanX: 0, 
        startPanY: 0, 
        startCamX: 0, 
        startCamY: 0,
        startX: worldX,
        startY: worldY,
        startLocalX: finalHitBone.localTransform.x,
        startLocalY: finalHitBone.localTransform.y,
        startAssetOffX: finalHitBone.assetOffset ? finalHitBone.assetOffset.x : 0,
        startAssetOffY: finalHitBone.assetOffset ? finalHitBone.assetOffset.y : 0
      }
    } else {
      setSelectedBoneId(null) // Clicked empty space
      dragState.current = { isDragging: false, bone: null, isTail: false, isAssetDrag: false, isPanning: true, startPanX: e.clientX, startPanY: e.clientY, startCamX: cameraRef.current.x, startCamY: cameraRef.current.y, startX: 0, startY: 0, startLocalX: 0, startLocalY: 0, startAssetOffX: 0, startAssetOffY: 0 }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!skeleton) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    // Support Pinch to Zoom
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    // Handle Pinch Zoom
    if (activePointersRef.current.size === 2 && initialPinchDistRef.current && initialPinchCamRef.current) {
      const pts = Array.from(activePointersRef.current.values())
      const dx = pts[0].x - pts[1].x
      const dy = pts[0].y - pts[1].y
      const dist = Math.sqrt(dx*dx + dy*dy)
      
      const zoomFactor = dist / initialPinchDistRef.current
      const newZoom = Math.max(0.1, Math.min(initialPinchCamRef.current.zoom * zoomFactor, 10))
      
      const centerX = (pts[0].x + pts[1].x) / 2
      const centerY = (pts[0].y + pts[1].y) / 2
      
      const mouseX = centerX - rect.left
      const mouseY = centerY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2 + 100
      
      const relativeZoom = newZoom / initialPinchCamRef.current.zoom
      
      cameraRef.current.x = mouseX - cx - (mouseX - cx - initialPinchCamRef.current.x) * relativeZoom
      cameraRef.current.y = mouseY - cy - (mouseY - cy - initialPinchCamRef.current.y) * relativeZoom
      cameraRef.current.zoom = newZoom
      return
    }

    if (dragState.current.isPanning) {
      cameraRef.current.x = dragState.current.startCamX + (e.clientX - dragState.current.startPanX)
      cameraRef.current.y = dragState.current.startCamY + (e.clientY - dragState.current.startPanY)
      return
    }

    const z = cameraRef.current.zoom
    const cy = rect.height / 2 + 100
    const worldX = (e.clientX - rect.left - rect.width / 2 - cameraRef.current.x) / z
    const worldY = (e.clientY - rect.top - cy - cameraRef.current.y) / z

    if (activeToolRef.current === "pen") {
      penMousePosRef.current = { x: worldX, y: worldY }
      
      if (penDragState.current.isDragging) {
        const ptIdx = penDragState.current.pointIndex
        if (ptIdx >= 0 && ptIdx < penPointsRef.current.length) {
          const pt = penPointsRef.current[ptIdx]
          
          const dx = worldX - penDragState.current.startX
          const dy = worldY - penDragState.current.startY
          
          // Move the point
          pt.x = worldX
          pt.y = worldY
          
          // If swiped/dragged more than 5px (on screen), it becomes curved
          if (Math.sqrt(dx*dx + dy*dy) > 5 / cameraRef.current.zoom) {
            pt.isCurved = true
          }
        }
      }
      return
    }
    
    if (activeToolRef.current === "shape" && shapeCreateState.current.isCreating && shapeCreateState.current.bone) {
       const w = Math.abs(worldX - shapeCreateState.current.startX);
       const h = Math.abs(worldY - shapeCreateState.current.startY);
       const cx_shape = (shapeCreateState.current.startX + worldX) / 2;
       const cy_shape = (shapeCreateState.current.startY + worldY) / 2;
       const b = shapeCreateState.current.bone;
       b.assetWidth = w;
       b.assetHeight = h;
       b.localTransform.x = cx_shape - skeleton.root.worldTransform.x;
       b.localTransform.y = cy_shape - skeleton.root.worldTransform.y;
       // No need to pushHistory on every move, wait until mouse up
       return;
    }

    if (activeToolRef.current === "edit" && pathDragState.current.isDragging && pathDragState.current.bone) {
      const idx = pathDragState.current.pointIndex;
      const bone = pathDragState.current.bone;
      if (bone.pathPoints && idx >= 0 && idx < bone.pathPoints.length) {
        const pt = bone.pathPoints[idx];
        const dx_w = worldX - bone.worldTransform.x;
        const dy_w = worldY - bone.worldTransform.y;
        const rad = -bone.worldTransform.rotation * Math.PI / 180;
        const rx = dx_w * Math.cos(rad) - dy_w * Math.sin(rad);
        const ry = dx_w * Math.sin(rad) + dy_w * Math.cos(rad);
        let apx = rx / bone.worldTransform.scaleX;
        let apy = ry / bone.worldTransform.scaleY;
        
        // Undo assetOffset and assetRotation
        if (bone.assetOffset) {
           apx -= bone.assetOffset.x;
           apy -= bone.assetOffset.y;
        }
        if (bone.assetRotation) {
           const arad = -bone.assetRotation * Math.PI / 180;
           const tx = apx * Math.cos(arad) - apy * Math.sin(arad);
           const ty = apx * Math.sin(arad) + apy * Math.cos(arad);
           apx = tx;
           apy = ty;
        }
        
        pt.x = apx;
        pt.y = apy;
      }
      return;
    }

    if (activeToolRef.current === "edit_mesh" && meshDragState.current.isDragging && meshDragState.current.bone) {
      const bone = meshDragState.current.bone;
      const ptIdx = meshDragState.current.pointIndex;
      
      if (ptIdx === 8) {
        // Antenna rotation
        const dx = worldX - bone.worldTransform.x;
        const dy = worldY - bone.worldTransform.y;
        let angle = Math.atan2(dx, -dy) * 180 / Math.PI;
        // Asset rotation is relative to bone's world rotation
        bone.assetRotation = angle - bone.worldTransform.rotation;
        return;
      }
      
      const dwx = worldX - meshDragState.current.startX;
      const dwy = worldY - meshDragState.current.startY;
      const brad = -bone.worldTransform.rotation * Math.PI / 180;
      const ldx = (dwx * Math.cos(brad) - dwy * Math.sin(brad)) / bone.worldTransform.scaleX;
      const ldy = (dwx * Math.sin(brad) + dwy * Math.cos(brad)) / bone.worldTransform.scaleY;
      
      let newW = meshDragState.current.startW;
      let newH = meshDragState.current.startH;
      
      if (ptIdx === 0 || ptIdx === 3 || ptIdx === 5) newW = Math.max(1, meshDragState.current.startW - ldx);
      if (ptIdx === 2 || ptIdx === 4 || ptIdx === 7) newW = Math.max(1, meshDragState.current.startW + ldx);
      if (ptIdx === 0 || ptIdx === 1 || ptIdx === 2) newH = Math.max(1, meshDragState.current.startH - ldy);
      if (ptIdx === 5 || ptIdx === 6 || ptIdx === 7) newH = Math.max(1, meshDragState.current.startH + ldy);
      
      // Lock aspect ratio for corner points
      if (ptIdx === 0 || ptIdx === 2 || ptIdx === 5 || ptIdx === 7) {
        const aspect = meshDragState.current.startW / meshDragState.current.startH;
        if (Math.abs(ldx) > Math.abs(ldy)) {
           newH = newW / aspect;
        } else {
           newW = newH * aspect;
        }
      }
      
      let shiftX = 0, shiftY = 0;
      if (ptIdx === 0 || ptIdx === 3 || ptIdx === 5) shiftX = -(newW - meshDragState.current.startW) / 2;
      if (ptIdx === 2 || ptIdx === 4 || ptIdx === 7) shiftX = (newW - meshDragState.current.startW) / 2;
      if (ptIdx === 0 || ptIdx === 1 || ptIdx === 2) shiftY = -(newH - meshDragState.current.startH) / 2;
      if (ptIdx === 5 || ptIdx === 6 || ptIdx === 7) shiftY = (newH - meshDragState.current.startH) / 2;
      
      bone.assetWidth = newW;
      bone.assetHeight = newH;

      if (bone.assetType === "path" && bone.pathPoints && meshDragState.current.startPathPoints) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of meshDragState.current.startPathPoints) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const scaleX = newW / Math.max(1, meshDragState.current.startW);
        const scaleY = newH / Math.max(1, meshDragState.current.startH);
        
        for (let i = 0; i < bone.pathPoints.length; i++) {
          if (meshDragState.current.startPathPoints[i]) {
             bone.pathPoints[i].x = cx + (meshDragState.current.startPathPoints[i].x - cx) * scaleX + shiftX;
             bone.pathPoints[i].y = cy + (meshDragState.current.startPathPoints[i].y - cy) * scaleY + shiftY;
          }
        }
      } else {
        if (!bone.assetOffset) bone.assetOffset = { x: 0, y: 0 };
        bone.assetOffset.x = meshDragState.current.startAssetOffX + shiftX;
        bone.assetOffset.y = meshDragState.current.startAssetOffY + shiftY;
      }
      
      return;
    }

    if (!dragState.current.isDragging || !dragState.current.bone) return

    const bone = dragState.current.bone
    const isTail = dragState.current.isTail
    const tool = activeToolRef.current
    const selectMode = selectModeRef.current

    if (isTail) {
      // Dragging a tail always rotates the bone
      const parentRotation = bone.parent ? bone.parent.worldTransform.rotation : 0
      const targetWorldAngle = Math.atan2(worldX - bone.worldTransform.x, -(worldY - bone.worldTransform.y)) * 180 / Math.PI
      bone.localTransform.rotation = targetWorldAngle - parentRotation
    } else if (dragState.current.isAssetDrag && (tool === "edit_mesh" || tool === "edit")) {
      // Drag asset body ONLY when it's an asset drag and in edit_mesh/edit mode
      // This happens regardless of rotate/scale/move modes
      const dwx = worldX - dragState.current.startX;
      const dwy = worldY - dragState.current.startY;
      
      const brad = -bone.worldTransform.rotation * Math.PI / 180;
      const ldx = (dwx * Math.cos(brad) - dwy * Math.sin(brad)) / bone.worldTransform.scaleX;
      const ldy = (dwx * Math.sin(brad) + dwy * Math.cos(brad)) / bone.worldTransform.scaleY;
      
      if (!bone.assetOffset) bone.assetOffset = { x: 0, y: 0 };
      bone.assetOffset.x = dragState.current.startAssetOffX + ldx;
      bone.assetOffset.y = dragState.current.startAssetOffY + ldy;
    } else if (selectMode === "rotate") {
      // Rotate Tool: Dragging a joint rotates its parent (if parent is not root)
      if (bone.parent && bone.parent.name !== 'root') {
        const parent = bone.parent
        const grandParentRotation = parent.parent ? parent.parent.worldTransform.rotation : 0
        const targetWorldAngle = Math.atan2(worldX - parent.worldTransform.x, -(worldY - parent.worldTransform.y)) * 180 / Math.PI
        const localAngle = Math.atan2(bone.localTransform.x, -bone.localTransform.y) * 180 / Math.PI
        
        parent.localTransform.rotation = (targetWorldAngle - localAngle) - grandParentRotation
      } else {
        // Child of root (or root itself) just translates freely
        bone.localTransform.x = worldX
        bone.localTransform.y = worldY
      }
    } else if (selectMode === "scale") {
      // Scale Tool: Dragging scales the bone itself based on distance to its origin (parent)
      const originX = bone.parent ? bone.parent.worldTransform.x : 0;
      const originY = bone.parent ? bone.parent.worldTransform.y : 0;
      const dist = Math.sqrt((worldX - originX)**2 + (worldY - originY)**2);
      const originalLength = Math.max(1, Math.sqrt(bone.setupTransform.x**2 + bone.setupTransform.y**2));
      const scale = dist / originalLength;
      
      bone.localTransform.scaleX = scale;
      bone.localTransform.scaleY = scale;
    } else {
      // Default behavior (Move): Translate the bone
      const dwx = worldX - dragState.current.startX;
      const dwy = worldY - dragState.current.startY;
      
      if (bone.parent && bone.parent.name !== 'root') {
        const pRot = bone.parent.worldTransform.rotation * (Math.PI / 180)
        const pScaleX = bone.parent.worldTransform.scaleX
        const pScaleY = bone.parent.worldTransform.scaleY

        const cos = Math.cos(pRot)
        const sin = Math.sin(pRot)

        // Apply inverse (transposed) rotation matrix to delta
        const ldx = (dwx * cos + dwy * sin) / pScaleX;
        const ldy = (-dwx * sin + dwy * cos) / pScaleY;

        bone.localTransform.x = dragState.current.startLocalX + ldx
        bone.localTransform.y = dragState.current.startLocalY + ldy
      } else {
        // Child of root (or root itself) just translates freely
        bone.localTransform.x = dragState.current.startLocalX + dwx
        bone.localTransform.y = dragState.current.startLocalY + dwy
      }
    }

    // Force engine to recalculate all global positions
    skeleton.root.updateWorldTransform()

    // Auto-Keyframing
    if (editorModeRef.current === "animate" && currentAnimationRef.current) {
      const anim = currentAnimationRef.current
      const t = currentTimeRef.current
      const currentFps = fpsRef.current;
      const isSmooth = smoothInterpRef.current;
      
      if (isTail) {
        // Dragging tail rotates the bone itself
        anim.setBonePose(t, bone.name, "rotation", bone.localTransform.rotation, bone.setupTransform.rotation, currentFps, isSmooth)
      } else if (selectMode === "rotate") {
        if (bone.parent && bone.parent.name !== 'root') {
          // Dragging joint with Rotate tool rotates the parent
          anim.setBonePose(t, bone.parent.name, "rotation", bone.parent.localTransform.rotation, bone.parent.setupTransform.rotation, currentFps, isSmooth)
        } else {
          // Direct child of root translates absolutely
          anim.setBonePose(t, bone.name, "x", bone.localTransform.x, bone.setupTransform.x, currentFps, isSmooth)
          anim.setBonePose(t, bone.name, "y", bone.localTransform.y, bone.setupTransform.y, currentFps, isSmooth)
        }
      } else if (selectMode === "scale") {
        anim.setBonePose(t, bone.name, "scaleX", bone.localTransform.scaleX, bone.setupTransform.scaleX, currentFps, isSmooth)
        anim.setBonePose(t, bone.name, "scaleY", bone.localTransform.scaleY, bone.setupTransform.scaleY, currentFps, isSmooth)
      } else {
        // Move Tool translates the bone
        if (bone.parent && bone.parent.name !== 'root') {
          // Record translation as offset from setupTransform
          const offsetX = bone.localTransform.x - bone.setupTransform.x;
          const offsetY = bone.localTransform.y - bone.setupTransform.y;
          anim.setBonePose(t, bone.name, "x", offsetX, 0, currentFps, isSmooth)
          anim.setBonePose(t, bone.name, "y", offsetY, 0, currentFps, isSmooth)
        } else {
          // Direct child of root translates absolutely
          anim.setBonePose(t, bone.name, "x", bone.localTransform.x, bone.setupTransform.x, currentFps, isSmooth)
          anim.setBonePose(t, bone.name, "y", bone.localTransform.y, bone.setupTransform.y, currentFps, isSmooth)
        }
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId)
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (err) {}

    if (activePointersRef.current.size < 2) {
       initialPinchDistRef.current = null
       initialPinchCamRef.current = null
    }

    if (shapeCreateState.current.isCreating) {
       shapeCreateState.current.isCreating = false;
       const b = shapeCreateState.current.bone;
       if (b && (b.assetWidth || 0) < 5 && (b.assetHeight || 0) < 5) {
          b.assetWidth = 100;
          b.assetHeight = 100;
       }
       if (skeleton) skeleton.root.updateWorldTransform();
       forceUpdate();
       pushHistory();
       return
    }

    if (dragState.current.isPanning) {
      dragState.current.isPanning = false
      return
    }

    if (activeToolRef.current === "pen") {
      if (penDragState.current.isDragging) {
        const ptIdx = penDragState.current.pointIndex
        if (ptIdx >= 0 && ptIdx < penPointsRef.current.length) {
          const pt = penPointsRef.current[ptIdx]
          const dx = pt.x - penDragState.current.startX
          const dy = pt.y - penDragState.current.startY
          // If clicked without dragging (distance < 5 on screen), toggle mode (only for existing points)
          if (Math.sqrt(dx*dx + dy*dy) < 5 / cameraRef.current.zoom) {
            if (!penDragState.current.isNewPoint) {
              pt.isCurved = !pt.isCurved
            }
            // Revert position to start (prevent micro-movements on click)
            pt.x = penDragState.current.startX
            pt.y = penDragState.current.startY
          }
        }
      }
      penDragState.current.isDragging = false
      return
    }

    if (dragState.current.bone) {
      try {
        if (editorModeRef.current === "rig" && skeleton) {
          skeleton.root.saveSetupPose()
        }
        
        pushHistory()
        forceUpdate() // Ensure UI (timeline/inspector) knows about keyframe or rig changes
      } finally {
        dragState.current.isDragging = false
        dragState.current.bone = null
        dragState.current.isTail = false
      }
    } else {
      dragState.current.isDragging = false
      dragState.current.bone = null
      dragState.current.isTail = false
    }
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 block w-full h-full cursor-crosshair z-0 touch-none" 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerOut={handlePointerUp}
    />
  )
}
