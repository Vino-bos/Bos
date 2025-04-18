#!/data/data/com.termux/files/usr/bin/bash

# Script untuk menjalankan WhatsApp Bot di Termux dengan pengaturan optimal

# Tampilkan pesan selamat datang
echo "======================================"
echo "WhatsApp Bot Termux Runner"
echo "======================================"
echo ""

# Cek environment Chromium
if [ -z "$PUPPETEER_EXECUTABLE_PATH" ]; then
  CHROME_PATH=$(which chromium-browser)
  if [ -z "$CHROME_PATH" ]; then
    echo "[KESALAHAN] Chromium tidak ditemukan. Pastikan Anda sudah menginstal chromium."
    echo "Jalankan: pkg install chromium"
    exit 1
  fi
  
  # Set environment variables
  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH
  echo "[INFO] Variabel lingkungan Puppeteer diatur ke $CHROME_PATH"
fi

# Cek memori yang tersedia
MEM_TOTAL=$(free -m | grep Mem | awk '{print $2}')
MEM_FREE=$(free -m | grep Mem | awk '{print $4}')

echo "[INFO] Total memori: $MEM_TOTAL MB"
echo "[INFO] Memori kosong: $MEM_FREE MB"

# Peringatan jika memori tidak cukup
if [ $MEM_FREE -lt 300 ]; then
  echo "[PERINGATAN] Memori sistem sangat rendah ($MEM_FREE MB)"
  echo "Bot mungkin tidak berjalan dengan baik. Tutup aplikasi lain dan coba lagi."
  echo ""
  read -p "Tetap lanjutkan? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operasi dibatalkan."
    exit 1
  fi
fi

# Mode memori rendah jika memori tersedia kurang dari 700 MB
if [ $MEM_FREE -lt 700 ]; then
  echo "[INFO] Menjalankan dalam mode memori rendah"
  exec node --max-old-space-size=512 index.js
else
  echo "[INFO] Menjalankan dengan pengaturan normal"
  exec node index.js
fi