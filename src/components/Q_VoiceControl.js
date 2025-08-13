import React, { useState, useEffect } from 'react';
import { startVoiceControl, stopVoiceControl } from './VoiceControl'; // Assuming VoiceControl.js is in the same directory

const Q_VoiceControl = () => {
  // useState is a React hook that allows functional components to have state.
  // isListening is the state variable, initialized to false.
  // setIsListening is the function to update the isListening state.
  const [isListening, setIsListening] = useState(false);

  // useEffect is a React hook that performs side effects in functional components.
  // It runs after every render. The second argument ([isListening]) is a dependency array.
  // The effect will only re-run if the value of isListening changes.
  useEffect(() => {
    let stopListeningFunc; // To hold the stop function returned by startVoiceControl

    if (isListening) {
      console.log('Starting voice control...');
      // Start the voice control flow.
      // The callback function receives commands from the AI.
      startVoiceControl((command) => {
        console.log('Command received:', command);
        if (command && command.command === 'scroll_down' && command.speed === 'medium') {
          // Perform smooth scrolling when the command is received.
          window.scrollBy({
            top: window.innerHeight * 0.75, // Scroll down by 75% of the window height
            behavior: 'smooth'
          });
        }
      })
      .then(stopFunc => {
        // Store the function to stop the voice control
        stopListeningFunc = stopFunc;
      })
      .catch(error => {
        console.error('Error starting voice control:', error);
        setIsListening(false); // Stop listening state if there's an error
      });
    } else {
      console.log('Stopping voice control...');
      // Stop the voice control if the state changes to false.
      stopVoiceControl();
    }

    // The cleanup function runs when the component unmounts or before the effect re-runs
    // due to a dependency change (in this case, isListening changing from true to false).
    return () => {
      if (stopListeningFunc) {
         console.log('Cleaning up voice control...');
         stopListeningFunc(); // Ensure stopVoiceControl is called on cleanup
      } else {
         // If startVoiceControl didn't complete successfully to return stopFunc
         stopVoiceControl();
      }
    };
  }, [isListening]); // Dependency array: re-run the effect when isListening changes

  const toggleListening = () => {
    setIsListening(prevIsListening => !prevIsListening);
  };

  return (
    <div>
      {/* Button to toggle the listening state */}
      <button onClick={toggleListening}>
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>
    </div>
  );
};

export default Q_VoiceControl;