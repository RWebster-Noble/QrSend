window.ReverseQr = window.ReverseQr || {};

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

function uint8ArrayToGuid(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    if (uint8Array.byteLength < 16) {
        throw new Error('Uint8Array must be at least 16 bytes for a valid GUID');
    }

    // Convert bytes to hex string
    const hex = Array.from(uint8Array.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Format as GUID (8-4-4-4-12)
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
    ].join('-');
}

const refreshButton = document.getElementById('refreshButton');

refreshButton.onclick = async () => {
    get();
};

async function decryptPayload(payload, privateKey) {
    // Import ephemeral public key
    const ephemeralPublicKeyArrayBuffer = base64ToArrayBuffer(payload.ephemeralPublicKey);
    const ephemeralPublicKey = await window.crypto.subtle.importKey(
        "spki",
        ephemeralPublicKeyArrayBuffer,
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true,
        []
    );

    // Derive shared secret
    const aesKey = await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
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
    const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const encryptedData = base64ToArrayBuffer(payload.data);

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

async function get() {
    try {
        const publicKeyAsGuid = uint8ArrayToGuid(window.ReverseQr.publicKeyArrayBuffer);
        const response = await fetch(`/.netlify/functions/get?p=${publicKeyAsGuid}`);

        if (response.status === 404) {
            numberDisplay.textContent = "No data";
            return;
        }

        if (response.ok) {
            const data = await response.json();
            // Check if payload is encrypted
            if (data.ephemeralPublicKey && data.iv && data.data && window.ReverseQr.privateKey) {
                // Decrypt
                const decrypted = await decryptPayload(data, window.ReverseQr.privateKey);
                numberDisplay.textContent = `Decrypted: ${decrypted}`;
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

    } catch (error) {
        numberDisplay.textContent = `Error: ${error.message}`;
    }
}

(async function () {
    let keyPair;
    let privateKeyBase64 = localStorage.getItem('privateKey');
    let publicKeyBase64 = localStorage.getItem('publicKey');

    if (!privateKeyBase64 || !publicKeyBase64) {
        keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256"
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
        localStorage.setItem('publicKey', publicKeyBase64);
    } else {
        // Import private key
        const privateKeyArrayBuffer = base64ToArrayBuffer(privateKeyBase64);
        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            privateKeyArrayBuffer,
            {
                name: "ECDH",
                namedCurve: "P-256"
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
                name: "ECDH",
                namedCurve: "P-256"
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
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    get();
})();
