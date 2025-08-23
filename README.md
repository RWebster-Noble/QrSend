# QR Send

QR Send is a simple web application that lets you send text or links from one device to another using QR codes and a real-time channel.

## How it works

1. Open [https://www.qrsend.net/](https://www.qrsend.net/) on your main device (e.g., your computer).
2. A unique QR code is generated. Scan it with your phone or open the link on another device.
3. On the second device, enter any text or link and press "Send".
4. The message instantly appears on your main device.

No sign-up or app installation required.

## Features

- Send text or links between devices instantly.
- Uses QR codes for easy device sharing.
- **End-to-end encryption** for all messages.
- Real-time updates using Pusher.
- Simple, privacy-friendly, and free.

## End-to-End Encryption

All messages sent through QR Send are protected with end-to-end encryption.  
This means:

- The message is encrypted in your browser before being sent.
- Only the receiver can decrypt and read the message.
- No third party, including the server, host or Pusher, can access your message contents.

The receiver's public encryption key is generated in the browser and shared only via the QR code or pairing link.  
For technical details, see the code in `web/main.js` and `web/send/send.js`.

## Usage

1. Go to [https://www.qrsend.net/](https://www.qrsend.net/).
2. Scan the QR code or open the link on another device.
3. Enter your message and send.

## Development

This project is designed to be deployed on [Netlify](https://www.netlify.com/).

To run the project locally:

1. **Create a [Pusher](https://pusher.com/) account** and create a new Channels app.

2. **Configure environment variables:**  
   Copy `.env.example` to `.env` and enter your Pusher Channels App keys (App ID, Key, Secret):

3. Install the [Netlify CLI](https://docs.netlify.com/cli/get-started/):

   ```
   npm install -g netlify-cli
   ```

4. Start the local development server:

   ```
   netlify dev
   ```

This will serve the site at `http://localhost:8888` and emulate Netlify Functions.

All static files are in the `web/` directory.

## License

MIT License
