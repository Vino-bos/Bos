/**
 * Client-side script for the WhatsApp Group Creator Bot web interface
 * Handles status checking and UI updates
 */

document.addEventListener('DOMContentLoaded', () => {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const lastCheckElement = document.getElementById('last-check');
    const systemInfoContainer = document.getElementById('system-info-container');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const compatibilityNotice = document.getElementById('compatibility-notice');
    const commandForm = document.getElementById('command-form');
    const commandInput = document.getElementById('command-input');
    const commandResponse = document.getElementById('command-response');
    const refreshLogsBtn = document.getElementById('refresh-logs-btn');
    const logContent = document.getElementById('log-content');
    
    // Check bot status and QR code every 5 seconds
    checkBotStatus();
    getSystemInfo();
    checkQRCode();
    loadLogs();
    setInterval(checkBotStatus, 5000);
    setInterval(checkQRCode, 5000);
    setInterval(loadLogs, 10000); // Update logs every 10 seconds
    
    // Event listeners
    if (commandForm) {
        commandForm.addEventListener('submit', sendCommand);
    }
    
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', loadLogs);
    }
    
    /**
     * Check the status of the WhatsApp bot
     */
    function checkBotStatus() {
        statusIndicator.className = 'status-indicator checking';
        statusText.textContent = 'Memeriksa...';
        
        fetch('/api/status')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to get status');
                }
                return response.json();
            })
            .then(data => {
                updateStatusDisplay(data.ready);
                updateLastCheckTime(data.timestamp);
                
                if (data.message) {
                    // If there's a message in the status response, display it
                    const statusMessageElement = document.createElement('div');
                    statusMessageElement.classList.add('status-message');
                    statusMessageElement.textContent = data.message;
                }
            })
            .catch(error => {
                console.error('Error checking bot status:', error);
                statusIndicator.className = 'status-indicator offline';
                statusText.textContent = 'Kesalahan Koneksi';
            });
    }
    
    /**
     * Get system information
     */
    function getSystemInfo() {
        fetch('/api/system-info')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to get system info');
                }
                return response.json();
            })
            .then(data => {
                updateSystemInfo(data);
            })
            .catch(error => {
                console.error('Error getting system info:', error);
                systemInfoContainer.innerHTML = '<p>Gagal memuat informasi sistem</p>';
            });
    }
    
    /**
     * Update the system information display
     * @param {Object} info - System information object
     */
    function updateSystemInfo(info) {
        const html = `
            <ul>
                <li><strong>Versi Node.js:</strong> ${info.nodejs}</li>
                <li><strong>Platform:</strong> ${info.platform}</li>
                <li><strong>Arsitektur:</strong> ${info.architecture}</li>
                <li><strong>Terakhir Diperbarui:</strong> ${new Date(info.timestamp).toLocaleString()}</li>
            </ul>
        `;
        systemInfoContainer.innerHTML = html;
    }
    
    /**
     * Update the status indicator in the UI
     * @param {boolean} isReady - Whether the bot is ready
     */
    function updateStatusDisplay(isReady) {
        if (isReady) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Aktif';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Tidak Aktif';
        }
    }
    
    /**
     * Update the last check time display
     * @param {string} timestamp - ISO timestamp string
     */
    function updateLastCheckTime(timestamp) {
        const date = new Date(timestamp);
        const formattedTime = date.toLocaleTimeString();
        lastCheckElement.textContent = formattedTime;
    }
    
    /**
     * Check for QR code and update UI
     */
    function checkQRCode() {
        fetch('/api/qrcode')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to get QR code');
                }
                return response.json();
            })
            .then(data => {
                if (data.hasQR && data.qrCode) {
                    // QR Code exists, update UI
                    updateQRCode(data.qrCode);
                    
                    // Hide compatibility notice as we have a QR code
                    if (compatibilityNotice) {
                        compatibilityNotice.style.display = 'none';
                    }
                }
            })
            .catch(error => {
                console.error('Error checking QR code:', error);
            });
    }
    
    /**
     * Update the QR code display
     * @param {string} qrData - The QR code data
     */
    function updateQRCode(qrData) {
        if (!qrPlaceholder) return;
        
        // Create QR code with qrcode.js library if available
        // If not, use text representation
        if (qrData) {
            const qrHtml = `
                <div class="qr-code">
                    <p>Pindai kode QR ini dengan WhatsApp di ponsel Anda:</p>
                    <div id="qrcode"></div>
                    <p class="qr-instructions">Setelah memindai, periksa ponsel Anda untuk konfirmasi.</p>
                </div>
            `;
            
            qrPlaceholder.innerHTML = qrHtml;
            
            // Generate QR code image
            // We're using a simple img tag with the data as src
            // For better rendering, a proper QR code library should be used
            const qrCodeElement = document.getElementById('qrcode');
            if (qrCodeElement) {
                const img = document.createElement('img');
                img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrData);
                img.alt = 'WhatsApp QR Code';
                img.width = 300;
                img.height = 300;
                qrCodeElement.appendChild(img);
            }
        } else {
            qrPlaceholder.innerHTML = '<p>Menunggu kode QR baru...</p>';
        }
    }
    
    /**
     * Send command to the WhatsApp bot
     * @param {Event} event - The form submit event
     */
    function sendCommand(event) {
        event.preventDefault();
        
        if (!commandInput || !commandResponse) return;
        
        const command = commandInput.value.trim();
        if (!command) {
            showCommandResponse('Perintah tidak boleh kosong.', false);
            return;
        }
        
        // Show loading state
        showCommandResponse('Mengirim perintah, harap tunggu...', true, true);
        
        // Send command to the server
        fetch('/api/send-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showCommandResponse(`Perintah berhasil dikirim: "${command}"`, true);
                // Clear the input field
                commandInput.value = '';
                // Reload logs after a delay to show the result
                setTimeout(loadLogs, 1000);
            } else {
                showCommandResponse(`Error: ${data.message}`, false);
            }
        })
        .catch(error => {
            console.error('Error sending command:', error);
            showCommandResponse('Kesalahan saat mengirim perintah. Periksa koneksi jaringan Anda.', false);
        });
    }
    
    /**
     * Show command response message in the UI
     * @param {string} message - The message to display
     * @param {boolean} isSuccess - Whether the command was successful
     * @param {boolean} isLoading - Whether this is a loading state message
     */
    function showCommandResponse(message, isSuccess, isLoading = false) {
        if (!commandResponse) return;
        
        const className = isLoading ? 'response-loading' : (isSuccess ? 'response-success' : 'response-error');
        
        commandResponse.innerHTML = `<div class="${className}">${message}</div>`;
    }
    
    /**
     * Load and display the latest logs
     */
    function loadLogs() {
        if (!logContent) return;
        
        fetch('/api/logs')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.logs && data.logs.length > 0) {
                    renderLogs(data.logs);
                } else {
                    logContent.textContent = 'Tidak ada log untuk ditampilkan.';
                }
            })
            .catch(error => {
                console.error('Error loading logs:', error);
                logContent.textContent = 'Kesalahan saat memuat log.';
            });
    }
    
    /**
     * Render logs in the log viewer
     * @param {Array} logs - Array of log entries
     */
    function renderLogs(logs) {
        if (!logContent) return;
        
        // Create log HTML
        const logHtml = logs.map(log => {
            const date = new Date(log.timestamp);
            const formattedTime = date.toLocaleTimeString();
            return `<div class="log-entry">
                <span class="log-timestamp">[${formattedTime}]</span>
                <span class="log-level-${log.level}">${log.level.toUpperCase()}:</span>
                <span class="log-message">${log.message}</span>
            </div>`;
        }).join('\n');
        
        logContent.innerHTML = logHtml || 'Tidak ada log untuk ditampilkan.';
    }
});
