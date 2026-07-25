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

---
*Catatan: Centang akan bertambah seiring berjalannya sesi koding kita!*
