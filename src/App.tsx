import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Settings, Plus, Video, Bone, FolderPlus, Folder, FolderOpen, ArrowLeft, MoreVertical, Copy, Pencil, Trash2, Upload } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import JSZip from "jszip"
import { AppStorage } from "@/core/Storage"
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'

import { EditorProvider } from "@/context/EditorContext"
import { EditorPage } from "@/pages/EditorPage"
import { generateProjectThumbnail } from "@/core/ThumbnailGenerator"

export interface ProjectGroup {
  id: string
  name: string
  type: "animation" | "skeleton"
}

export interface Project {
  id: string
  name: string
  type: "animation" | "skeleton"
  canvasWidth: number
  canvasHeight: number
  fps: number
  lastModified: number
  data?: any
  thumbnail?: string
  groupId?: string | null
}

export function App() {
  const [view, setView] = useState<"menu" | "editor">("menu")
  const [activeTab, setActiveTab] = useState<"animation" | "skeleton">("animation")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  
  // Custom dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  // Drawer states (for workspace)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [newProjName, setNewProjName] = useState("")
  const [newProjWidth, setNewProjWidth] = useState("800")
  const [newProjHeight, setNewProjHeight] = useState("600")
  const [newProjFps, setNewProjFps] = useState("8")

  // Drawer states (for group)
  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  const handleImportZip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const zip = await JSZip.loadAsync(ev.target?.result as ArrayBuffer);
        
        const skeletonFile = zip.file("skeleton.json");
        if (!skeletonFile) {
           alert("Invalid project file (missing skeleton.json)");
           return;
        }

        const skeletonStr = await skeletonFile.async("string");
        const skeletonData = JSON.parse(skeletonStr);

        const animFile = zip.file("animation.json");
        let animData = null;
        if (animFile) {
           animData = JSON.parse(await animFile.async("string"));
        }

        // Restore images
        const imagesFolder = zip.folder("images");
        if (imagesFolder) {
           const restoreImages = async (bone: any) => {
              if (bone.assetType === "image" && bone.assetUrl) {
                 const filename = bone.assetUrl.split('/').pop();
                 const imgFile = imagesFolder.file(filename);
                 if (imgFile) {
                    const base64 = await imgFile.async("base64");
                    const ext = filename.split('.').pop() || "png";
                    const mime = ext === "jpg" ? "image/jpeg" : "image/png";
                    bone.assetData = `data:${mime};base64,${base64}`;
                 }
              }
              if (bone.children) {
                 for (const child of bone.children) {
                    await restoreImages(child);
                 }
              }
           };

           if (skeletonData.bones) {
              await restoreImages(skeletonData.bones);
           }
        }

        // Replace global workspace
        await AppStorage.setItem("rig_workspace", JSON.stringify(skeletonData));
        if (animData) {
           await AppStorage.setItem("anim_workspace", JSON.stringify(animData));
        }

        const newId = Date.now().toString();
        const p: Project = {
          id: newId,
          name: file.name.replace(".zip", ""),
          type: "animation",
          canvasWidth: 800,
          canvasHeight: 600,
          fps: 8,
          lastModified: Date.now(),
          data: null
        };

        const newProjects = [p, ...projects];
        saveProjects(newProjects);
        
        // Open the editor!
        setView("editor");

      } catch (err) {
        console.error(err);
        alert("Failed to import project");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Custom Modal States
  const [renameModal, setRenameModal] = useState<{isOpen: boolean, id: string, name: string, type: 'project'|'group'} | null>(null)
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string, type: 'project'|'group'} | null>(null)

  // Initialize Mobile Options
  useEffect(() => {
    const initMobile = async () => {
      if (Capacitor.isNativePlatform()) {
         try {
           await ScreenOrientation.lock({ orientation: 'landscape' });
           await StatusBar.hide();
         } catch(e) {}
      }
    };
    initMobile();
  }, []);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const initDefaults = () => {
          const modules = import.meta.glob('@/assets/scenes/**/*.json', { eager: true }) as Record<string, any>;
          const defaultGroups: ProjectGroup[] = [];
          const defaultProjects: Project[] = [];
          const groupMap = new Map<string, ProjectGroup>();

          for (const [path, module] of Object.entries(modules)) {
            // Path format expected: /src/assets/scenes/{type}/{group}/{project}/data.json
            const parts = path.split('/');
            const scenesIndex = parts.indexOf('scenes');
            if (scenesIndex === -1) continue;

            const typeStr = parts[scenesIndex + 1];
            const groupName = parts[scenesIndex + 2];
            const projectName = parts[scenesIndex + 3];

            if (!typeStr || !groupName || !projectName) continue;

            const type = typeStr === 'animations' ? 'animation' : 'skeleton';
            const groupId = `group-predefined-${type}-${groupName.toLowerCase()}`;

            if (!groupMap.has(groupId)) {
              const newGroup: ProjectGroup = {
                id: groupId,
                name: groupName,
                type: type
              };
              groupMap.set(groupId, newGroup);
              defaultGroups.push(newGroup);
            }

            const dataContent = module.default || module;
            const newProject: Project = {
              id: `proj-predefined-${type}-${groupName.toLowerCase()}-${projectName.toLowerCase()}`,
              name: projectName,
              type: type,
              groupId: groupId,
              canvasWidth: dataContent?.canvasWidth || 800,
              canvasHeight: dataContent?.canvasHeight || 600,
              fps: dataContent?.fps || 12,
              lastModified: Date.now(),
              data: dataContent
            };
            defaultProjects.push(newProject);
          }

          setProjects(defaultProjects);
          setGroups(defaultGroups);
          AppStorage.setItem("id_projects", JSON.stringify(defaultProjects));
          AppStorage.setItem("id_groups", JSON.stringify(defaultGroups));
        };

        const savedGroups = await AppStorage.getItem("id_groups")
        if (savedGroups) setGroups(JSON.parse(savedGroups))

        const savedProj = await AppStorage.getItem("id_projects")
        if (savedProj) {
          const parsed = JSON.parse(savedProj).filter((p: any) => p.type !== "library");
          if (parsed.length > 0) {
            setProjects(parsed);
          } else {
            initDefaults();
          }
        } else {
          initDefaults();
        }
    } catch(e) {}
    };
    loadStorage();
  }, []);

  const hasForcedThumbnailsRef = useRef(false);

  // Background Preview Generation
  useEffect(() => {
    if (projects.length === 0) return;
    
    const needsForceRun = !hasForcedThumbnailsRef.current;
    const needsRegularRun = projects.some(p => !p.thumbnail && p.data);
    
    if (!needsForceRun && !needsRegularRun) return;
    
    if (needsForceRun) {
      hasForcedThumbnailsRef.current = true;
    }

    let active = true;
    const processThumbnails = async () => {
      let currentProjs = [...projects];
      let changed = false;

      for (let i = 0; i < currentProjs.length; i++) {
        const p = currentProjs[i];
        if (p.data && (!p.thumbnail || needsForceRun)) {
          try {
            const thumb = await generateProjectThumbnail(p);
            if (thumb && active) {
              currentProjs[i] = { ...p, thumbnail: thumb };
              changed = true;
            }
          } catch(e) {}
        }
      }
      
      if (changed && active) {
         setProjects(currentProjs);
         AppStorage.setItem("id_projects", JSON.stringify(currentProjs));
      }
    };
    
    processThumbnails();
    
    return () => { active = false; };
  }, [projects]);

  // Android Back Button Handler
  useEffect(() => {
    let listener: any = null;
    const setupBackButton = async () => {
      listener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (view === "editor") {
          setView("menu");
        } else if (deleteModal) {
          setDeleteModal(null);
        } else if (renameModal) {
          setRenameModal(null);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isGroupDrawerOpen) {
          setIsGroupDrawerOpen(false);
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else if (activeGroupId) {
          setActiveGroupId(null);
        } else {
          // If at root menu with no modals, close app
          CapacitorApp.exitApp();
        }
      });
    };
    setupBackButton();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [view, deleteModal, renameModal, isSettingsOpen, isGroupDrawerOpen, isDrawerOpen, activeGroupId]);

  // Reset active group when switching tabs
  useEffect(() => {
    setActiveGroupId(null)
  }, [activeTab])

  const saveProjects = async (p: Project[]) => {
    setProjects(p)
    await AppStorage.setItem("id_projects", JSON.stringify(p))
  }

  const saveGroups = async (g: ProjectGroup[]) => {
    setGroups(g)
    await AppStorage.setItem("id_groups", JSON.stringify(g))
  }

  const handleCreateProject = () => {
    const newProj: Project = {
      id: Date.now().toString(),
      name: newProjName || `New ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`,
      type: activeTab,
      canvasWidth: Number(newProjWidth) || 800,
      canvasHeight: Number(newProjHeight) || 600,
      fps: Number(newProjFps) || 8,
      lastModified: Date.now(),
      data: null,
      groupId: activeGroupId // Add to current group if inside one
    }
    saveProjects([newProj, ...projects])
    setIsDrawerOpen(false)
    setNewProjName("")
  }

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ProjectGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      type: activeTab
    }
    saveGroups([...groups, newGroup])
    setIsGroupDrawerOpen(false)
    setNewGroupName("")
  }
  
  const handleRenameConfirm = () => {
    if (!renameModal || !renameModal.name.trim()) return;
    const newName = renameModal.name.trim();

    if (renameModal.type === 'project') {
      saveProjects(projects.map(p => p.id === renameModal.id ? { ...p, name: newName } : p));
    } else {
      saveGroups(groups.map(g => g.id === renameModal.id ? { ...g, name: newName } : g));
    }
    setRenameModal(null);
  }

  const handleDeleteConfirm = () => {
    if (!deleteModal) return;

    if (deleteModal.type === 'project') {
      saveProjects(projects.filter(p => p.id !== deleteModal.id));
    } else {
      saveGroups(groups.filter(g => g.id !== deleteModal.id));
      // Move projects out of the group
      saveProjects(projects.map(p => p.groupId === deleteModal.id ? { ...p, groupId: null } : p));
      
      // If we are currently viewing this group, go back to root
      if (activeGroupId === deleteModal.id) {
        setActiveGroupId(null);
      }
    }
    setDeleteModal(null);
  }

  const handleClearData = async () => {
    localStorage.clear()
    await AppStorage.setItem("id_projects", "[]");
    await AppStorage.setItem("id_groups", "[]");
    await AppStorage.setItem("rig_workspace", "");
    await AppStorage.setItem("anim_workspace", "");
    window.location.reload()
  }

  const copyProject = (proj: Project) => {
    const copyProj: Project = { 
      ...proj, 
      id: Date.now().toString(), 
      name: `${proj.name} (Copy)`, 
      lastModified: Date.now() 
    };
    saveProjects([copyProj, ...projects]);
  }

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("projectId", projectId)
  }

  const handleDrop = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault()
    const projectId = e.dataTransfer.getData("projectId")
    if (projectId) {
      saveProjects(projects.map(p => p.id === projectId ? { ...p, groupId } : p))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleBack = async () => {
    if (activeProjectId) {
      try {
        const rigData = await AppStorage.getItem("rig_workspace");
        const animData = await AppStorage.getItem("anim_workspace");
        
        const savedProj = await AppStorage.getItem("id_projects");
        if (savedProj) {
          let allProjs = JSON.parse(savedProj);
          for (let i = 0; i < allProjs.length; i++) {
            let p = allProjs[i];
            if (p.id === activeProjectId) {
              const updatedData = p.type === 'skeleton' ? rigData : { skeleton: rigData, animation: animData };
              p.data = updatedData;
              p.lastModified = Date.now();
              try {
                 p.thumbnail = await generateProjectThumbnail(p);
              } catch(e) {}
              allProjs[i] = p;
            }
          }
          await AppStorage.setItem("id_projects", JSON.stringify(allProjs));
          setProjects(allProjs);
        }
      } catch(e) {}
    }
    await AppStorage.removeItem("active_project_id");
    setActiveProjectId(null);
    setView("menu");
  }

  const handleOpenProject = async (proj: Project) => {
    try {
      await AppStorage.setItem("active_project_id", proj.id);
      if (proj.type === "skeleton") {
        if (proj.data) {
          const rawData = typeof proj.data === "string" ? proj.data : JSON.stringify(proj.data);
          await AppStorage.setItem("rig_workspace", rawData);
        } else {
          await AppStorage.setItem("rig_workspace", "");
        }
        await AppStorage.setItem("anim_workspace", "");
      } else {
        if (proj.data) {
          if (proj.data.skeleton) {
            await AppStorage.setItem("rig_workspace", typeof proj.data.skeleton === "string" ? proj.data.skeleton : JSON.stringify(proj.data.skeleton));
          } else {
             await AppStorage.setItem("rig_workspace", "");
          }
          if (proj.data.animation) {
             await AppStorage.setItem("anim_workspace", typeof proj.data.animation === "string" ? proj.data.animation : JSON.stringify(proj.data.animation));
          } else {
             await AppStorage.setItem("anim_workspace", "");
          }
        } else {
          await AppStorage.setItem("rig_workspace", "");
          await AppStorage.setItem("anim_workspace", "");
        }
      }
      setActiveProjectId(proj.id);
      setView("editor");
    } catch(e) {}
  };

  if (view === "editor") {
    return (
      <EditorProvider>
        <EditorPage onBack={handleBack} />
      </EditorProvider>
    )
  }

  const currentTabProjects = projects.filter(p => p.type === activeTab)
  const currentTabGroups = groups.filter(g => g.type === activeTab)

  const renderCard = (proj: Project) => (
    <div 
      key={proj.id} 
      draggable
      onDragStart={(e) => handleDragStart(e, proj.id)}
      className="group flex flex-col cursor-pointer"
      onClick={() => handleOpenProject(proj)}
    >
      {/* Thumbnail Area - Aspect 3/2 */}
      <div className="relative aspect-[3/2] w-full bg-[#15151a] border border-[#2a2a35] hover:border-[#4a4a55] rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-900/10 transition-all hover:-translate-y-1 mb-2">
         {/* Inner clipped content */}
         <div className="absolute inset-0 overflow-hidden rounded-xl">
           {proj.thumbnail ? (
             <img src={proj.thumbnail} alt={proj.name} className="w-full h-full object-contain object-center opacity-80 group-hover:opacity-100 transition-opacity" />
           ) : (
             <>
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-600 via-transparent to-transparent"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 {proj.type === "animation" ? <Video className="w-10 h-10 text-blue-500 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500" /> : <Bone className="w-10 h-10 text-purple-500 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500" />}
               </div>
             </>
           )}
         </div>

         {/* Badges inside card */}
         <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
           {proj.type === "animation" && (
             <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20">{proj.fps} FPS</span>
           )}
         </div>
         
         {/* Dropdown Menu */}
         <div className="absolute top-2 right-2 z-[60]" onClick={(e) => e.stopPropagation()}>
           <button 
              className="w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all text-white backdrop-blur-sm ring-1 ring-white/10 opacity-70 hover:opacity-100 shadow-xl"
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === proj.id ? null : proj.id); }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {activeDropdown === proj.id && (
               <div className="absolute top-10 right-0 bg-[#1a1a24] border border-[#333] rounded-lg shadow-2xl overflow-hidden z-[70] w-36 flex flex-col animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50">
                 <button className="flex items-center px-3 py-2.5 hover:bg-[#2a2a35] text-xs text-gray-200 transition-colors" onClick={(e) => { e.stopPropagation(); setRenameModal({isOpen: true, id: proj.id, name: proj.name, type: 'project'}); setActiveDropdown(null); }}>
                    <Pencil className="w-3.5 h-3.5 mr-2 opacity-70" /> Rename
                 </button>
                 <button className="flex items-center px-3 py-2.5 hover:bg-[#2a2a35] text-xs text-gray-200 transition-colors" onClick={(e) => { e.stopPropagation(); copyProject(proj); setActiveDropdown(null); }}>
                    <Copy className="w-3.5 h-3.5 mr-2 opacity-70" /> Copy
                 </button>
                 <button className="flex items-center px-3 py-2.5 hover:bg-red-500/20 text-xs text-red-400 transition-colors" onClick={(e) => { e.stopPropagation(); setDeleteModal({isOpen: true, id: proj.id, type: 'project'}); setActiveDropdown(null); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-2 opacity-70" /> Delete
                 </button>
               </div>
            )}
        </div>
      </div>

      {/* Title outside */}
      <h3 className="font-bold text-gray-200 text-sm truncate pl-1 group-hover:text-white transition-colors">{proj.name}</h3>
    </div>
  )

  const renderGroupCard = (group: ProjectGroup) => {
    const groupProjects = currentTabProjects.filter(p => p.groupId === group.id)
    return (
      <div 
        key={group.id} 
        className="group flex flex-col cursor-pointer"
        onClick={() => setActiveGroupId(group.id)}
        onDrop={(e) => { e.stopPropagation(); handleDrop(e, group.id); }}
        onDragOver={handleDragOver}
      >
        <div className="relative aspect-[3/2] w-full bg-[#1c1c24] border border-[#2a2a35] hover:border-blue-500/50 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all mb-2 flex flex-col items-center justify-center">
           <div className="absolute inset-0 overflow-hidden rounded-xl flex items-center justify-center pointer-events-none">
             <Folder className="w-10 h-10 text-gray-500 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-500" />
           </div>
           
           <span className="absolute bottom-2 right-2 bg-black/60 text-[10px] px-2 py-0.5 rounded-full text-gray-300">{groupProjects.length} Items</span>
           
           {/* Dropdown Menu */}
           <div className="absolute top-2 right-2 z-[60]" onClick={(e) => e.stopPropagation()}>
             <button 
                className="w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all text-white backdrop-blur-sm ring-1 ring-white/10 opacity-70 hover:opacity-100 shadow-xl"
                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === group.id ? null : group.id); }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {activeDropdown === group.id && (
                 <div className="absolute top-10 right-0 bg-[#22222d] border border-[#3a3a45] rounded-lg shadow-2xl overflow-hidden z-[70] w-36 flex flex-col animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50">
                   <button className="flex items-center px-3 py-2.5 hover:bg-[#30303d] text-xs text-gray-200 transition-colors" onClick={(e) => { e.stopPropagation(); setRenameModal({isOpen: true, id: group.id, name: group.name, type: 'group'}); setActiveDropdown(null); }}>
                      <Pencil className="w-3.5 h-3.5 mr-2 opacity-70" /> Rename
                   </button>
                   <button className="flex items-center px-3 py-2.5 hover:bg-red-500/20 text-xs text-red-400 transition-colors" onClick={(e) => { e.stopPropagation(); setDeleteModal({isOpen: true, id: group.id, type: 'group'}); setActiveDropdown(null); }}>
                      <Trash2 className="w-3.5 h-3.5 mr-2 opacity-70" /> Delete
                   </button>
                 </div>
              )}
          </div>
        </div>
        <h3 className="font-bold text-gray-200 text-sm truncate pl-1 group-hover:text-white transition-colors">{group.name}</h3>
      </div>
    )
  }

  const activeGroup = currentTabGroups.find(g => g.id === activeGroupId)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex flex-col h-screen overflow-y-auto relative scroll-smooth snap-y snap-mandatory"
         onClick={() => setActiveDropdown(null)} // Click away to close dropdowns
         onDrop={(e) => {
           // If we are viewing inside a group, dropping outside cards into the main area adds them to this group
           // If we are at the root, dropping outside cards ungroups them
           handleDrop(e, activeGroupId);
         }}
         onDragOver={handleDragOver}
    >
      
      {/* Hero Section */}
      <div className="relative pt-12 pb-8 landscape:pt-6 landscape:pb-4 px-6 lg:px-12 flex flex-col items-center justify-center shrink-0 snap-start">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-[#0a0a0f] to-[#0a0a0f] pointer-events-none"></div>
        <div className="z-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 mb-6 landscape:w-12 landscape:h-12 landscape:mb-2 rounded-3xl landscape:rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-black text-4xl landscape:text-xl shadow-2xl shadow-blue-500/30 ring-1 ring-white/10">
            iA
          </div>
          <h1 className="text-5xl md:text-7xl landscape:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4 landscape:mb-1">
            I'd Animate
          </h1>
          <p className="text-gray-400 text-lg md:text-xl landscape:text-xs max-w-xl mx-auto font-medium">
            Next-Generation 2D Rigging & Animation Workspace
          </p>
        </div>
        
        {/* Navigation & Controls */}
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
           <Button variant="ghost" size="icon" className="w-10 h-10 text-white hover:bg-white/10 rounded-full relative" asChild>
             <label className="cursor-pointer">
               <input type="file" accept=".zip" className="hidden" onChange={handleImportZip} />
               <Upload className="w-5 h-5" />
             </label>
           </Button>
           <Button variant="ghost" size="icon" className="w-10 h-10 text-white hover:bg-white/10 rounded-full" onClick={() => setIsSettingsOpen(true)}>
             <Settings className="w-5 h-5" />
           </Button>
        </div>
      </div>

      <div className="snap-start flex flex-col min-h-screen">
        {/* Sticky Tabs */}
        <div className="sticky top-0 z-30 flex items-center justify-center gap-2 p-3 bg-[#0a0a0f]/80 backdrop-blur-xl border-y border-[#1a1a24] shadow-md w-full shrink-0">
          <Button 
            variant={activeTab === "animation" ? "default" : "ghost"} 
            className={`rounded-full px-5 transition-all font-medium text-sm text-white ${activeTab === "animation" ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-900/50" : "hover:bg-white/10 text-white"}`}
            onClick={() => setActiveTab("animation")}
          >
            <Video className="w-4 h-4 mr-2" /> Animation
          </Button>
          <Button 
            variant={activeTab === "skeleton" ? "default" : "ghost"} 
            className={`rounded-full px-5 transition-all font-medium text-sm text-white ${activeTab === "skeleton" ? "bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-900/50" : "hover:bg-white/10 text-white"}`}
            onClick={() => setActiveTab("skeleton")}
          >
            <Bone className="w-4 h-4 mr-2" /> Skeleton
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 lg:px-12 bg-[#0a0a0f]">
          <div className="max-w-[1400px] mx-auto">
            
            {!activeGroupId ? (
              <>
                {/* Root View */}
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-bold text-gray-200">
                      {activeTab === "animation" ? "Animations" : "Skeletons"}
                   </h2>
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="rounded-full border-[#2a2a35] bg-[#15151a] hover:bg-[#2a2a35] text-gray-300"
                     onClick={(e) => { e.stopPropagation(); setIsGroupDrawerOpen(true); }}
                   >
                     <FolderPlus className="w-4 h-4 mr-2" /> New Group
                   </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {currentTabGroups.map(renderGroupCard)}
                  {currentTabProjects.filter(p => !p.groupId).map(renderCard)}
                </div>

                {currentTabGroups.length === 0 && currentTabProjects.filter(p => !p.groupId).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600 border border-dashed border-[#2a2a35] rounded-2xl mt-4">
                     <p className="text-sm">No {activeTab} projects found</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Inside Group View */}
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="rounded-full hover:bg-[#2a2a35] text-gray-400"
                       onClick={(e) => { e.stopPropagation(); setActiveGroupId(null); }}
                     >
                       <ArrowLeft className="w-5 h-5" />
                     </Button>
                     <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-blue-400" />
                        {activeGroup?.name || "Group"}
                     </h2>
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {currentTabProjects.filter(p => p.groupId === activeGroupId).map(renderCard)}
                </div>

                {currentTabProjects.filter(p => p.groupId === activeGroupId).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600 border border-dashed border-[#2a2a35] rounded-2xl mt-4">
                     <p className="text-sm">This group is empty</p>
                     <p className="text-xs mt-1">Drag projects here or create a new one.</p>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button 
        className={`fixed bottom-8 right-8 w-16 h-16 text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 z-40 ${
           activeTab === "animation" ? "bg-blue-600 hover:bg-blue-500 shadow-blue-600/40" :
           "bg-purple-600 hover:bg-purple-500 shadow-purple-600/40"
        }`}
        onClick={(e) => { e.stopPropagation(); setIsDrawerOpen(true); }}
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Drawer for Workspace */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent 
          className="rounded-3xl border border-white/10 bg-[#15151a]/95 backdrop-blur-2xl shadow-2xl text-white after:hidden w-[calc(100%-8px)] sm:max-w-md mx-auto mb-1 !h-[calc(100dvh-8px)] !max-h-[calc(100dvh-8px)] lg:!h-auto lg:!max-h-[90vh] flex flex-col"
          style={{ '--drawer-content-max-height': 'calc(100dvh - 8px)' } as React.CSSProperties}
        >
          <div className="mx-auto w-full flex-1 overflow-hidden flex flex-col min-h-0">
            <DrawerHeader className="shrink-0">
              <DrawerTitle>New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Project</DrawerTitle>
            </DrawerHeader>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 min-h-0">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Project Name</label>
                <input 
                  type="text" 
                  className="w-full bg-[#0a0a0f] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder={`My Awesome ${activeTab}`}
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Canvas Width</label>
                  <input 
                    type="number" 
                    className="w-full bg-[#0a0a0f] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    value={newProjWidth}
                    onChange={e => setNewProjWidth(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Canvas Height</label>
                  <input 
                    type="number" 
                    className="w-full bg-[#0a0a0f] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    value={newProjHeight}
                    onChange={e => setNewProjHeight(e.target.value)}
                  />
                </div>
              </div>

              {activeTab === "animation" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Target FPS (Max 60)</label>
                  <input 
                    type="number"
                    min={1}
                    max={60}
                    className="w-full bg-[#0a0a0f] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    value={newProjFps}
                    onChange={e => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 8;
                      if (val > 60) val = 60;
                      setNewProjFps(val.toString());
                    }}
                  />
                </div>
              )}
            </div>

            <DrawerFooter className="p-5 pt-2 shrink-0">
              <Button 
                className={`w-full h-10 text-sm font-bold rounded-full text-white transition-all ${
                   activeTab === "animation" ? "bg-blue-600 hover:bg-blue-500" :
                   "bg-purple-600 hover:bg-purple-500"
                }`}
                onClick={handleCreateProject}
              >
                Create Workspace
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Group Modal */}
      <Dialog open={isGroupDrawerOpen} onOpenChange={setIsGroupDrawerOpen}>
        <DialogContent className="bg-[#15151a] border-[#333] p-0 overflow-hidden sm:max-w-sm">
          <DialogHeader className="p-4 border-b border-[#333]">
            <DialogTitle className="text-white text-left">New Group</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Group Name</label>
              <input 
                type="text" 
                className="w-full bg-[#0a0a0f] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. Hero Characters"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="p-4 flex items-center justify-end gap-2 border-t border-[#333] bg-black/20">
            <Button variant="ghost" onClick={() => setIsGroupDrawerOpen(false)} className="text-gray-400 hover:text-white rounded-lg">Cancel</Button>
            <Button onClick={handleCreateGroup} className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg px-6">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Rename Modal */}
      <Dialog open={!!renameModal?.isOpen} onOpenChange={(val) => !val && setRenameModal(null)}>
        <DialogContent className="bg-[#15151a] border-[#2a2a35] sm:max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-white text-left">Rename {renameModal?.type === 'project' ? 'Project' : 'Group'}</DialogTitle>
          </DialogHeader>
          <div className="my-2">
            <input 
              type="text" 
              className="w-full bg-[#0a0a0f] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
              value={renameModal?.name || ""}
              onChange={e => setRenameModal(renameModal ? {...renameModal, name: e.target.value} : null)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameConfirm()
              }}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setRenameModal(null)} className="text-gray-400 hover:text-white rounded-full">Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-6" onClick={handleRenameConfirm}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Delete Confirm Modal */}
      <Dialog open={!!deleteModal?.isOpen} onOpenChange={(val) => !val && setDeleteModal(null)}>
        <DialogContent className="bg-[#15151a] border-[#2a2a35] sm:max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-white text-left">Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="my-2">
            <p className="text-gray-400 text-sm">
              {deleteModal?.type === 'project' 
                ? "Are you sure you want to delete this project? This action cannot be undone."
                : "Are you sure you want to delete this group? Projects inside will not be deleted, they will just be ungrouped."}
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-white rounded-full">Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-500 text-white rounded-full px-6" onClick={handleDeleteConfirm}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-[#15151a] border-[#2a2a35] sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-white text-left">Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
             <div className="space-y-2">
               <h4 className="text-sm font-semibold text-white">Data Management</h4>
               <p className="text-xs text-gray-400">Clear all saved workspace data, projects, and settings. This will restore the app to its original state.</p>
               <Button 
                 variant="destructive" 
                 className="w-full rounded-full font-semibold"
                 onClick={() => {
                   setIsSettingsOpen(false)
                   setIsClearDataConfirmOpen(true)
                 }}
               >
                 <Trash2 className="w-4 h-4 mr-2" />
                 Clear Reset Data
               </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Data Confirm Modal */}
      <Dialog open={isClearDataConfirmOpen} onOpenChange={setIsClearDataConfirmOpen}>
        <DialogContent className="bg-[#15151a] border-[#2a2a35] sm:max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-white text-left">Clear All Data</DialogTitle>
          </DialogHeader>
          <div className="my-2">
            <p className="text-gray-400 text-sm">
              Are you sure you want to clear all data? This will delete all your local projects, animations, and rigs. <strong>This action cannot be undone.</strong>
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setIsClearDataConfirmOpen(false)} className="text-gray-400 hover:text-white rounded-full">Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-500 text-white rounded-full px-6" onClick={handleClearData}>Clear & Reload</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App