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
}) => {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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
      {
        id: 'closed' as const,
        title: 'Closed',
        icon: '🗄️',
        count: ticketStats?.closed || 0,
        color: 'border-base-content/20 bg-base-content/5',
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
      const columnIds = ['open', 'in_progress', 'resolved', 'closed'];
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="badge badge-lg flex-shrink-0">{column.count}</div>
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
  );
};

export default TicketKanban;
