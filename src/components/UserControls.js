// src/components/UserControls.js
import React from 'react';
import { useAuth } from './AuthProvider'; // Assuming AuthProvider is in the same directory
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app'; // Assuming Firebase app is initialized elsewhere

// Get a reference to the functions service (ensure Firebase app is initialized before this component renders)
const functions = getFunctions(getApp());

// Get a reference to the callable function
const importDoc = httpsCallable(functions, 'importFromGoogleDocs');

const UserControls = () => {
  // Use the useAuth hook to get the current authentication state and functions
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

  // Show a loading indicator while authentication state is being determined
  if (loading) {
    return <p>Loading user controls...</p>;
  }

  // Async function to handle importing from Google Docs
  const handleImportFromGoogleDocs = async () => {
    try {
      // Call the Cloud Function with a placeholder fileId
      // TODO: Replace 'YOUR_GOOGLE_DOC_FILE_ID' with a way to get the actual file ID
      const result = await importDoc({ fileId: 'YOUR_GOOGLE_DOC_FILE_ID' });
      console.log('Import result:', result.data);
      // You can process the imported text here, e.g., update state or display it
    } catch (error) {
      console.error('Error importing from Google Docs:', error);
      // Handle errors, e.g., display an error message to the user
    }
  };

  // Conditionally render buttons based on authentication state
  return (
    <div>
      {user ? (
        // If user is authenticated
        <div>
          <p>Welcome, {user.displayName}</p>
          <button onClick={signOutUser}>Sign Out</button>
          {/* Button to trigger the Google Docs import Cloud Function */}
          <button onClick={handleImportFromGoogleDocs}>Import from Google Docs</button>
        </div>
      ) : (
        // If no user is authenticated
        <div>
          <button onClick={signInWithGoogle}>Sign in with Google</button>
        </div>
      )}
    </div>
  );
};

export default UserControls;