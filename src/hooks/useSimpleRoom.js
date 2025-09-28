import { useContext } from 'react';
import { SimpleRoomContext } from '../context/SimpleRoomContextDefinition';

export const useSimpleRoom = () => {
  const context = useContext(SimpleRoomContext);
  if (!context) {
    throw new Error('useSimpleRoom must be used within a SimpleRoomProvider');
  }
  return context;
};
