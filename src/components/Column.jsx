import { useDrop } from 'react-dnd';

const Column = ({ id, title, children, onMoveSticky, onCreateSticky, className = '' }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'sticky',
    drop: (item, monitor) => {
      if (!monitor.didDrop()) {
        // Only handle the drop if it wasn't handled by a nested target
        onMoveSticky(item.id, item.columnId, id, 0);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const getColumnIcon = (columnId) => {
    switch (columnId) {
      case 'went-well':
        return '😊';
      case 'to-improve':
        return '🤔';
      case 'action-items':
        return '🎯';
      default:
        return '📝';
    }
  };

  const getColumnColor = (columnId) => {
    switch (columnId) {
      case 'went-well':
        return 'border-green-200';
      case 'to-improve':
        return 'border-orange-200';
      case 'action-items':
        return 'border-blue-200';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <div
      ref={drop}
      onClick={(e) => onCreateSticky && onCreateSticky(id, e)}
      className={`
        min-h-[500px] p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${getColumnColor(id)}
        ${isOver && canDrop ? 'border-blue-400 bg-blue-50' : ''}
        ${canDrop && !isOver ? 'border-gray-300' : ''}
        hover:bg-gray-50
        ${className}
      `}
    >
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">{getColumnIcon(id)}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="h-px bg-gray-200"></div>
      </div>
      
      <div className="space-y-3 min-h-[400px]">
        {children}
        {/* Show hint when column is empty */}
        {!children?.props?.children?.length && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Click here to add a sticky note
          </div>
        )}
      </div>
      
      {isOver && canDrop && (
        <div className="mt-4 p-3 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 text-center">
          <p className="text-blue-700 text-sm">Drop sticky note here</p>
        </div>
      )}
    </div>
  );
};

export default Column;
