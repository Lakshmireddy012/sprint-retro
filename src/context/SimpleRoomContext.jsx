import { useReducer, useCallback } from 'react';
import { retroService } from '../services/simpleService';
import { SimpleRoomContext } from './SimpleRoomContextDefinition';

const initialState = {
  currentRoom: null,
  currentUser: null,
  participants: [],
  stickyNotes: {
    'went-well': [],
    'to-improve': [],
    'action-items': [],
  },
  loading: false,
  error: null,
};

const roomReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoom: action.payload };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_PARTICIPANTS':
      return { ...state, participants: action.payload };
    case 'SET_STICKY_NOTES':
      return { ...state, stickyNotes: action.payload };
    case 'ADD_STICKY_NOTE': {
      const { stickyNote } = action.payload;
      const currentColumnNotes = state.stickyNotes[stickyNote.columnType] || [];
      
      // Check if note already exists to prevent duplicates
      const noteExists = currentColumnNotes.some(note => note.id === stickyNote.id);
      
      if (noteExists) {
        return state; // Don't add duplicate
      }
      
      return {
        ...state,
        stickyNotes: {
          ...state.stickyNotes,
          [stickyNote.columnType]: [...currentColumnNotes, stickyNote],
        },
      };
    }
    case 'UPDATE_STICKY_NOTE': {
      const { updatedNote } = action.payload;
      return {
        ...state,
        stickyNotes: {
          ...state.stickyNotes,
          [updatedNote.columnType]: state.stickyNotes[updatedNote.columnType].map(note =>
            note.id === updatedNote.id ? updatedNote : note
          ),
        },
      };
    }
    case 'DELETE_STICKY_NOTE': {
      const { stickyId } = action.payload;
      // Search through all columns to find and remove the note
      const updatedStickyNotes = { ...state.stickyNotes };
      for (const [columnType, notes] of Object.entries(updatedStickyNotes)) {
        const filteredNotes = notes.filter(note => note.id !== stickyId);
        if (filteredNotes.length !== notes.length) {
          // Found and removed the note from this column
          updatedStickyNotes[columnType] = filteredNotes;
          console.log(`Deleted note ${stickyId} from column ${columnType}`);
          break;
        }
      }
      return {
        ...state,
        stickyNotes: updatedStickyNotes,
      };
    }
    case 'TOGGLE_VOTE': {
      const { stickyId, columnType, voterName } = action.payload;
      return {
        ...state,
        stickyNotes: {
          ...state.stickyNotes,
          [columnType]: state.stickyNotes[columnType].map(note => {
            if (note.id === stickyId) {
              const hasVoted = note.votedBy.includes(voterName);
              return {
                ...note,
                votes: hasVoted ? note.votes - 1 : note.votes + 1,
                votedBy: hasVoted
                  ? note.votedBy.filter(voter => voter !== voterName)
                  : [...note.votedBy, voterName],
              };
            }
            return note;
          }),
        },
      };
    }
    default:
      return state;
  }
};

