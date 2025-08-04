const inputToSend = document.getElementById('inputToSend');
const sendButton = document.getElementById('sendButton');

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

function arrayBufferToBase64(arrayBuffer) {
    // Create a Uint8Array view of the ArrayBuffer
    const uint8Array = new Uint8Array(arrayBuffer);

    // Use String.fromCharCode to convert each byte to a character
    const charArray = Array.from(uint8Array).map(byte => String.fromCharCode(byte));

    // Join the characters into a string and apply btoa()
    return btoa(charArray.join(''));
}

sendButton.onclick = async () => {
    // Block sending if the text is empty
    if (!inputToSend.value.trim()) {
        sendButton.textContent = 'Empty!';
        setTimeout(() => {
            sendButton.textContent = 'Send';
        }, 1500);
        return;
    }

    // Set button to "Sending..." and disable
    sendButton.textContent = 'Sending';
    sendButton.disabled = true;

    // Get public key base64 from URL hash
    if (!location.hash || location.hash.length < 2) {
        throw new Error('Missing public key in URL hash');
    }
    let publicKeyBase64 = location.hash.slice(1);

    // Check if publicKeyBase64 is valid base64 (URL-safe or standard)
    if (!/^[A-Za-z0-9\-_]+$/.test(publicKeyBase64)) {
        throw new Error('Invalid public key format in URL hash');
    }

    // Undo URL-safe Base64 encoding
    publicKeyBase64 = publicKeyBase64
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(publicKeyBase64.length + (4 - publicKeyBase64.length % 4) % 4, '=');
    // Convert base64 to ArrayBuffer
    const publicKeyArrayBuffer = base64ToArrayBuffer(publicKeyBase64);

    // Import recipient's public X25519 key
    const recipientPublicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeyArrayBuffer,
        {
            name: "X25519"
        },
        true,
        []
    );

    // Generate ephemeral X25519 key pair
    const ephemeralKeyPair = await window.crypto.subtle.generateKey(
        {
            name: "X25519"
        },
        true,
        ["deriveKey", "deriveBits"]
    );

    // Derive shared secret
    const aesKey = await window.crypto.subtle.deriveKey(
        {
            name: "X25519",
            public: recipientPublicKey
        },
        ephemeralKeyPair.privateKey,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );

    // Encrypt the data
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(inputToSend.value);

    // Generate random IV for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        aesKey,
        encodedData
    );

    // Export ephemeral public key
    const ephemeralPublicKeyArrayBuffer = await window.crypto.subtle.exportKey(
        "spki",
        ephemeralKeyPair.publicKey
    );
    const ephemeralPublicKeyBase64 = arrayBufferToBase64(ephemeralPublicKeyArrayBuffer);
    const ivBase64 = arrayBufferToBase64(iv);
    const encryptedDataBase64 = arrayBufferToBase64(encryptedData);

    // Convert ArrayBuffer to GUID for endpoint
    const id = await uint8ArrayToGuid(publicKeyArrayBuffer);
    const payload = {
        ephemeralPublicKey: ephemeralPublicKeyBase64,
        iv: ivBase64,
        encryptedDataBase64: encryptedDataBase64
    };

    try {
        const response = await fetch(`/.netlify/functions/send/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // Change button text to "Sent!" and clear input
            sendButton.textContent = 'Sent!';
            inputToSend.value = '';
            sendButton.disabled = false;

            // Add animation class
            sendButton.classList.add('sent-animate');

            // Remove animation class after animation ends (e.g. 600ms)
            setTimeout(() => {
                sendButton.classList.remove('sent-animate');
                sendButton.textContent = 'Send';
                sendButton.disabled = false;
            }, 1500);
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
        sendButton.textContent = 'Error!';
        sendButton.disabled = false;
        throw error;
    }
};


