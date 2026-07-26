# Status Proyek & Fitur I'd Animate 🚀

Berikut adalah daftar fitur utama, fondasi yang sudah kita bangun, serta hal-hal yang masih dalam daftar tunggu (to-do list).

## 🛠️ Fundamental Sistem & Rigging
- [x] **Arsitektur Node-Based Skeleton:** Menggunakan sistem hierarki `Bone` (Parent-Child) tanpa batasan kedalaman.
- [x] **Root Decoupling:** Titik `root` utama disembunyikan, sehingga anak-anaknya bertindak sebagai elemen/karakter mandiri di atas panggung (bisa ditarik kemana saja secara bebas).
- [x] **Move & Scale Tool:** Algoritma pemindahan dan penskalaan manual.
- [x] **Rotate Tool dengan Forward Kinematics (FK):** Menggeser/menarik persendian tulang bawah akan memutar tulang atasnya secara presisi layaknya kemudi.
- [x] **Auto-Tail Rendering:** Tulang di ujung rantai (*leaf bone*) otomatis diberi buntut agar bisa diputar.

## 🎨 Asset & Vector Drawing
- [x] **Asset Library System:** Unggah gambar dari komputer menjadi objek yang bisa di-*rigging*.
- [x] **Pen Tool (Path Drawing):** Fitur untuk menggambar kurva dan bentuk vektor.
- [x] **Smart Curvature (Mixed Curve):** Klik untuk sudut tajam, seret (swipe) lebih dari 5 piksel untuk melengkung secara otomatis (*Catmull-Rom interpolation*).
- [x] **Auto-Centering Pivot:** Poros putaran vektor otomatis dikalkulasi berdasarkan *Bounding Box* hasil akhir gambar.
- [x] **Basic Primitives:** Alat bantu buat bentuk dasar instan (Kotak, Lingkaran, Segitiga).

## 🎥 Animasi & Navigasi Layar
- [x] **Kamera Kanvas (Pan & Zoom):** Navigasi kanvas tak terbatas menggunakan klik tengah, alt-drag, dan *scroll wheel*.
- [x] **UI Scale Normalizer:** Ukuran alat kendali UI (titik, garis, jangkauan klik) tetap konstan di layar berapapun level *zoom*-nya.
- [x] **Artboard Bounds:** Penanda batas kotak kanvas/panggung eksport.
- [x] **Core Animation Engine:** Sistem perekam *Track* dan *Keyframe* per-tulang dan per-properti.
- [x] **Smart Auto-Keyframing:** Merekam pergerakan langsung di *Animate Mode*.
- [x] **Base-Key Auto Injection:** Otomatis mengunci postur dasar (*Setup Pose*) di Frame 0 saat properti tersebut baru pertama kali digerakkan agar pose awal tidak hancur.

## ⏳ Masih Dalam Antrean (To-Do / Upcoming)
- [ ] **Timeline Visualizer & Scrubbing:** Menggambar rentetan blok *keyframe* di panel bawah (Timeline) agar pengguna bisa menggeser, menduplikat, atau menghapus blok *keyframe* secara visual.
- [ ] **Inverse Kinematics (IK) Constraints:** Membuat tulang kaki agar menapak kuat di tanah saat badan digerakkan.
- [ ] **Easing & Kurva Interpolasi:** Mengganti gaya perpindahan dari kaku (linear) menjadi luwes (Bouncing, Ease In-Out).
- [ ] **Sprite Sheet / Flipbook Engine:** Kemampuan untuk mengganti-ganti gambar mata/mulut dalam satu *Bone* berdasar *frame*.
- [ ] **Export to GIF/MP4:** Menyatukan (*render*) hasil *artboard* menjadi berkas video.
- [ ] **Text Element:** Menambahkan elemen teks yang bisa di-*rigging* dan dianimasikan (font, ukuran, warna, dll).
- [ ] **Minecraft Rig & Import Skin:** Rig bawaan model Minecraft dengan kemampuan mengimpor file skin (.png) langsung ke karakter.
- [ ] **Sound/Music in Frame:** Menambahkan audio (SFX/musik) pada frame tertentu di timeline animasi.
- [ ] **Login with Google:** Autentikasi pengguna menggunakan akun Google.
- [ ] **Subscription & Ads Reward:** Sistem langganan premium dan reward dari menonton iklan untuk membuka fitur.

## 📦 Predefined Animation & Skeleton Library
- [ ] **Animation: Demo/Walk** — Animasi berjalan siap pakai.
- [ ] **Skeleton: Basic/Minecraft** — Kerangka dasar model Minecraft.
- [ ] **Skeleton: Basic/Stickman** — Kerangka stickman sederhana.
- [ ] **Skeleton: Weapon/Sword** — Kerangka pedang.
- [ ] **Skeleton: Weapon/Bow** — Kerangka busur panah.

## 🔧 Perbaikan / Revisi
- [ ] **Path Tool warna seperti Shape tanpa stroke:** Path yang digambar menggunakan Pen Tool seharusnya memiliki fill color seperti Shape, bukan hanya stroke.
- [ ] **FAB Main Menu z-index:** Tombol FAB (Floating Action Button) di Main Menu tertutup elemen lain, perlu diperbaiki z-index-nya.

---
*Catatan: Centang akan bertambah seiring berjalannya sesi koding kita!*
