import React, { useState } from 'react';

interface Ticket {
  _id: string;
  ticketId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    planTier: string;
  };
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketCardProps {
  ticket: Ticket;
  onQuickReply: (ticketId: string, response: string) => void;
  onViewFull: (ticket: Ticket) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onQuickReply,
  onViewFull,
  isDragging,
  dragHandleProps,
}) => {
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [quickReply, setQuickReply] = useState('');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'border-blue-500 bg-blue-500/5';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/5';
      case 'high':
        return 'border-orange-500 bg-orange-500/5';
      case 'urgent':
        return 'border-red-500 bg-red-500/5 animate-pulse';
      default:
        return 'border-base-content/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const handleQuickReply = () => {
    if (quickReply.trim()) {
      onQuickReply(ticket.ticketId, quickReply);
      setQuickReply('');
      setShowQuickReply(false);
    }
  };

  return (
    <div
      className={`card bg-base-100 shadow-lg border-2 ${getPriorityColor(ticket.priority)} mb-3 transition-all duration-200 ${
        isDragging ? 'opacity-50' : 'hover:shadow-xl'
      }`}
    >
      <div className="card-body p-3" {...dragHandleProps}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg flex-shrink-0" title={ticket.priority}>
              {getPriorityIcon(ticket.priority)}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm break-words line-clamp-2" title={ticket.subject}>
                {ticket.subject}
              </h3>
            </div>
          </div>
          <code className="badge badge-ghost h-5 px-2 py-0.5 font-bold text-xs whitespace-nowrap flex-shrink-0">
            {ticket.ticketId.split('-').slice(-1)[0]}
          </code>
        </div>

        {/* User Info - Not draggable */}
        <div className="flex items-center gap-2 text-xs text-base-content/70 mb-2">
          <div className="avatar placeholder flex-shrink-0">
            <div className="bg-primary text-primary-content rounded-full w-6">
              <span className="text-xs">
                {ticket.userId.firstName[0]}
                {ticket.userId.lastName[0]}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">
              {ticket.userId.firstName} {ticket.userId.lastName}
            </div>
            <div className="text-xs truncate">{ticket.userId.email}</div>
          </div>
          <div className="badge badge-primary h-5 px-2 py-0.5 font-bold text-xs flex-shrink-0">{ticket.userId.planTier}</div>
        </div>

        {/* Message Preview - Not draggable */}
        <p className="text-sm text-base-content/80 line-clamp-2 mb-2 break-words">{ticket.message}</p>

        {/* Category and Time - Not draggable */}
        <div className="flex items-center justify-between gap-2 text-xs mb-3 flex-wrap">
          <div className="badge badge-outline h-5 px-2 py-0.5 font-bold text-xs flex-shrink-0">
            {ticket.category.replace('_', ' ')}
          </div>
          <div className="text-base-content/60 flex-shrink-0">{getTimeSince(ticket.createdAt)}</div>
        </div>

        {/* Quick Reply Section - Not draggable */}
        {showQuickReply && (
          <div className="mb-2">
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              placeholder="Type your reply..."
              value={quickReply}
              onChange={(e) => setQuickReply(e.target.value)}
              rows={2}
              autoFocus
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="flex gap-2 mt-2">
              <button
                className="btn btn-primary btn-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickReply();
                }}
                disabled={!quickReply.trim()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Send
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuickReply(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions - Not draggable */}
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-primary flex-1"
            onClick={(e) => {
              e.stopPropagation();
              setShowQuickReply(!showQuickReply);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <span className="hidden sm:inline">Reply</span>
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              onViewFull(ticket);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="hidden sm:inline">View</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