export const SimpleRoomProvider = ({ children }) => {
  const [state, dispatch] = useReducer(roomReducer, initialState);

  // Room operations
  const createRoom = useCallback(async (roomData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const result = await retroService.createRoom(
        roomData.name,
        roomData.password,
        roomData.creatorName
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      dispatch({ type: 'SET_CURRENT_ROOM', payload: result.room });
      dispatch({ type: 'SET_CURRENT_USER', payload: retroService.getCurrentUser() });

      return result.room;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const joinRoom = useCallback(async (roomId, password, userName) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const result = await retroService.joinRoom(roomId, password, userName);

      if (!result.success) {
        throw new Error(result.error);
      }

      dispatch({ type: 'SET_CURRENT_ROOM', payload: result.room });
      dispatch({ type: 'SET_CURRENT_USER', payload: retroService.getCurrentUser() });

      // Load room data
      const roomData = await retroService.getRoomData(roomId, password);
      if (roomData.success) {
        dispatch({ type: 'SET_PARTICIPANTS', payload: roomData.data.participants });
        
        // Organize sticky notes by column
        const organizedNotes = {
          'went-well': roomData.data.stickyNotes.filter(note => note.columnType === 'went-well'),
          'to-improve': roomData.data.stickyNotes.filter(note => note.columnType === 'to-improve'),
          'action-items': roomData.data.stickyNotes.filter(note => note.columnType === 'action-items'),
        };
        dispatch({ type: 'SET_STICKY_NOTES', payload: organizedNotes });
      }

      return result.room;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Admin joins their own room (no password needed)
  const joinAsAdmin = useCallback(async (roomId) => {
    const currentRoom = retroService.getCurrentRoom();
    const currentPassword = retroService.getCurrentPassword();
    const currentUser = retroService.getCurrentUser();

    if (!currentRoom || !currentPassword || !currentUser?.isAdmin) {
      throw new Error('Admin session not found');
    }

    // Admin already has session from room creation, just load room data
    try {
      const result = await retroService.getRoomData(roomId, null);
      if (!result.success) {
        throw new Error(result.error);
      }

      const { room, participants, stickyNotes } = result.data;
      
      dispatch({ type: 'SET_CURRENT_ROOM', payload: room });
      dispatch({ type: 'SET_PARTICIPANTS', payload: participants });

      // Organize sticky notes by column
      const organizedNotes = {
        'went-well': stickyNotes.filter(note => note.columnType === 'went-well'),
        'to-improve': stickyNotes.filter(note => note.columnType === 'to-improve'),
        'action-items': stickyNotes.filter(note => note.columnType === 'action-items'),
      };
      dispatch({ type: 'SET_STICKY_NOTES', payload: organizedNotes });

      return currentRoom;
    } catch {
      // Fallback to regular join if session expired
      return await joinRoom(roomId, currentPassword, currentUser.name);
    }
  }, [joinRoom]);

  // Try to restore session for a room
  const tryRestoreSession = useCallback(async (roomId) => {
    // If we already have room data for this room, don't reload
    if (state.currentRoom && state.currentRoom.id === roomId && state.currentUser) {
      console.log('Room data already loaded, skipping session restore');
      return true;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Check if we have a valid session for this room
      const isValidSession = await retroService.validateSessionForRoom(roomId);
      
      if (isValidSession) {
        // Session is valid, load room data
        const result = await retroService.getRoomData();
        if (result.success) {
          const { room, participants, stickyNotes } = result.data;
          
          dispatch({ type: 'SET_CURRENT_ROOM', payload: room });
          dispatch({ type: 'SET_CURRENT_USER', payload: retroService.getCurrentUser() });
          dispatch({ type: 'SET_PARTICIPANTS', payload: participants });

          // Organize sticky notes by column
          const organizedNotes = {
            'went-well': stickyNotes.filter(note => note.columnType === 'went-well'),
            'to-improve': stickyNotes.filter(note => note.columnType === 'to-improve'),
            'action-items': stickyNotes.filter(note => note.columnType === 'action-items'),
          };
          dispatch({ type: 'SET_STICKY_NOTES', payload: organizedNotes });
          
          console.log('Session restored successfully for room:', roomId);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
    
    return false;
  }, [state.currentRoom, state.currentUser]);

  const loadRoomData = useCallback(async (roomId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // With session tokens, we don't need to pass password
      const result = await retroService.getRoomData(roomId, null);
      if (!result.success) {
        throw new Error(result.error);
      }

      const { room, participants, stickyNotes } = result.data;
      
      dispatch({ type: 'SET_CURRENT_ROOM', payload: room });
      dispatch({ type: 'SET_PARTICIPANTS', payload: participants });

      // Organize sticky notes by column
      const organizedNotes = {
        'went-well': stickyNotes.filter(note => note.columnType === 'went-well'),
        'to-improve': stickyNotes.filter(note => note.columnType === 'to-improve'),
        'action-items': stickyNotes.filter(note => note.columnType === 'action-items'),
      };
      dispatch({ type: 'SET_STICKY_NOTES', payload: organizedNotes });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Sticky note operations
  const createStickyNote = useCallback(async (columnType, text) => {
    const currentRoom = retroService.getCurrentRoom();
    const currentUser = retroService.getCurrentUser();

    if (!currentRoom || !currentUser) {
      throw new Error('No room access');
    }

    try {
      // Updated to match the new secure service signature
      const result = await retroService.createStickyNote(
        currentRoom.id,
        null, // password not needed with session tokens
        currentUser.name,
        columnType,
        text
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Create the note object for immediate UI update
      const newNote = {
        id: result.noteId,
        text: text,
        author: currentUser.name,
        votes: 0,
        votedBy: [],
        createdAt: new Date().toISOString(),
        columnType: columnType,
      };

      // Immediately add to UI (real-time will also update, but this ensures immediate feedback)
      dispatch({ type: 'ADD_STICKY_NOTE', payload: { stickyNote: newNote } });

      return newNote;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const updateStickyNote = useCallback(async (stickyId, text) => {
    try {
      const result = await retroService.updateStickyNote(stickyId, text);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const deleteStickyNote = useCallback(async (stickyId) => {
    try {
      let columnType = null;
      
      for (const [col, notes] of Object.entries(state.stickyNotes)) {
        const found = notes.find(note => note.id === stickyId);
        if (found) {
          columnType = col;
          break;
        }
      }

      const result = await retroService.deleteStickyNote(stickyId);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Immediately update local state for instant UI feedback
      if (columnType) {
        dispatch({ 
          type: 'DELETE_STICKY_NOTE', 
          payload: { stickyId, columnType } 
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [state.stickyNotes]);

  const moveStickyNote = useCallback(async (stickyId, targetColumn) => {
    try {
      const result = await retroService.moveStickyNote(stickyId, targetColumn);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const toggleVote = useCallback(async (stickyId, columnType) => {
    const currentUser = retroService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user session');
    }

    try {
      const result = await retroService.toggleVote(stickyId, currentUser.name);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Update local state
      dispatch({ 
        type: 'TOGGLE_VOTE', 
        payload: { stickyId, columnType, voterName: currentUser.name } 
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // Real-time subscription
  const subscribeToRoom = useCallback((roomId) => {
    if (!roomId) return null;

    console.log('Setting up real-time subscription for room:', roomId);

    // Track last reload time to prevent too frequent reloads
    let lastReloadTime = 0;
    const RELOAD_THROTTLE = 1000; // 1 second throttle

    return retroService.subscribeToRoom(roomId, {
      onNotesChange: (payload) => {
        console.log('Real-time notes change received:', payload);
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        if (eventType === 'INSERT') {
          const formattedNote = {
            id: newRecord.id,
            text: newRecord.text || '',
            author: newRecord.author_name || 'Unknown',
            votes: newRecord.votes || 0,
            votedBy: newRecord.voted_by || [],
            createdAt: newRecord.created_at,
            columnType: newRecord.column_type,
          };
          
          // Always dispatch - React will handle deduplication
          dispatch({ type: 'ADD_STICKY_NOTE', payload: { stickyNote: formattedNote } });
        } else if (eventType === 'UPDATE') {
          const formattedNote = {
            id: newRecord.id,
            text: newRecord.text || '',
            author: newRecord.author_name || 'Unknown',
            votes: newRecord.votes || 0,
            votedBy: newRecord.voted_by || [], // Use the voted_by field from database
            createdAt: newRecord.created_at,
            columnType: newRecord.column_type,
          };
          dispatch({ type: 'UPDATE_STICKY_NOTE', payload: { updatedNote: formattedNote } });
        } else if (eventType === 'DELETE') {
          console.log('DELETE event received:', { oldRecord });
          
          dispatch({ 
            type: 'DELETE_STICKY_NOTE', 
            payload: { stickyId: oldRecord.id } 
          });
        }
      },
      onVotesChange: () => {
        // Vote changes are handled by local state updates in toggleVote
        // No need to reload entire room data for vote changes
        console.log('Vote change detected - handled by local state');
      },
      onParticipantsChange: () => {
        // Throttle reloads to prevent excessive API calls
        const now = Date.now();
        if (now - lastReloadTime < RELOAD_THROTTLE) {
          return;
        }
        lastReloadTime = now;

        const currentRoom = retroService.getCurrentRoom();
        if (currentRoom) {
          loadRoomData(currentRoom.id).catch(console.error);
        }
      },
    });
  }, [loadRoomData]);

  const contextValue = {
    state,
    dispatch,
    // Room operations
    createRoom,
    joinRoom,
    joinAsAdmin,
    loadRoomData,
    tryRestoreSession,
    // Sticky note operations
    createStickyNote,
    updateStickyNote,
    deleteStickyNote,
    moveStickyNote,
    toggleVote,
    // Real-time
    subscribeToRoom,
  };

  return (
    <SimpleRoomContext.Provider value={contextValue}>
      {children}
    </SimpleRoomContext.Provider>
  );
};

