#!/data/data/com.termux/files/usr/bin/bash

# Script instalasi WhatsApp Bot untuk Termux
# Dibuat untuk memudahkan setup di lingkungan Termux

echo "======================================"
echo "Memulai setup WhatsApp Bot untuk Termux"
echo "======================================"

# Update packages
echo "[1/6] Memperbarui paket Termux..."
pkg update -y && pkg upgrade -y

# Install required packages
echo "[2/6] Menginstall paket yang dibutuhkan..."
pkg install -y nodejs 
pkg install -y git 
pkg install -y chromium

# Install puppeteer dependencies
echo "[3/6] Menginstall dependensi untuk Puppeteer..."
pkg install -y proot 
pkg install -y build-essential 
pkg install -y python
pkg install -y libcairo
pkg install -y python-cairo
pkg install -y pango 
pkg install -y libxcomposite
pkg install -y libxdamage
pkg install -y libxrender
pkg install -y libxext

# Set environment variables
echo "[4/6] Mengatur variabel lingkungan..."
export CHROME_PATH=$(which chromium-browser)
echo "export CHROME_PATH=$CHROME_PATH" >> ~/.bashrc
echo "export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> ~/.bashrc
echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> ~/.bashrc

# Install project dependencies
echo "[5/6] Menginstall dependensi project..."
npm install

# Setup done
echo "[6/6] Setup selesai!"
echo ""
echo "======================================"
echo "Setup WhatsApp Bot untuk Termux selesai!"
echo "======================================"
echo ""
echo "Cara menggunakan:"
echo "1. Jalankan bot dengan perintah: node index.js"
echo "2. Scan QR code yang muncul dengan aplikasi WhatsApp di ponsel"
echo "3. Bot siap digunakan!"
echo ""
echo "CATATAN PENTING: Jangan tutup Termux saat bot berjalan"
echo "======================================"