import { initializeApp } from 'firebase/app';
import { getFlow } from 'firebase/ai-logic';

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Reference to the MediaRecorder and the AI Logic flow connection
let mediaRecorder = null;
let flowConnection = null;
let mediaStream = null;

/**
 * Starts microphone audio capture and streams to the voiceControlFlow.
 * @param {function(object|null): void} onCommandReceived - Callback function to be called with received JSON commands.
 * @returns {Promise<void>}
 */
export async function startVoiceControl(onCommandReceived) {
  try {
    // Get microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Create MediaRecorder to chunk audio
    // You might need to adjust the mimeType and time slice based on browser support and desired chunk size
    // Using 'audio/webm; codecs=opus' is a common and widely supported format.
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm; codecs=opus' });

    // Get the AI Logic flow using getFlow
    const voiceControlFlow = getFlow(app, 'voiceControlFlow');

    // Establish a real-time streaming connection to the flow using stream()
    flowConnection = voiceControlFlow.stream();

    // Handle incoming data from the flow
    // This loop will run continuously as data is streamed from the flow.
    for await (const output of flowConnection) {
      // Call the callback with the received command
      onCommandReceived(output);
    }

    // Event handler for when audio data is available from the MediaRecorder
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Send each audio chunk (Blob) to the flow
        flowConnection.send({ audioChunk: event.data });
      }
    };

    // Start the MediaRecorder with a time slice (e.g., 1 second)
    // The time slice determines how often the 'ondataavailable' event is fired with a chunk of audio.
    mediaRecorder.start(1000); // Chunk audio every 1000ms (1 second)

    console.log('Voice control started. Streaming audio to voiceControlFlow...');

  } catch (error) {
    console.error('Error starting voice control:', error);
    // Handle errors, e.g., permission denied or issues with the flow connection.
    if (onCommandReceived) {
        // Indicate an error to the client by sending a null command and the error message.
        onCommandReceived({ command: null, error: error.message });
    }
  }
}

/**
 * Stops microphone audio capture and closes the connection to the flow.
 */
export function stopVoiceControl() {
  // Check if MediaRecorder is active before stopping
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('MediaRecorder stopped.');
  }

  // Stop the media stream tracks (closes microphone access)
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    console.log('Microphone stream stopped.');
  }

  // Close the connection to the AI Logic flow
  if (flowConnection) {
    flowConnection.close();
    console.log('Flow connection closed.');
  }

  // Reset references
  mediaRecorder = null;
  flowConnection = null;
  mediaStream = null;

  console.log('Voice control stopped.');
}

// Export the functions as a module
export default {
  startVoiceControl,
  stopVoiceControl
};
import { initializeApp } from 'firebase/app';
import { getFlow } from 'firebase/ai-logic';

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Reference to the MediaRecorder and the AI Logic flow connection
let mediaRecorder = null;
let flowConnection = null;
let mediaStream = null;

/**
 * Starts microphone audio capture and streams to the voiceControlFlow.
 * @param {function(object|null): void} onCommandReceived - Callback function to be called with received JSON commands.
 * @returns {Promise<void>}
 */
export async function startVoiceControl(onCommandReceived) {
  try {
    // Get microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Create MediaRecorder to chunk audio
    // You might need to adjust the mimeType and time slice based on browser support and desired chunk size
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm; codecs=opus' });

    // Get the AI Logic flow
    const voiceControlFlow = getFlow(app, 'voiceControlFlow');

    // Establish a streaming connection to the flow
    flowConnection = voiceControlFlow.stream();

    // Handle incoming data from the flow
    for await (const output of flowConnection) {
      // Call the callback with the received command
      onCommandReceived(output);
    }

    // Start recording and sending data
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Send each audio chunk to the flow
        flowConnection.send({ audioChunk: event.data });
      }
    };

    // Start the MediaRecorder with a time slice (e.g., 1 second)
    mediaRecorder.start(1000); // Chunk audio every 1000ms (1 second)

    console.log('Voice control started.');

  } catch (error) {
    console.error('Error starting voice control:', error);
    // Handle errors, e.g., permission denied
    if (onCommandReceived) {
        onCommandReceived({ command: null, error: error.message }); // Indicate an error to the client
    }
  }
}

/**
 * Stops microphone audio capture and closes the connection to the flow.
 */
export function stopVoiceControl() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('MediaRecorder stopped.');
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    console.log('Microphone stream stopped.');
  }


  if (flowConnection) {
    flowConnection.close();
    console.log('Flow connection closed.');
  }

  mediaRecorder = null;
  flowConnection = null;
  mediaStream = null;
  console.log('Voice control stopped.');
}

// Export the functions
export default {
  startVoiceControl,
  stopVoiceControl
};