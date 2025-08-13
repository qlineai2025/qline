// src/components/AssistModeProvider.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Create a React Context for providing the assist mode functions
const AssistModeContext = createContext(null);

// Custom hook to easily access the Assist Mode Context
export const useAssistMode = () => {
  // Check if code is running on the server
  if (typeof window === 'undefined') {
    // Return a safe default object for server-side rendering
    return {
      isPresenterWindowOpen: false,
      // Provide no-op functions to prevent errors
      launchPresenterWindow: () => console.warn('launchPresenterWindow called on server'),
      sendMessage: () => console.warn('sendMessage called on server'),
    };
  }
  return useContext(AssistModeContext);
};

const AssistModeProvider = ({ children, getInitialState }) => {
  // State to track if assist mode is active (i.e., presenter window is launched)
  const [isPresenterWindowOpen, setIsPresenterWindowOpen] = useState(false);
  // Ref to hold the BroadcastChannel instance
  const channelRef = useRef(null);
  // Ref to hold the presenter window reference
  const presenterWindowRef = useRef(null);

  // useEffect to initialize and manage the BroadcastChannel
  useEffect(() => {
    // Only execute browser-specific logic on the client side
    if (typeof window !== 'undefined') {
      // Create a new BroadcastChannel with a specific name
      // BroadcastChannel allows communication between different browser windows/tabs with the same origin
      const assistChannel = new BroadcastChannel('teleprompter_channel');
      channelRef.current = assistChannel;

      // Event listener for messages received on the BroadcastChannel
      const handleMessage = (event) => {
        console.log('Received message on BroadcastChannel:', event.data);
        // Update state based on the received message
        // In a real app, you'd handle specific message types/actions here
        // Example: if (event.data.type === 'presenter-ready') { console.log('Presenter window is ready to receive state'); }
        // Add more message handling logic for synchronizing script, position, etc.
      };

      // Attach the message listener
      assistChannel.addEventListener('message', handleMessage);

      // Cleanup function: close the BroadcastChannel when the component unmounts
      return () => {
        if (channelRef.current) {
          console.log('Closing BroadcastChannel');
          channelRef.current.removeEventListener('message', handleMessage);
          channelRef.current.close();
          channelRef.current = null;
        }
        // Also clear the interval if it's running
        if (presenterWindowRef.current && presenterWindowRef.current.checkIntervalId) {
             clearInterval(presenterWindowRef.current.checkIntervalId);
        }
      };
    }
  }, []); // Empty dependency array means this effect runs only once on mount and cleans up on unmount

  // Function to send messages to the BroadcastChannel
  const sendMessage = useCallback((message) => {
    // Only execute browser-specific logic on the client side
    if (typeof window !== 'undefined' && channelRef.current) {
      console.log('Sending message on BroadcastChannel:', message);
      channelRef.current.postMessage(message);
    } else if (typeof window !== 'undefined') {
      console.warn('BroadcastChannel not initialized. Cannot send message.');
    }
  }, [channelRef]); // Dependency array includes channelRef

  // Function to launch the presenter window (and handle its lifecycle)
  const launchPresenterWindow = useCallback(() => {
    // Only execute browser-specific logic on the client side
    if (typeof window !== 'undefined') {
      // Check if the window is already open or was closed
      if (!presenterWindowRef.current || presenterWindowRef.current.closed) {
        // Open a new window to the presenter route
        const newWindow = window.open('/presenter', '_blank');
        presenterWindowRef.current = newWindow;

        // Set the state to indicate the window is open
        setIsPresenterWindowOpen(true);

        if (newWindow) {
          // Add an event listener to detect when the new window is closed by the user
          const checkWindowClosed = setInterval(() => {
              // Check if the window object itself has been closed
              if (newWindow.closed) {
                  console.log('Presenter window closed detected.');
                  setIsPresenterWindowOpen(false);
                  presenterWindowRef.current = null;
                  clearInterval(checkWindowClosed);
                  // Optionally inform other windows that assist mode is now inactive
                  sendMessage({ type: 'presenter-status', isOpen: false });
              }
          }, 1000); // Check every second

          // Store the interval ID on the window object for cleanup
          newWindow.checkIntervalId = checkWindowClosed;

          // Send initial state after a small delay to allow the channel to initialize in the new window
          // Ensure both the channel is available and a function to get initial state is provided
          if (channelRef.current && getInitialState) {
               setTimeout(() => {
                   const initialState = getInitialState(); // Get initial state from the parent
                   sendMessage({ type: 'initial-state', payload: initialState });
                   sendMessage({ type: 'presenter-status', isOpen: true });
               }, 500); // Adjust delay if needed
          }
        }
      } else {
        // If window is already open, attempt to focus it
        presenterWindowRef.current.focus();
      }
    }
  }, [getInitialState, sendMessage, channelRef]); // Dependency array includes necessary values

  // Provide the state and functions via Context
  const value = {
    isPresenterWindowOpen,
    sendMessage,
    launchPresenterWindow,
  };

  return (
    <AssistModeContext.Provider value={value}>
      {children}
      {/* Render the Launch Presenter Window button here */}
      {/* It's often better to use the hook and render the button in a specific control component */}
      {/* This is included here for demonstration purposes */}
       <TooltipProvider>
         <Tooltip>
           <TooltipTrigger asChild>
             <Button onClick={launchPresenterWindow} disabled={isPresenterWindowOpen}>
               {isPresenterWindowOpen ? 'Presenter Window Open' : 'Launch Presenter Window'}
             </Button>
           </TooltipTrigger>
           <TooltipContent>{isPresenterWindowOpen ? 'The presenter window is open.' : 'Open the separate presenter window.'}</TooltipContent>
         </Tooltip>
       </TooltipProvider>
    </AssistModeContext.Provider>
  );
};

export default AssistModeProvider;