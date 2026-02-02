'use client';

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CashEvent } from "@/lib/types";

type EventsTableProps = {
  events: CashEvent[];
  onAdd: (sign: 1 | -1) => void;
  onEdit: (id: string, patch: Partial<CashEvent>) => void;
  onRemove: (id: string) => void;
};

export const EventsTable = ({ events, onAdd, onEdit, onRemove }: EventsTableProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Inflows &amp; One-offs</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onAdd(1)}>
          <Plus className="mr-2 h-4 w-4" />
          Add inflow
        </Button>
        <Button variant="secondary" onClick={() => onAdd(-1)}>
          <Plus className="mr-2 h-4 w-4" />
          Add outflow
        </Button>
      </div>
      <div className="space-y-3">
        {events.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No events added yet.
          </p>
        )}
        {events.map((event) => (
          <div
            key={event.id}
            className="grid grid-cols-1 gap-3 rounded-2xl border border-border p-4 sm:grid-cols-12"
          >
            <div className="sm:col-span-4 space-y-1">
              <Label htmlFor={`event-label-${event.id}`}>Label</Label>
              <Input
                id={`event-label-${event.id}`}
                value={event.label ?? ""}
                onChange={(e) => onEdit(event.id, { label: e.target.value })}
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label htmlFor={`event-year-${event.id}`}>Year offset</Label>
              <Input
                id={`event-year-${event.id}`}
                type="number"
                value={event.year}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onEdit(event.id, { year: Number.isFinite(next) ? Math.max(0, Math.round(next)) : event.year });
                }}
              />
            </div>
            <div className="sm:col-span-4 space-y-1">
              <Label htmlFor={`event-amount-${event.id}`}>Amount (+ / −)</Label>
              <Input
                id={`event-amount-${event.id}`}
                type="number"
                value={event.amount}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onEdit(event.id, { amount: Number.isFinite(next) ? next : event.amount });
                }}
              />
            </div>
            <div className="sm:col-span-1 flex items-end justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(event.id)}
                aria-label="Delete event"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

