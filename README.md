# 📺 My IPTV Playlist

Koleksi playlist IPTV pribadi dengan update berkala.

![Update Playlist](https://github.com/rafkichanel/my-iptv-playlist/actions/workflows/update-playlist.yml/badge.svg)

---

### 📝 Deskripsi Proyek

Proyek ini adalah repositori pribadi yang digunakan untuk mengelola dan memperbarui daftar channel IPTV secara otomatis. Skrip akan mengunduh daftar channel dari berbagai sumber, menyaring channel yang tidak aktif, dan menggabungkannya ke dalam satu file playlist (`Finalplay.m3u`) yang bersih dan terorganisir.

### ⚙️ Cara Kerja

1.  **Pengambilan Sumber**: Skrip mengambil daftar URL sumber dari file `sources.txt`.
2.  **Pemrosesan**: Setiap sumber diunduh, dan channel yang ditemukan akan diproses. Channel duplikat akan dihapus untuk menjaga daftar tetap unik.
3.  **Verifikasi**: Skrip memeriksa setiap channel untuk memastikan channel tersebut hidup dan dapat diakses.
4.  **Pengorganisasian**: Channel yang hidup dikelompokkan dan disusun ulang, dengan channel "LIVE EVENT" ditempatkan di bagian atas.
5.  **Pembaruan Otomatis**: GitHub Actions akan menjalankan skrip ini secara otomatis setiap satu jam, memastikan playlist selalu diperbarui dengan channel terbaru.

### 🚀 Cara Menggunakan

Anda bisa menggunakan file `Finalplay.m3u` ini di pemutar IPTV pilihan Anda (seperti VLC, Kodi, atau aplikasi IPTV lainnya).

Berikut adalah URL langsung menuju playlist:

`https://raw.githubusercontent.com/nama-pengguna-anda/nama-repo-anda/main/Finalplay.m3u`

**Catatan**: Ganti `nama-pengguna-anda` dan `nama-repo-anda` dengan username dan nama repositori Anda.

---

### 📂 Struktur Repositori

.
├── .github/
│   └── workflows/
│       └── update-playlist.yml  # File konfigurasi GitHub Actions
├── Finalplay.m3u                # Output playlist yang dihasilkan
├── package.json                 # Dependensi Node.js
├── README.md                    # File ini
└── sources.txt                  # Daftar URL sumber playlist
└── update_playlist.js           # Skrip utama untuk memperbarui playlist

---

### 🤝 Kontribusi

Proyek ini bersifat pribadi, tetapi jika Anda menemukan masalah atau memiliki saran, silakan buka issue atau fork repositori ini.

---

### 📜 Lisensi

Proyek ini di bawah lisensi MIT.
