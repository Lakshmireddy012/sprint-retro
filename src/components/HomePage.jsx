import { Link } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Sprint Retro
          </h1>
          <p className="text-gray-600">
            Create or join a retrospective session
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/create-room"
            className="w-full flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-5 h-5 mr-3 text-gray-600" />
            <span className="text-lg text-gray-900">Create Room</span>
          </Link>

          <Link
            to="/join-room"
            className="w-full flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-5 h-5 mr-3 text-gray-600" />
            <span className="text-lg text-gray-900">Join Room</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
