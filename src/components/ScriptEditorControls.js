// src/components/ScriptEditorControls.js
import React, { useState, useRef, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app'; // Assuming you've initialized Firebase app elsewhere

// Get a reference to the functions service (assuming Firebase app is initialized)
const functions = getFunctions(getApp());

// Get a reference to the assistWithScript callable function
const assistWithScriptCallable = httpsCallable(functions, 'assistWithScript');

const ScriptEditorControls = ({ fullText, onScriptUpdated }) => {
  // State to manage the visibility and position of the custom context menu
  const [contextMenu, setContextMenu] = useState(null);

  // Ref to get the script editor textarea element
  const editorRef = useRef(null);

  // Async function to handle the general AI cleanup
  const handleAiCleanup = async () => {
    try {
      // Call the assistWithScript flow with full text and cleanup instruction
      const result = await assistWithScriptCallable({
        fullText: fullText,
        instruction: 'cleanup formatting',
      });
      const editedText = result.data.editedText;
      console.log('AI Cleanup result:', editedText);
      // Call the onScriptUpdated prop with the cleaned text
      onScriptUpdated(editedText);
    } catch (error) {
      console.error('Error during AI Cleanup:', error);
      // TODO: Handle the error gracefully in the UI
    }
  };

  // Function to handle opening the custom context menu
  const handleContextMenu = (event) => {
    // Prevent the browser's default context menu from appearing
    event.preventDefault();

    // Set the position of the custom context menu based on the mouse click
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
    });
  };

  // Effect to handle clicks outside the context menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the context menu
      if (contextMenu !== null && !event.target.closest('.custom-context-menu')) {
        setContextMenu(null); // Close the context menu
      }
    };

    // Add the event listener when the context menu is open
    document.addEventListener('click', handleClickOutside);

    // Cleanup the event listener when the component unmounts or context menu closes
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]); // Re-run effect when contextMenu state changes

  // Function to handle an action from the custom context menu
  const handleContextMenuItemClick = async (instruction) => {
    setContextMenu(null); // Close the context menu

    // Get the selected text from the textarea
    const textarea = editorRef.current;
    const selectionText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);

    // Only proceed if there is selected text and an instruction
    if (!selectionText || !instruction) {
      console.warn('No text selected or instruction provided for context menu action.');
      return;
    }

    try {
      // Call the assistWithScript flow with full text, selection, and instruction
      const result = await assistWithScriptCallable({
        fullText: fullText,
        selectionText: selectionText,
        instruction: instruction,
      });
      const editedText = result.data.editedText;
      console.log(`${instruction} result:`, editedText);
      // TODO: Apply the edited text back to the textarea at the correct position
      // For now, we'll just call onScriptUpdated with the full text updated (might need refinement)
      // A more robust solution would replace the selected text with editedText.
       const newFullText = fullText.substring(0, textarea.selectionStart) + editedText + fullText.substring(textarea.selectionEnd);
       onScriptUpdated(newFullText);

    } catch (error) {
      console.error(`Error during ${instruction}:`, error);
      // TODO: Handle the error gracefully in the UI
    }
  };


  return (
    <div>
      {/* AI Cleanup Button */}
      <button onClick={handleAiCleanup}>AI Cleanup</button>

      {/* Script Editor Textarea */}
      {/* Attach the ref and the onContextMenu event handler */}
      <textarea
        ref={editorRef}
        value={fullText}
        onChange={(e) => onScriptUpdated(e.target.value)}
        onContextMenu={handleContextMenu}
        style={{ width: '100%', height: '300px' }} // Basic styling
      />

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="custom-context-menu"
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.3)',
            zIndex: 1000, // Ensure it's above other elements
          }}
        >
          <div
            style={{ padding: '8px', cursor: 'pointer' }}
            onClick={() => handleContextMenuItemClick('Fix spelling and grammar')}
          >
            Fix Spelling & Grammar
          </div>
          <div
             style={{ padding: '8px', cursor: 'pointer' }}
            onClick={() => handleContextMenuItemClick('Rewrite for clarity')}
          >
            Rewrite for Clarity
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptEditorControls;