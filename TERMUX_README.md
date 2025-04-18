# WhatsApp Bot untuk Termux

Panduan ini menjelaskan langkah-langkah untuk menjalankan WhatsApp Bot di Termux pada perangkat Android.

## Dua Versi Bot

Bot ini tersedia dalam dua versi:

1. **Versi Lengkap** - Dengan fitur grup creator dan web interface (membutuhkan RAM 3GB+)
2. **Versi Sederhana** - Lebih ringan, dengan fitur utama saja (bisa berjalan di RAM 2GB+)

## Persyaratan

- Aplikasi Termux (dapat diunduh dari [F-Droid](https://f-droid.org/en/packages/com.termux/) karena versi Play Store sudah tidak diperbarui)
- Memori RAM: 
  - Versi Lengkap: minimal 3GB (direkomendasikan 4GB+)
  - Versi Sederhana: minimal 2GB (direkomendasikan 3GB+)
- Ruang penyimpanan kosong minimal 500MB-1GB
- Android versi 7.0 atau lebih baru

## Langkah Instalasi Manual

Jika script otomatis tidak berfungsi, ikuti langkah-langkah di bawah ini:

1. Buka Termux dan perbarui paket:
```bash
pkg update -y && pkg upgrade -y
```

2. Install paket yang diperlukan:
```bash
pkg install -y nodejs git chromium proot build-essential python
```

3. Clone repositori ini (jika belum):
```bash
git clone https://github.com/username/whatsapp-bot
cd whatsapp-bot
```

4. Atur variabel lingkungan untuk Puppeteer:
```bash
export CHROME_PATH=$(which chromium-browser)
echo "export CHROME_PATH=$CHROME_PATH" >> ~/.bashrc
echo "export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> ~/.bashrc
echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> ~/.bashrc
source ~/.bashrc
```

5. Install dependensi Node.js:
```bash
npm install
```

## Cara Menggunakan Script Setup Otomatis

### Untuk Versi Lengkap:

1. Berikan izin eksekusi pada script:
```bash
chmod +x termux_setup.sh
```

2. Jalankan script:
```bash
./termux_setup.sh
```

3. Menjalankan bot versi lengkap:
```bash
node index.js
```
Atau gunakan helper script:
```bash
chmod +x termux_run.sh
./termux_run.sh
```

### Untuk Versi Sederhana (Direkomendasikan untuk perangkat dengan RAM terbatas):

1. Berikan izin eksekusi pada script:
```bash
chmod +x termux_simple_setup.sh
```

2. Jalankan script:
```bash
./termux_simple_setup.sh
```

3. Menjalankan bot versi sederhana:
```bash
node termux_simple.js
```

Setelah bot berjalan, QR code akan ditampilkan di terminal. Scan QR code tersebut dengan aplikasi WhatsApp di ponsel Anda untuk mengautentikasi.

## Fitur Bot

- Membuat grup WhatsApp tunggal atau multiple
- Mengirim pesan massal ke banyak kontak
- Mengirim pesan satu per satu ke kontak yang ditetapkan
- Mengekspor informasi grup WhatsApp
- Dan lainnya

## Troubleshooting

### Bot gagal menjalankan Chromium:

Jika bot gagal menjalankan Chromium, coba perintah berikut:
```bash
termux-setup-storage
export PUPPETEER_EXECUTABLE_PATH=$(which chromium-browser)
```

### Masalah memori:

Jika mengalami masalah memori, pastikan untuk menutup aplikasi lain dan coba parameter berikut:
```bash
node --max-old-space-size=512 index.js
```

### QR Code tidak muncul atau error:

Coba hapus folder auth dan jalankan kembali:
```bash
rm -rf .wwebjs_auth
node index.js
```

## Catatan Penting

- Jangan tutup Termux saat bot berjalan
- Bot ini menggunakan WhatsApp Web, jadi ponsel Anda perlu tetap terhubung ke internet
- Penggunaan bot ini adalah tanggung jawab Anda, jangan gunakan untuk spam atau kegiatan ilegal
- Gunakan dengan bijak dan sesuai ketentuan layanan WhatsApp