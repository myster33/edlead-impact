import { useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  User,
  School,
  MapPin,
  Eye,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Application {
  id: string;
  reference_number?: string;
  full_name: string;
  student_email: string;
  school_name: string;
  grade: string;
  province: string;
  status: string;
  created_at: string;
  learner_photo_url?: string;
  [key: string]: any;
}

interface Column {
  status: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  headerClass: string;
  countClass: string;
  cardBorderClass: string;
}

const COLUMNS: Column[] = [
  {
    status: "pending",
    label: "Pending",
    icon: Clock,
    headerClass: "bg-muted border-b border-border",
    countClass: "bg-secondary text-secondary-foreground",
    cardBorderClass: "border-l-4 border-l-muted-foreground/30",
  },
  {
    status: "approved",
    label: "Approved",
    icon: CheckCircle,
    headerClass: "bg-primary/5 border-b border-primary/20",
    countClass: "bg-primary/10 text-primary",
    cardBorderClass: "border-l-4 border-l-primary",
  },
  {
    status: "rejected",
    label: "Rejected",
    icon: XCircle,
    headerClass: "bg-destructive/5 border-b border-destructive/20",
    countClass: "bg-destructive/10 text-destructive",
    cardBorderClass: "border-l-4 border-l-destructive",
  },
  {
    status: "cancelled",
    label: "Cancelled",
    icon: Ban,
    headerClass: "bg-muted/50 border-b border-border",
    countClass: "bg-muted text-muted-foreground",
    cardBorderClass: "border-l-4 border-l-border",
  },
];

interface ApplicationKanbanProps {
  applications: Application[];
  canEdit: boolean;
  onStatusChange: (id: string, newStatus: string) => void;
  onView: (app: Application) => void;
}

export function ApplicationKanban({
  applications,
  canEdit,
  onStatusChange,
  onView,
}: ApplicationKanbanProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragApp = useRef<Application | null>(null);

  const getColumnApps = (status: string) =>
    applications.filter((a) => a.status === status);

  const handleDragStart = useCallback(
    (e: React.DragEvent, app: Application) => {
      if (!canEdit) return;
      dragApp.current = app;
      setDraggingId(app.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [canEdit]
  );

  const handleDragEnd = useCallback(() => {
    dragApp.current = null;
    setDraggingId(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, status: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumn(status);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: string) => {
      e.preventDefault();
      setDragOverColumn(null);
      if (!dragApp.current || dragApp.current.status === targetStatus) return;
      onStatusChange(dragApp.current.id, targetStatus);
      dragApp.current = null;
      setDraggingId(null);
    },
    [onStatusChange]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[500px]">
      {COLUMNS.map((col) => {
        const colApps = getColumnApps(col.status);
        const Icon = col.icon;
        const isOver = dragOverColumn === col.status;

        return (
          <div
            key={col.status}
            className={cn(
              "flex flex-col rounded-lg border bg-card transition-all duration-150",
              isOver && canEdit && "ring-2 ring-primary ring-offset-1 bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column Header */}
            <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-t-lg", col.headerClass)}>
              <Icon className="h-4 w-4 text-foreground/70" />
              <span className="font-medium text-sm">{col.label}</span>
              <span
                className={cn(
                  "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full",
                  col.countClass
                )}
              >
                {colApps.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
              {colApps.length === 0 && (
                <div
                  className={cn(
                    "h-20 rounded-md border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground transition-colors",
                    isOver && canEdit && "border-primary/50 bg-primary/5"
                  )}
                >
                  {canEdit ? "Drop here" : "No applications"}
                </div>
              )}
              {colApps.map((app) => (
                <KanbanCard
                  key={app.id}
                  app={app}
                  col={col}
                  isDragging={draggingId === app.id}
                  canEdit={canEdit}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onView={onView}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface KanbanCardProps {
  app: Application;
  col: Column;
  isDragging: boolean;
  canEdit: boolean;
  onDragStart: (e: React.DragEvent, app: Application) => void;
  onDragEnd: () => void;
  onView: (app: Application) => void;
}

function KanbanCard({ app, col, isDragging, canEdit, onDragStart, onDragEnd, onView }: KanbanCardProps) {
  return (
    <Card
      draggable={canEdit}
      onDragStart={(e) => onDragStart(e, app)}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-default transition-all duration-150 shadow-sm hover:shadow-md",
        col.cardBorderClass,
        canEdit && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40 scale-95 shadow-none"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {canEdit && (
            <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-muted-foreground transition-colors" />
          )}
          <div className="flex-1 min-w-0">
            {/* Name + ref */}
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <p className="font-medium text-sm leading-tight truncate">{app.full_name}</p>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onView(app); }}
                title="View details"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>

            {app.reference_number && (
              <p className="text-xs text-muted-foreground font-mono mb-1.5">{app.reference_number}</p>
            )}

            {/* Meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <School className="h-3 w-3 shrink-0" />
                <span className="truncate">{app.school_name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{app.province}</span>
                <span className="text-muted-foreground/50 mx-1">·</span>
                <User className="h-3 w-3 shrink-0" />
                <span>Gr {app.grade}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
              </span>
              {canEdit && (
                <span className="text-xs text-muted-foreground/50 italic">drag to move</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
