import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TicketCard from './TicketCard';

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

interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

interface TicketKanbanProps {
  tickets: Ticket[];
  ticketStats: TicketStats | null;
  onStatusChange: (ticketId: string, newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => void;
  onQuickReply: (ticketId: string, response: string) => void;
  onViewFull: (ticket: Ticket) => void;
  onLoadClosedTickets?: () => Promise<void>;
  closedTickets?: Ticket[];
  loadingClosedTickets?: boolean;
}

interface SortableTicketProps {
  ticket: Ticket;
  onQuickReply: (ticketId: string, response: string) => void;
  onViewFull: (ticket: Ticket) => void;
}

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  isOver: boolean;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children, isOver }) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[200px] p-3 rounded-lg border-2 border-dashed transition-all duration-200 overflow-y-auto ${
        isOver
          ? 'border-primary bg-primary/10 border-solid'
          : 'border-base-content/10 bg-base-200/30'
      }`}
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      {children}
    </div>
  );
};

const SortableTicket: React.FC<SortableTicketProps> = ({ ticket, onQuickReply, onViewFull }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TicketCard
        ticket={ticket}
        onQuickReply={onQuickReply}
        onViewFull={onViewFull}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

const TicketKanban: React.FC<TicketKanbanProps> = ({
  tickets,
  ticketStats,
  onStatusChange,
  onQuickReply,
  onViewFull,
  onLoadClosedTickets,
  closedTickets = [],
  loadingClosedTickets = false,
}) => {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [showClosedTickets, setShowClosedTickets] = useState(false);

  const handleToggleClosedTickets = async () => {
    const newShowState = !showClosedTickets;
    setShowClosedTickets(newShowState);

    // Only fetch closed tickets if we're opening the section and haven't loaded them yet
    if (newShowState && closedTickets.length === 0 && onLoadClosedTickets) {
      await onLoadClosedTickets();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = useMemo(
    () => [
      {
        id: 'open' as const,
        title: 'Open',
        icon: '📬',
        count: ticketStats?.open || 0,
        color: 'border-blue-500/50 bg-blue-500/5',
      },
      {
        id: 'in_progress' as const,
        title: 'In Progress',
        icon: '🔧',
        count: ticketStats?.inProgress || 0,
        color: 'border-yellow-500/50 bg-yellow-500/5',
      },
      {
        id: 'resolved' as const,
        title: 'Resolved',
        icon: '✅',
        count: ticketStats?.resolved || 0,
        color: 'border-green-500/50 bg-green-500/5',
      },
    ],
    [ticketStats]
  );

  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, Ticket[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
    };

    tickets.forEach((ticket) => {
      grouped[ticket.status].push(ticket);
    });

    return grouped;
  }, [tickets]);

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t._id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? String(over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      // Check if dropped over a column (the droppable areas have column IDs)
      const columnIds = ['open', 'in_progress', 'resolved'];
      const targetColumnId = columnIds.find((id) => String(over.id) === id);

      if (targetColumnId) {
        const ticket = tickets.find((t) => t._id === active.id);
        if (ticket && ticket.status !== targetColumnId) {
          onStatusChange(
            ticket.ticketId,
            targetColumnId as 'open' | 'in_progress' | 'resolved' | 'closed'
          );
        }
      }
    }

    setActiveTicket(null);
    setOverId(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col min-h-0">
            {/* Column Header */}
            <div className={`card border-2 ${column.color} mb-3 transition-all duration-200 flex-shrink-0`}>
              <div className="card-body p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl flex-shrink-0">{column.icon}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm lg:text-base truncate">{column.title}</h3>
                      <p className="text-xs lg:text-sm text-base-content/60 truncate">
                        {column.count} ticket{column.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="badge badge-neutral h-7 px-3 py-1 font-bold text-base flex-shrink-0">{column.count}</div>
                </div>
              </div>
            </div>

            {/* Droppable Column Area */}
            <SortableContext
              items={ticketsByStatus[column.id].map((t) => t._id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn id={column.id} isOver={overId === column.id}>
                {ticketsByStatus[column.id].length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-base-content/40">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{column.icon}</div>
                      <p className="text-sm">No tickets</p>
                    </div>
                  </div>
                ) : (
                  ticketsByStatus[column.id].map((ticket) => (
                    <SortableTicket
                      key={ticket._id}
                      ticket={ticket}
                      onQuickReply={onQuickReply}
                      onViewFull={onViewFull}
                    />
                  ))
                )}
              </DroppableColumn>
            </SortableContext>
          </div>
        ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTicket ? (
            <div className="opacity-90 rotate-3 scale-105">
              <TicketCard
                ticket={activeTicket}
                onQuickReply={() => {}}
                onViewFull={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Closed Tickets Section */}
      {(ticketStats?.closed || 0) > 0 && (
        <div className="mt-8">
          <button
            onClick={handleToggleClosedTickets}
            className="w-full flex items-center justify-between p-4 bg-base-200 hover:bg-base-300 rounded-lg transition-colors border-2 border-base-content/10"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗄️</span>
              <div className="text-left">
                <h3 className="font-semibold text-lg">Closed Tickets Archive</h3>
                <p className="text-sm text-base-content/60">
                  {ticketStats?.closed || 0} archived ticket{ticketStats?.closed !== 1 ? 's' : ''} (click to load)
                </p>
              </div>
            </div>
            <svg
              className={`w-6 h-6 transition-transform ${showClosedTickets ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showClosedTickets && (
            <div className="mt-4">
              {loadingClosedTickets ? (
                <div className="flex items-center justify-center py-12">
                  <div className="loading loading-spinner loading-lg"></div>
                </div>
              ) : closedTickets.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  No closed tickets found
                </div>
              ) : (
                <div className="space-y-2">
                  {closedTickets.map((ticket) => (
                    <div
                      key={ticket._id}
                      className="flex items-center justify-between p-3 bg-base-100 hover:bg-base-200 rounded-lg border border-base-content/10 cursor-pointer transition-colors"
                      onClick={() => onViewFull(ticket)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs font-mono text-base-content/50 flex-shrink-0">
                          {ticket.ticketId}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ticket.subject}</p>
                          <p className="text-xs text-base-content/60 truncate">
                            {ticket.userId.firstName} {ticket.userId.lastName} · {ticket.category.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge ${ticket.priority === 'urgent' ? 'badge-error' : ticket.priority === 'high' ? 'badge-warning' : 'badge-ghost'} h-5 px-2 py-0.5 font-bold text-xs`}>
                          {ticket.priority}
                        </span>
                        <span className="text-xs text-base-content/50">
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TicketKanban;
