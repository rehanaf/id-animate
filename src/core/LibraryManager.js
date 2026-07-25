import { Bone } from './Bone.js';

export class LibraryManager {
  constructor(editorUI) {
    this.editorUI = editorUI;
    this.storageKey = 'assetLibrary';
    this.data = this.loadData();
    this.activeCategory = 'char';
    
    this.initUI();
  }
  
  loadData() {
    const raw = localStorage.getItem(this.storageKey);
    let parsedData = null;
    if (raw) {
      try {
        parsedData = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse library data", e);
      }
    }
    
    if (!parsedData) {
      parsedData = {
        categories: [
          { id: 'char', name: 'Character', items: [] },
          { id: 'weap', name: 'Weapon', items: [] },
          { id: 'eff', name: 'Effect', items: [] },
          { id: 'path', name: 'Custom Path', items: [] }
        ]
      };
    }
    
    // Inject Sprite Sheet category if it doesn't exist (for existing users)
    if (!parsedData.categories.find(c => c.id === 'sheet')) {
        parsedData.categories.push({ id: 'sheet', name: 'Sprite Sheet', items: [] });
    }
    
    return parsedData;
  }
  
  saveData() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }
  
  initUI() {
    this.renderCategories();
    
    // Bind Save Selected Rig button
    const btnSaveRig = document.getElementById('btn-save-rig');
    if (btnSaveRig) {
      btnSaveRig.addEventListener('click', () => {
        if (!this.editorUI.selectedBone) {
          alert("Pilih tulang/aset terlebih dahulu di Hierarchy!");
          return;
        }
        const name = prompt("Beri nama aset ini untuk disimpan di Library:", this.editorUI.selectedBone.name + "_Rig");
        if (name) {
           const boneJson = this.editorUI.selectedBone.toJSON();
           this.addItem(this.activeCategory, {
             id: 'item_' + Date.now(),
             name: name,
             bonesCount: this.countBones(boneJson),
             data: boneJson
           });
        }
      });
    }
    
    // Bind Add Category
    const btnAddCat = document.getElementById('btn-add-category');
    if (btnAddCat) {
      btnAddCat.addEventListener('click', () => {
         const catName = prompt("Nama Kategori Baru:");
         if (catName) {
           const id = 'cat_' + Date.now();
           this.data.categories.push({ id, name: catName, items: [] });
           this.saveData();
           this.renderCategories();
         }
      });
    }

    // Bind Create Sprite Sheet (Upload)
    const btnCreateSheet = document.getElementById('btn-create-sheet');
    const inpSheetUpload = document.getElementById('inp-lib-sheet-upload');
    if (btnCreateSheet && inpSheetUpload) {
      btnCreateSheet.addEventListener('click', () => {
         inpSheetUpload.click();
      });
      
      inpSheetUpload.addEventListener('change', async (e) => {
         const files = Array.from(e.target.files);
         if (files.length === 0) return;
         
         const name = prompt("Beri nama Sprite Sheet ini:", "My_Sheet");
         if (!name) return;
         
         const base64Frames = [];
         
         for (const file of files) {
            const result = await new Promise(resolve => {
               const reader = new FileReader();
               reader.onload = ev => resolve(ev.target.result);
               reader.readAsDataURL(file);
            });
            base64Frames.push(result);
         }
         
         const sheetBone = new Bone(name);
         sheetBone.assetType = 'sheet';
         sheetBone.sheetFrames = base64Frames;
         sheetBone.sheetIndex = 0;
         sheetBone.length = 0; // It's just a visual container
         
         this.addItem('sheet', {
            id: 'sheet_' + Date.now(),
            name: name,
            bonesCount: 1,
            data: sheetBone.toJSON()
         });
         
         // Clear input
         inpSheetUpload.value = "";
      });
    }
  }
  
  countBones(boneJson) {
    let count = 1;
    if (boneJson.children) {
      boneJson.children.forEach(c => { count += this.countBones(c); });
    }
    return count;
  }
  
  addItem(categoryId, item) {
    const cat = this.data.categories.find(c => c.id === categoryId);
    if (cat) {
      cat.items.push(item);
      this.saveData();
      this.renderItems();
    }
  }
  
  deleteItem(categoryId, itemId) {
    const cat = this.data.categories.find(c => c.id === categoryId);
    if (cat) {
      cat.items = cat.items.filter(i => i.id !== itemId);
      this.saveData();
      this.renderItems();
    }
  }
  
  renderCategories() {
    const list = document.getElementById('lib-category-list');
    if (!list) return;
    list.innerHTML = '';
    
    this.data.categories.forEach(cat => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = cat.name;
      btn.className = 'w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors ';
      
      if (cat.id === this.activeCategory) {
        btn.className += 'bg-blue-500/20 text-blue-400';
      } else {
        btn.className += 'hover:bg-white/5 text-gray-300';
      }
      
      btn.addEventListener('click', () => {
        this.activeCategory = cat.id;
        this.renderCategories(); // update active state
        this.renderItems();
      });
      
      li.appendChild(btn);
      list.appendChild(li);
    });
    
    this.renderItems();
  }
  
  renderItems() {
    const grid = document.getElementById('lib-items-grid');
    const title = document.getElementById('lib-category-title');
    if (!grid) return;
    
    const cat = this.data.categories.find(c => c.id === this.activeCategory);
    if (!cat) return;
    
    if (title) title.textContent = cat.name + ' Assets';
    
    const btnCreateSheet = document.getElementById('btn-create-sheet');
    if (btnCreateSheet) {
       if (this.activeCategory === 'sheet') {
          btnCreateSheet.classList.remove('hidden');
       } else {
          btnCreateSheet.classList.add('hidden');
       }
    }
    
    grid.innerHTML = '';
    
    if (cat.items.length === 0) {
      grid.innerHTML = '<p class="text-gray-500 col-span-full">Kosong. Pilih tulang di Hierarchy lalu klik "Save Selected Rig Here" untuk menyimpan aset ke kategori ini.</p>';
      return;
    }
    
    cat.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'bg-[#2a2a35] border border-[#444] rounded-xl p-4 flex flex-col items-center hover:border-blue-500 transition-colors group relative';
      
      let icon = item.bonesCount > 1 ? 'git-merge' : 'image';
      if (item.data && item.data.assetType === 'sheet') icon = 'layers';
      else if (item.data && item.data.assetType === 'custom_path') icon = 'pen-tool';
      
      div.innerHTML = `
        <button class="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity delete-btn" title="Hapus">
          x
        </button>
        <div class="w-20 h-20 bg-[#1a1a20] rounded-lg mb-3 flex items-center justify-center">
          <i data-lucide="${icon}" class="w-8 h-8 text-gray-500 group-hover:text-blue-400"></i>
        </div>
        <h4 class="font-bold text-sm text-center truncate w-full">${item.name}</h4>
        <p class="text-xs text-gray-400">${item.bonesCount} Bones</p>
        <div class="mt-3 flex w-full gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="flex-1 bg-blue-600 hover:bg-blue-500 py-1 rounded text-xs font-bold text-white btn-attach">Attach</button>
        </div>
      `;
      
      div.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm("Hapus aset ini?")) {
           this.deleteItem(this.activeCategory, item.id);
        }
      });
      
      div.querySelector('.btn-attach').addEventListener('click', () => {
        // Create Bone from JSON data
        const importedBone = Bone.fromJSON(item.data);
        
        if (this.editorUI.selectedBone) {
           this.editorUI.selectedBone.addChild(importedBone);
        } else {
           // Attach as Free Object to Root
           this.editorUI.skeleton.root.addChild(importedBone);
        }
        
        this.editorUI.initHierarchy();
        this.editorUI.selectBone(importedBone);
        
        // Close modal
        document.getElementById('modal-library').style.display = 'none';
      });
      
      grid.appendChild(div);
    });
    
    if (window.lucide) window.lucide.createIcons();
  }
}
