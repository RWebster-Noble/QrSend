window.ReverseQr = window.ReverseQr || {};

const textDisplay = document.getElementById('textDisplay');

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(arrayBuffer) {
    // Create a Uint8Array view of the ArrayBuffer
    const uint8Array = new Uint8Array(arrayBuffer);

    // Use String.fromCharCode to convert each byte to a character
    const charArray = Array.from(uint8Array).map(byte => String.fromCharCode(byte));

    // Join the characters into a string and apply btoa()
    return btoa(charArray.join(''));
}

// Convert Base64 string back to ArrayBuffer
function base64ToArrayBuffer(base64String) {
    // Convert Base64 to binary string
    const binaryString = atob(base64String);

    // Create Uint8Array from the binary string
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }

    return uint8Array.buffer;
}

async function uint8ArrayToGuid(arrayBuffer) {
    if (arrayBuffer.byteLength < 16) {
        throw new Error('We need at least 16 bytes for a GUID');
    }

    // Compute SHA-1 hash of the input
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', arrayBuffer);
    const uint8Array = new Uint8Array(hashBuffer);

    const hex = Array.from(uint8Array.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
    ].join('-');
}

const clearButton = document.getElementById('clearButton');
clearButton.onclick = async () => {
    clearButton.disabled = true;
    try {
        const publicKeyAsGuid = await uint8ArrayToGuid(window.ReverseQr.publicKeyArrayBuffer);
        const url = `/.netlify/functions/clear?p=${publicKeyAsGuid}`;
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`Error: Failed to call clear. Status: ${response.status}`);
        } else {
            // Optionally, refresh UI after clear
            if (document.getElementById('decryptedList')) {
                document.getElementById('decryptedList').innerHTML = '';
            }
            lastRecieved = null;
            clearButton.style.display = 'none';
        }
    } catch (e) {
        textDisplay.style.display = '';
        textDisplay.textContent = `Clear error: ${e.message}`;
    } finally {
        textDisplay.style.display = 'none';
        clearButton.disabled = false;
    }
};

const refreshButton = document.getElementById('refreshButton');
refreshButton.onclick = async () => {
    get();
};

async function decryptPayload(payload, privateKey) {
    // Import ephemeral public key
    const ephemeralPublicKeyArrayBuffer = base64ToArrayBuffer(payload.e);
    const ephemeralPublicKey = await window.crypto.subtle.importKey(
        "spki",
        ephemeralPublicKeyArrayBuffer,
        {
            name: "X25519"
        },
        true,
        []
    );

    // Derive shared secret
    const aesKey = await window.crypto.subtle.deriveKey(
        {
            name: "X25519",
            public: ephemeralPublicKey
        },
        privateKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["decrypt"]
    );

    // Decode IV and ciphertext
    const iv = new Uint8Array(base64ToArrayBuffer(payload.i));
    const encryptedData = base64ToArrayBuffer(payload.c);

    // Decrypt
    const decryptedArrayBuffer = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        aesKey,
        encryptedData
    );

    // Convert decrypted ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedArrayBuffer);
}

let lastRecieved = null;
const qrcodeDiv = document.getElementById('qrcode-bg');

