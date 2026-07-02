'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 mb-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

export default function TestDndPage() {
  const [items, setItems] = useState([
    { id: '1', text: 'Item 1' },
    { id: '2', text: 'Item 2' },
    { id: '3', text: 'Item 3' },
    { id: '4', text: 'Item 4' },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    console.log('handleDragEnd:', { active: active.id, over: over?.id });
    
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        console.log('Reorder:', { oldIndex, newIndex });
        
        const newItems = [...prev];
        const [moved] = newItems.splice(oldIndex, 1);
        if (moved) newItems.splice(newIndex, 0, moved);
        return newItems;
      });
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Drag & Drop Test</h1>
      <p className="text-sm text-fg-muted mb-4">
        Ziehe die Items um sie neu zu ordnen. Öffne die Console (F12) um die Logs zu sehen.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {item.text}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
      <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <p className="text-sm font-medium">Aktuelle Reihenfolge:</p>
        <p className="text-sm text-fg-muted">{items.map((i) => i.text).join(' -> ')}</p>
      </div>
    </div>
  );
}