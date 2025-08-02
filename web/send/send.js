window.ReverseQR = window.ReverseQR || {};

const inputToSend = document.getElementById('inputToSend');
const sendButton = document.getElementById('sendButton');
const sendResult = document.getElementById('sendResult');

sendButton.onclick = async () => {
    try {
        const payload = { data: inputToSend.value };
        const id = location.hash.slice(1);
        const response = await fetch(`/.netlify/functions/send/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        sendResult.style.display = 'inline';

        if (response.ok) {
            sendResult.textContent = `Send successful`;
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
        sendResult.style.display = 'inline';
        sendResult.textContent = `Error: ${error.message}`;
    }
};

let count = 0;
incrementButton.onclick = () => {
    count++;
    counter.textContent = `Count: ${count}`;
};

(async function () {
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

    let keyPair;
    // Generate and store keys in localStorage if not present
    let privateKeyBase64 = localStorage.getItem('privateKey');
    let publicKeyBase64 = localStorage.getItem('publicKey');


    if (!privateKeyBase64 || !publicKeyBase64) {
        keyPair = await window.crypto.subtle.generateKey(
            { name: "Ed25519" },
            true,
            ["sign", "verify"]
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
        localStorage.setItem('publicKey', publicKeyBase64);
    } else {
        // Import private key
        const privateKeyArrayBuffer = base64ToArrayBuffer(privateKeyBase64);
        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            privateKeyArrayBuffer,
            { name: "Ed25519" },
            true,
            ["sign"]
        );
        // Import public key
        const publicKeyArrayBuffer = base64ToArrayBuffer(publicKeyBase64);
        const publicKey = await window.crypto.subtle.importKey(
            "spki",
            publicKeyArrayBuffer,
            { name: "Ed25519" },
            true,
            ["verify"]
        );
        keyPair = { privateKey, publicKey };
    }

    window.ReverseQR.keyPair = keyPair;
    
    const qrCodeUrl = `${window.location.href}/send?p=${publicKeyBase64}`;
    console.log("QR Code URL:", qrCodeUrl);
    new QRCode(document.getElementById("qrcode"), {
        text: qrCodeUrl,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
})();