async function get() {
    try {
        const publicKeyAsGuid = await uint8ArrayToGuid(window.ReverseQr.publicKeyArrayBuffer);
        const url = `/.netlify/functions/get?p=${publicKeyAsGuid}` + (lastRecieved ? `&k=${lastRecieved}` : '');
        const response = await fetch(url);

        if (response.status === 204) {
            return;
        }

        if (response.ok) {
            const responseJson = await response.json();
            const payload = responseJson.data;

            // If payload is an array of blobs
            if (Array.isArray(payload)) {
                // Sort blobs by descending timestamp (k)
                const sortedBlobs = payload.slice().sort((a, b) => b.k - a.k);

                const data = [];
                for (const blob of sortedBlobs) {
                    // Assume blob.d is encrypted, decrypt if needed
                    const blobPayload = JSON.parse(blob.d);
                    if (blobPayload.e && blobPayload.i && blobPayload.c && window.ReverseQr.privateKey) {
                        const decrypted = await decryptPayload(blobPayload, window.ReverseQr.privateKey);
                        data.push({
                            k: blob.k,
                            d: decrypted
                        });
                    }
                }

                // Render/update the list
                let decryptedList = document.getElementById('decryptedList');
                if (!decryptedList) {
                    decryptedList = document.createElement('div');
                    decryptedList.id = 'decryptedList';
                    // Insert before the QR code
                    qrcodeDiv.parentNode.insertBefore(decryptedList, qrcodeDiv);
                }

                for (const item of data) {
                    const entry = document.createElement('a');
                    entry.className = 'text-display';
                    entry.textContent = item.d;
                    entry.style.display = 'block';
                    // Check if decrypted is a valid URL
                    try {
                        const url = new URL(item.d);
                        entry.href = url.href;
                    } catch (e) {
                        entry.removeAttribute('href');
                    }
                    decryptedList.appendChild(entry);

                    lastRecieved = item.k.split('/')[1];
                }

                clearButton.style.display = '';
            } else {
                throw new Error(`missing or invalid payload structure`);
            }
        } else {
            const data = await response.json();
            if (!data) {
                throw new Error(`Error: Status ${response.status}`);
            }
            if (data.errorType === "Error") {
                throw new Error(`Error ${response.status}: ${data.errorMessage}`);
            }
        }

        textDisplay.style.display = 'none';
    } catch (error) {
        textDisplay.textContent = `Error: ${error.message}`;
        textDisplay.style.display = '';
    }
}

(async function () {
    let keyPair;
    let privateKeyBase64 = localStorage.getItem('privateKey');
    let publicKeyBase64 = localStorage.getItem('publicKey');

    if (!privateKeyBase64 || !publicKeyBase64) {
        keyPair = await window.crypto.subtle.generateKey(
            {
                name: "X25519"
            },
            true,
            ["deriveKey", "deriveBits"]
        );
        // Export and store private key
        const privateKeyArrayBuffer = await window.crypto.subtle.exportKey(
            "pkcs8",
            keyPair.privateKey
        );
        privateKeyBase64 = arrayBufferToBase64(privateKeyArrayBuffer);
        localStorage.setItem('privateKey', privateKeyBase64);

        // Export and store public key
        const publicKeyArrayBuffer = await window.crypto.subtle.exportKey(
            "spki",
            keyPair.publicKey
        );
        publicKeyBase64 = arrayBufferToBase64(publicKeyArrayBuffer);
        window.ReverseQr.publicKeyArrayBuffer = publicKeyArrayBuffer;
        window.ReverseQr.privateKey = keyPair.privateKey;
        localStorage.setItem('publicKey', publicKeyBase64);
    } else {
        // Import private key
        const privateKeyArrayBuffer = base64ToArrayBuffer(privateKeyBase64);
        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            privateKeyArrayBuffer,
            {
                name: "X25519"
            },
            true,
            ["deriveKey", "deriveBits"]
        );
        // Import public key
        const publicKeyArrayBuffer = base64ToArrayBuffer(publicKeyBase64);
        const publicKey = await window.crypto.subtle.importKey(
            "spki",
            publicKeyArrayBuffer,
            {
                name: "X25519"
            },
            true,
            []
        );
        window.ReverseQr.publicKeyArrayBuffer = publicKeyArrayBuffer;
        keyPair = { privateKey, publicKey };
        window.ReverseQr.privateKey = privateKey; // <-- Save for decryption
    }

    const urlsafePublicKeyBase64 = publicKeyBase64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const qrCodeUrl = `${window.location.href}send#${urlsafePublicKeyBase64}`;
    console.log("QR Code URL:", qrCodeUrl);
    new QRCode(document.getElementById("qrcode"), {
        text: qrCodeUrl,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    get();
    setInterval(get, 1000);
})();
