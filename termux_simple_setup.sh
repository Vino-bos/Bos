#!/data/data/com.termux/files/usr/bin/bash

# Script instalasi versi sederhana dari WhatsApp Bot untuk Termux

echo "======================================"
echo "Setup WhatsApp Bot Sederhana untuk Termux"
echo "======================================"

# Update packages
echo "[1/5] Memperbarui paket Termux..."
pkg update -y && pkg upgrade -y

# Install basic dependencies
echo "[2/5] Menginstall paket dasar..."
pkg install -y nodejs git chromium

# Install puppeteer dependencies (minimal)
echo "[3/5] Menginstall dependensi pendukung..."
pkg install -y libcairo 
pkg install -y pango
pkg install -y libxcomposite

# Set environment variables
echo "[4/5] Mengatur variabel lingkungan..."
export CHROME_PATH=$(which chromium-browser)
echo "export CHROME_PATH=$CHROME_PATH" >> ~/.bashrc
echo "export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> ~/.bashrc
echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> ~/.bashrc

# Install Node dependencies
echo "[5/5] Menginstall dependensi Node.js..."
npm install whatsapp-web.js@latest qrcode-terminal@latest

# Setup done
echo ""
echo "======================================"
echo "Setup Selesai!"
echo "======================================"
echo ""
echo "Cara Menggunakan:"
echo "1. Jalankan bot dengan perintah: node termux_simple.js"
echo "2. Scan QR code yang muncul dengan aplikasi WhatsApp di ponsel lain"
echo "3. Mulai gunakan bot dengan mengirim !help"
echo ""
echo "CATATAN: Versi ini lebih ringan dan cocok untuk perangkat dengan RAM terbatas"
echo "======================================"