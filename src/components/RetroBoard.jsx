import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Share2 } from 'lucide-react';
import { useSimpleRoom } from '../hooks/useSimpleRoom';
import Column from './Column';
import StickyNote from './StickyNote';

const RetroBoard = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { 
    state, 
    loadRoomData, 
    tryRestoreSession,
    createStickyNote, 
    updateStickyNote, 
    deleteStickyNote, 
    moveStickyNote, 
    toggleVote,
    subscribeToRoom 
  } = useSimpleRoom();
  const [editingSticky, setEditingSticky] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    let subscription = null;

    // Load room data when component mounts
    const loadData = async () => {
      try {
        // First try to restore session
        const sessionRestored = await tryRestoreSession(roomId);
        
        if (!sessionRestored) {
          // If session restoration failed, try loading room data normally
          await loadRoomData(roomId);
        }
        
        // Only set up subscriptions if component is still mounted and we have room data
        if (isMounted) {
          subscription = subscribeToRoom(roomId);
        }
      } catch (error) {
        console.error('Failed to load room data:', error);
        if (isMounted) {
          // Room access denied or doesn't exist, redirect to join page with room ID
          navigate(`/join-room?roomId=${roomId}`);
        }
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, navigate]); // Functions from context are stable and don't need to be in dependencies

  // Show loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading room...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <p className="text-lg font-semibold">Error loading room</p>
            <p className="text-sm">{state.error}</p>
          </div>
          <Link
            to="/join-room"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Join Room
          </Link>
        </div>
      </div>
    );
  }

  // Redirect if no current room or user (but not loading)
  if (!state.currentRoom || !state.currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-700 text-lg mb-4">Room not found or access denied</p>
          <Link
            to="/join-room"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Join a Room
          </Link>
        </div>
      </div>
    );
  }

  const handleCreateSticky = async (columnId, event) => {
    // Prevent creating sticky if clicking on existing sticky or buttons
    if (event.target.closest('.sticky-note') || event.target.closest('button')) {
      return;
    }

    // Safety check
    if (!state.currentUser || !state.currentRoom || state.loading) {
      return;
    }

    try {
      const newSticky = await createStickyNote(columnId, '');
      if (newSticky) {
        setEditingSticky(newSticky.id);
        setEditText('');
      }
    } catch (error) {
      console.error('Error creating sticky note:', error);
    }
  };

  const handleSaveSticky = async (stickyId) => {
    if (!state.currentRoom || state.loading) return;
    
    try {
      // Always update the sticky text, even if empty
      await updateStickyNote(stickyId, editText.trim());
    } catch (error) {
      console.error('Error saving sticky note:', error);
    }
    
    setEditingSticky(null);
    setEditText('');
  };

  const handleStartEditing = (sticky) => {
    if (!sticky || !state.currentRoom) return;
    setEditingSticky(sticky.id);
    setEditText(sticky.text);
  };

  const handleVoteSticky = async (stickyId, columnId) => {
    if (!state.currentRoom || state.loading) return;
    
    try {
      await toggleVote(stickyId, columnId);
    } catch (error) {
      console.error('Error toggling vote:', error);
    }
  };

  const handleDeleteSticky = async (stickyId) => {
    if (!state.currentRoom || state.loading) return;
    
    try {
      await deleteStickyNote(stickyId);
    } catch (error) {
      console.error('Error deleting sticky note:', error);
    }
  };

  const handleMoveSticky = async (stickyId, sourceColumn, targetColumn, targetIndex) => {
    if (!state.currentRoom || state.loading) return;
    
    try {
      await moveStickyNote(stickyId, sourceColumn, targetColumn, targetIndex);
    } catch (error) {
      console.error('Error moving sticky note:', error);
    }
  };

  const copyRoomUrl = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 mb-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{state.currentRoom.name}</h1>
                <p className="text-gray-500 text-sm">
                  Room ID: {roomId?.slice(0, 8)}...
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={copyRoomUrl}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4 text-gray-600" />
                <span className="hidden sm:inline text-gray-700">Share</span>
              </button>
              
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-md">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700 text-sm">
                  {state.participants.length} participant{state.participants.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-600 text-sm font-medium">Participants:</span>
            <div className="flex flex-wrap gap-2">
              {state.participants.map((participant, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                >
                  {participant.name}
                  {participant.name === state.currentUser?.name && ' (You)'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            💡 <strong>How to use:</strong> Click anywhere in a column to create a sticky note and start typing. Click on existing notes to edit them. Drag notes between columns to move them.
          </p>
        </div>

        {/* Retro Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Object.entries({
            'went-well': { title: 'What Went Well', items: state.stickyNotes['went-well'] },
            'to-improve': { title: 'To Improve', items: state.stickyNotes['to-improve'] },
            'action-items': { title: 'Action Items', items: state.stickyNotes['action-items'] },
          }).map(([columnId, column]) => (
            <Column
              key={columnId}
              id={columnId}
              title={column.title}
              items={column.items}
              onMoveSticky={handleMoveSticky}
              onCreateSticky={handleCreateSticky}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="space-y-3">
                {column.items
                  .sort((a, b) => b.votes - a.votes) // Sort by votes descending
                  .map((item) => (
                    <StickyNote
                      key={item.id}
                      sticky={item}
                      columnId={columnId}
                      onVote={() => handleVoteSticky(item.id, columnId)}
                      onDelete={() => handleDeleteSticky(item.id)}
                      currentUser={state.currentUser}
                      isEditing={editingSticky === item.id}
                      editText={editText}
                      onEditChange={setEditText}
                      onSave={handleSaveSticky}
                      onStartEdit={handleStartEditing}
                    />
                  ))}
              </div>
            </Column>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-4 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-2 text-gray-600 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live collaboration active</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="text-gray-600 text-sm">
              Total notes: {Object.values(state.stickyNotes).reduce((total, col) => total + col.length, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetroBoard;
