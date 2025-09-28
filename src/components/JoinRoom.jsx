import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useSimpleRoom } from '../hooks/useSimpleRoom';

const JoinRoom = () => {
  const [formData, setFormData] = useState({
    roomId: '',
    name: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { joinRoom, tryRestoreSession } = useSimpleRoom();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if there's a room ID in the URL params
    const roomIdFromUrl = searchParams.get('roomId');
    if (roomIdFromUrl) {
      setFormData(prev => ({ ...prev, roomId: roomIdFromUrl }));
      
      // Try to restore session for this room
      tryRestoreSession(roomIdFromUrl).then((restored) => {
        if (restored) {
          // Session restored successfully, redirect to room
          navigate(`/room/${roomIdFromUrl}`);
        }
      }).catch(console.error);
    }
  }, [searchParams, tryRestoreSession, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.roomId.trim()) {
      newErrors.roomId = 'Room ID or URL is required';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Your name is required';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Room password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // const extractRoomId = (input) => {
  //   // If it's a full URL, extract the room ID
  //   if (input.includes('/room/')) {
  //     const match = input.match(/\/room\/([^/?]+)/);
  //     return match ? match[1] : input;
  //   }
  //   return input;
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    
    try {
      // const roomId = extractRoomId(formData.roomId.trim());
      
      await joinRoom(formData.roomId, formData.password, formData.name.trim());
      
      // Navigate to the room on successful join
      navigate(`/room/${formData.roomId}`);
    } catch (error) {
      if (error.message.includes('Room not found')) {
        setErrors({ roomId: 'Room not found. Please check the room ID or URL.' });
      } else if (error.message.includes('Invalid password')) {
        setErrors({ password: 'Incorrect password. Please try again.' });
      } else {
        setErrors({ general: 'An error occurred while joining the room.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Join Room</h1>
          <p className="text-gray-600">Enter the room details to join the retrospective</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-800 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                Room ID or URL
              </label>
              <input
                type="text"
                id="roomId"
                name="roomId"
                value={formData.roomId}
                onChange={handleInputChange}
                placeholder="Paste room URL or enter room ID"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.roomId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              />
              {errors.roomId && (
                <p className="mt-1 text-sm text-red-600">{errors.roomId}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                You can paste the full room URL or just the room ID
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Room Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter room password"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Joining...
                </>
              ) : (
                'Join Room'
              )}
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 text-sm">
              <strong>Need help?</strong> Ask the room creator for the correct room URL and password. Make sure you're using the exact link they shared.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
