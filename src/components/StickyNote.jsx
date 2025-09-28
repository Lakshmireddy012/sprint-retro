import { useDrag } from 'react-dnd';
import { Heart, Trash2, User } from 'lucide-react';

const StickyNote = ({ sticky, columnId, onVote, onDelete, currentUser, isEditing, editText, onEditChange, onSave, onStartEdit }) => {
  const hasVoted = currentUser && sticky.votedBy.includes(currentUser.name);
  const isAuthor = currentUser && sticky.author === currentUser.name;

  const [{ isDragging }, drag] = useDrag({
    type: 'sticky',
    item: { id: sticky.id, columnId },
    canDrag: isAuthor, // Only allow dragging if user is the author
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getStickyColor = () => {
    // Color based on which column the sticky is in
    switch (columnId) {
      case 'went-well':
        return 'bg-green-100 border-green-200 text-green-900';
      case 'to-improve':
        return 'bg-orange-100 border-orange-200 text-orange-900';
      case 'action-items':
        return 'bg-blue-100 border-blue-200 text-blue-900';
      default:
        return 'bg-yellow-100 border-yellow-200 text-yellow-900';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div
      ref={drag}
      className={`
        sticky-note group relative p-3 rounded-lg border-2 transition-all duration-200
        ${getStickyColor()}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}
        ${sticky.votes > 0 ? 'ring-1 ring-red-400' : ''}
        ${isEditing ? 'cursor-text' : isAuthor ? 'cursor-move' : 'cursor-default'}
        ${!isAuthor && !isEditing ? 'opacity-75' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing && onStartEdit && isAuthor) {
          onStartEdit(sticky, columnId);
        }
      }}
    >
      {/* Vote count badge */}
      {sticky.votes > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
          {sticky.votes}
        </div>
      )}

      {/* Content */}
      <div className="mb-2">
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={() => onSave(sticky.id, columnId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSave(sticky.id, columnId);
              }
              if (e.key === 'Escape') {
                onSave(sticky.id, columnId);
              }
            }}
            className="w-full text-sm leading-relaxed break-words bg-transparent border-none outline-none resize-none"
            placeholder="Type your note here..."
            autoFocus
            rows={3}
            style={{ minHeight: '60px' }}
          />
        ) : (
          <p className="text-sm leading-relaxed break-words min-h-[60px]">
            {sticky.text || (isAuthor ? 'Click to add text...' : 'Empty note')}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <User className="w-3 h-3" />
          <span className={`font-medium ${isAuthor ? 'text-blue-600' : ''}`}>
            {sticky.author}{isAuthor ? ' (You)' : ''}
          </span>
          <span>•</span>
          <span>{formatDate(sticky.createdAt)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Vote button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVote();
          }}
          className={`
            p-1 rounded-full transition-colors shadow-sm
            ${hasVoted 
              ? 'bg-red-500 text-white' 
              : 'bg-white text-gray-600 hover:bg-red-100 hover:text-red-600'
            }
          `}
          title={hasVoted ? 'Remove vote' : 'Vote for this item'}
        >
          <Heart className={`w-3 h-3 ${hasVoted ? 'fill-current' : ''}`} />
        </button>

        {/* Delete button (only for author) */}
        {isAuthor && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this sticky note?')) {
                onDelete();
              }
            }}
            className="p-1 rounded-full bg-white text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm"
            title="Delete this sticky note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Voters tooltip */}
      {sticky.votes > 0 && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          <div className="flex items-center space-x-1">
            <Heart className="w-3 h-3 text-red-400" />
            <span>
              {sticky.votedBy.length === 1 
                ? `${sticky.votedBy[0]} voted` 
                : `${sticky.votedBy.join(', ')} voted`
              }
            </span>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}

    </div>
  );
};

export default StickyNote;
