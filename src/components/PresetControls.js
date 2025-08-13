// src/components/PresetControls.js
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { useAuth } from '/src/components/AuthProvider'; // Assuming AuthProvider is in the same directory

// Import shadcn/ui components
import { Button } from "/src/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "/src/components/ui/popover";
import { Input } from "/src/components/ui/input";
import { ScrollArea } from "/src/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "/src/components/ui/tooltip";

// Import icons
import { Save, Check, Search, Trash2, RotateCcw } from "lucide-react";

// Get references to Firebase services
// Initialize Firebase app if not already initialized (should be in a higher-level component)
const app = getApp(); // Assumes Firebase app is initialized elsewhere
const db = getFirestore(app);
// const auth = getAuth(app); // auth reference is not used directly in this component's logic

const PresetControls = ({ currentSettings, onSettingsLoaded }) => {
  // Use useAuth hook to get the current user
  const { user, loading: authLoading } = useAuth();

  // State variables
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState([]);

  // useEffect to fetch presets when component mounts or user changes
  useEffect(() => {
    const fetchPresets = async () => {
      if (user) {
        setIsLoading(true);
        try {
          // Get the presets collection for the current user
          const userPresetsRef = collection(db, 'users', user.uid, 'presets');
          const querySnapshot = await getDocs(userPresetsRef);
          const fetchedPresets = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPresets(fetchedPresets);
        } catch (error) {
          console.error('Error fetching presets:', error);
          // TODO: Handle error in UI
        }
      } else {
        // Clear presets if user is not logged in
        setPresets([]);
      }
    };

    fetchPresets();
    // setIsLoading(false); // This should ideally happen after the fetchPresets call completes within the async function
    // No cleanup needed for this effect's subscription
  }, [user]); // Rerun effect when user changes

  // Function to save the current settings as a preset
  const savePreset = async () => {
    if (!user) {
      console.error('User not authenticated.');
      // TODO: Show error message in UI
      return;
    }
    if (!presetName.trim()) {
        console.error('Preset name cannot be empty.');
        // TODO: Show error message in UI
        return;
    }

    try {
      // Add a new document to the user's presets subcollection
      const docRef = await addDoc(collection(db, 'users', user.uid, 'presets'), {
        name: presetName.trim(),
        settings: currentSettings, // Save the current settings
        createdAt: new Date() // Optional: Add a timestamp
      });
      console.log('Preset saved with ID:', docRef.id);
      // Add the new preset to the local state to update the list immediately
      setPresets(prevPresets => [...prevPresets, { id: docRef.id, name: presetName.trim(), settings: currentSettings }]);
      setPresetName(''); // Clear the input field
      setIsSavePopoverOpen(false); // Close the popover after saving
    } catch (error) {
      console.error('Error saving preset:', error);
      // TODO: Handle error in UI (e.g., show a toast notification)
    }
  };

  // Function to load a selected preset
  const loadPreset = (preset) => {
    // Call the callback prop with the loaded settings
    if (onSettingsLoaded) {
      onSettingsLoaded(preset.settings);
    }
  };

  // Function to delete a preset
  const deletePreset = async (presetId) => {
    if (!user) {
      console.error('User not authenticated.');
      // TODO: Show error message in UI
      return;
    }

    try {
      // Delete the document from the user's presets subcollection
      await deleteDoc(doc(db, 'users', user.uid, 'presets', presetId));
      console.log('Preset deleted with ID:', presetId);
      // Remove the preset from the local state
      setPresets(presets.filter(preset => preset.id !== presetId));
    } catch (error) {
      console.error('Error deleting preset:', error);
      // TODO: Handle error in UI
    }
    setIsLoading(false);
  };

  // // Show loading state if authenticating or performing Firestore operations
  // if (authLoading) {
  //   return <p>Loading user...</p>; // Auth loading handled by AuthProvider consumer
  // }

  return (
    <div>
      {/* Save Preset UI (only for authenticated users) */}
      {user ? (
        <div>
          {/* Save Preset Popover */}
          <Popover open={isSavePopoverOpen} onOpenChange={setIsSavePopoverOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Save className="h-4 w-4" />
                      <span className="sr-only">Save Preset</span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save Current Settings as Preset</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Save Preset</h4>
                  <p className="text-sm text-muted-foreground">
                    Enter a name for your current settings.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Input
                    id="presetName"
                    placeholder="Preset Name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        savePreset();
                      }
                    }}
                  />
                  <Button onClick={savePreset} disabled={isLoading || !presetName.trim()}>
                    {isLoading ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Load Preset Dropdown/List (Using Popover for demonstration) */}
          <Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isLoading || presets.length === 0}>
                       {isLoading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                       <span className="sr-only">Load Preset</span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                 <TooltipContent>
                  <p>Load a Saved Preset</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-80 p-0">
              <ScrollArea className="h-48">
                <div className="grid gap-1 p-2">
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md">
                      <span>{preset.name}</span>
                      <div>
                        <Button variant="ghost" size="sm" onClick={() => loadPreset(preset)} className="mr-1">
                          Load
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)} disabled={isLoading}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                           <span className="sr-only">Delete Preset</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

        </div>
      ) : (
        <p>Sign in to save and load presets.</p>
      )}

    </div>
  );
};

export default PresetControls;