import { supabase } from '../lib/supabase';

/**
 * Simple Sprint Retro Service
 * No authentication - only password protection for rooms
 */
class SimpleRetroService {
  constructor() {
    this.currentRoom = null;
    this.currentPassword = null;
    this.currentUser = null;
    this.sessionToken = null;
    
    // Load session from sessionStorage on initialization
    this.loadSession();
  }

  // Session persistence methods
  saveSession() {
    const sessionData = {
      currentRoom: this.currentRoom,
      currentPassword: this.currentPassword,
      currentUser: this.currentUser,
      sessionToken: this.sessionToken,
      timestamp: Date.now()
    };
    sessionStorage.setItem('retro-session', JSON.stringify(sessionData));
  }

  loadSession() {
    try {
      const sessionData = sessionStorage.getItem('retro-session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        // Check if session is less than 24 hours old
        const isValid = parsed.timestamp && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isValid && parsed.sessionToken) {
          this.currentRoom = parsed.currentRoom;
          this.currentPassword = parsed.currentPassword;
          this.currentUser = parsed.currentUser;
          this.sessionToken = parsed.sessionToken;
          console.log('Session restored from storage');
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    return false;
  }

  clearSession() {
    this.currentRoom = null;
    this.currentPassword = null;
    this.currentUser = null;
    this.sessionToken = null;
    sessionStorage.removeItem('retro-session');
  }

  hasValidSession() {
    return !!(this.sessionToken && this.currentRoom && this.currentUser);
  }

  // Check if we have a valid session for a specific room
  async validateSessionForRoom(roomId) {
    if (!this.hasValidSession() || this.currentRoom.id !== roomId) {
      return false;
    }

    try {
      // Test the session by trying to get room data
      const result = await this.getRoomData();
      return result.success;
    } catch (error) {
      console.error('Session validation failed:', error);
      this.clearSession();
      return false;
    }
  }

  // ========================================
  // ROOM OPERATIONS - NO AUTHENTICATION
  // ========================================

  async createRoom(roomName, password, creatorName) {
    try {
      // Use secure function with proper password hashing
      const { data, error } = await supabase.rpc('secure_create_room', {
        room_name: roomName,
        room_password: password,
        creator_name: creatorName
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Store room info and session token
      this.currentRoom = {
        id: result.room_id,
        name: result.room_name
      };
      this.currentPassword = password;
      this.currentUser = { name: creatorName, isAdmin: true };
      this.sessionToken = result.session_token;

      // Save session to sessionStorage
      this.saveSession();

      return {
        success: true,
        room: this.currentRoom
      };
    } catch (error) {
      console.error('Create room error:', error);
      return { success: false, error: error.message };
    }
  }

  async joinRoom(roomId, password, userName) {
    try {
      // Use secure function with proper password validation
      const { data, error } = await supabase.rpc('secure_join_room', {
        room_id: roomId,
        room_password: password,
        user_name: userName
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Store room info and session token
      this.currentRoom = {
        id: result.room_id,
        name: result.room_name
      };
      this.currentPassword = password;
      this.currentUser = { name: userName, isAdmin: false };
      this.sessionToken = result.session_token;

      // Save session to sessionStorage
      this.saveSession();

      return {
        success: true,
        room: this.currentRoom
      };
    } catch (error) {
      console.error('Join room error:', error);
      return { success: false, error: error.message };
    }
  }

  async getRoomData() {
    try {
      // Use session token if available, otherwise fall back to password
      const { data, error } = await supabase.rpc('secure_get_room_data', {
        session_token: this.sessionToken
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: {
          room: result.room,
          participants: result.participants,
          stickyNotes: this.formatStickyNotes(result.sticky_notes)
        }
      };
    } catch (error) {
      console.error('Get room data error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // STICKY NOTES OPERATIONS
  // ========================================

  async createStickyNote(roomId, password, authorName, columnType, text) {
    try {
      const { data, error } = await supabase.rpc('secure_add_sticky_note', {
        session_token: this.sessionToken,
        note_text: text,
        column_type: columnType
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true, noteId: result.note_id };
    } catch (error) {
      console.error('Create sticky note error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateStickyNote(noteId, text) {
    try {
      // Validate session before attempting update
      if (!this.sessionToken) {
        throw new Error('No valid session token');
      }

      console.log('Updating sticky note:', { noteId, text, sessionToken: !!this.sessionToken });

      const { data, error } = await supabase.rpc('secure_update_sticky_note', {
        session_token: this.sessionToken,
        note_id: noteId,
        new_text: text
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('Update sticky note result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Update sticky note error:', error);
      
      // If session is invalid, clear it
      if (error.message.includes('session') || error.message.includes('token')) {
        this.clearSession();
      }
      
      return { success: false, error: error.message };
    }
  }

  async deleteStickyNote(noteId) {
    try {
      const { data, error } = await supabase.rpc('secure_delete_sticky_note', {
        session_token: this.sessionToken,
        note_id: noteId
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (error) {
      console.error('Delete sticky note error:', error);
      return { success: false, error: error.message };
    }
  }

  async moveStickyNote(noteId, targetColumn) {
    try {
      const { data, error } = await supabase.rpc('secure_move_sticky_note', {
        session_token: this.sessionToken,
        note_id: noteId,
        new_column_type: targetColumn
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (error) {
      console.error('Move sticky note error:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleVote(noteId) {
    try {
      const { data, error } = await supabase.rpc('secure_toggle_vote', {
        session_token: this.sessionToken,
        note_id: noteId
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true, votes: result.votes };
    } catch (error) {
      console.error('Toggle vote error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // REAL-TIME SUBSCRIPTIONS
  // ========================================

  subscribeToRoom(roomId, callbacks) {
    console.log('Setting up real-time subscription for room:', roomId);

    const roomChannel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sticky_notes',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Sticky note change received in service:', payload);
          if (callbacks.onNotesChange) {
            console.log('Calling onNotesChange callback with:', payload);
            callbacks.onNotesChange(payload);
          } else {
            console.log('No onNotesChange callback provided');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sticky_votes'
        },
        (payload) => {
          console.log('Vote change:', payload);
          if (callbacks.onVotesChange) {
            callbacks.onVotesChange(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Participant change:', payload);
          if (callbacks.onParticipantsChange) {
            callbacks.onParticipantsChange(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return {
      unsubscribe: () => {
        console.log('Unsubscribing from real-time updates');
        supabase.removeChannel(roomChannel);
      }
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  formatStickyNotes(stickyNotes) {
    if (!Array.isArray(stickyNotes)) {
      return [];
    }

    return stickyNotes.map(note => ({
      id: note.id,
      text: note.text || '',
      author: note.author_name || 'Unknown',
      votes: note.votes || 0,
      votedBy: Array.isArray(note.voted_by) ? note.voted_by : [],
      createdAt: note.created_at,
      columnType: note.column_type,
    }));
  }

  // Get current session info
  getCurrentRoom() {
    return this.currentRoom;
  }

  getCurrentPassword() {
    return this.currentPassword;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Export singleton instance
export const retroService = new SimpleRetroService();
