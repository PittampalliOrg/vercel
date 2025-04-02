// src/components/ui/list-pane.tsx
import React from 'react';
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";
import { cn } from '@/lib/utils';

type ListPaneProps<T extends { name: string; description?: string | null }> = {
  title: string;
  items: T[];
  selectedItemName: string | null;
  onSelectItem: (item: T) => void;
  onListMore?: () => void; // For pagination
  isListMoreDisabled?: boolean;
  onRefresh: () => void;
  isLoading?: boolean;
};

export function ListPane<T extends { name: string; description?: string | null }>({
  title,
  items,
  selectedItemName,
  onSelectItem,
  onListMore,
  isListMoreDisabled = true,
  onRefresh,
  isLoading = false,
}: ListPaneProps<T>) {
  return (
    <div className="border rounded-lg flex flex-col h-full">
      <div className="p-3 border-b flex justify-between items-center">
        <h3 className="font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
          Refresh {isLoading && "..."}
        </Button>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {items.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground p-2">No {title.toLowerCase()} found.</p>
          )}
          {items.map((item) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center p-2 rounded hover:bg-muted cursor-pointer text-sm",
                selectedItemName === item.name && "bg-muted font-medium"
              )}
              onClick={() => onSelectItem(item)}
            >
              <span className="flex-1 truncate" title={item.name}>{item.name}</span>
              {item.description && (
                <span className="text-xs text-muted-foreground ml-2 truncate" title={item.description}>
                  {item.description}
                </span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      {onListMore && (
        <div className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onListMore}
            disabled={isListMoreDisabled || isLoading}
          >
            List More {isLoading && "..."}
          </Button>
        </div>
      )}
    </div>
  );
}