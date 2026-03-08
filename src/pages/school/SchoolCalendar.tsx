import { useState, useEffect, useCallback } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Plus, Loader2, Pencil, Trash2, CalendarCheck, CalendarX, PartyPopper, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

interface CalendarEvent {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: "school_day", label: "School Day", icon: BookOpen, color: "#22c55e" },
  { value: "holiday", label: "Holiday", icon: CalendarX, color: "#ef4444" },
  { value: "event", label: "Event / Activity", icon: PartyPopper, color: "#3b82f6" },
  { value: "closure", label: "School Closure", icon: CalendarX, color: "#f97316" },
  { value: "open_day", label: "School Open Day", icon: CalendarCheck, color: "#8b5cf6" },
  { value: "exam", label: "Exam Period", icon: BookOpen, color: "#eab308" },
];

const getEventTypeConfig = (type: string) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[2];

export default function SchoolCalendar() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("event");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formColor, setFormColor] = useState("#3b82f6");

  const fetchEvents = useCallback(async () => {
    if (!currentSchool?.id) return;
    setIsLoading(true);
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    
    const { data } = await supabase
      .from("school_calendar_events")
      .select("*")
      .eq("school_id", currentSchool.id)
      .gte("end_date", monthStart)
      .lte("start_date", monthEnd)
      .order("start_date");
    
    setEvents((data as CalendarEvent[]) || []);
    setIsLoading(false);
  }, [currentSchool?.id, currentMonth]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormType("event");
    setFormStartDate("");
    setFormEndDate("");
    setFormColor("#3b82f6");
    setEditingEvent(null);
  };

  const openCreateDialog = (date?: Date) => {
    resetForm();
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      setFormStartDate(dateStr);
      setFormEndDate(dateStr);
    }
    setDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || "");
    setFormType(event.event_type);
    setFormStartDate(event.start_date);
    setFormEndDate(event.end_date);
    setFormColor(event.color || "#3b82f6");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentSchool?.id || !schoolUser?.id || !formTitle || !formStartDate || !formEndDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const payload = {
      school_id: currentSchool.id,
      title: formTitle,
      description: formDescription || null,
      event_type: formType,
      start_date: formStartDate,
      end_date: formEndDate,
      color: formColor,
      created_by: schoolUser.id,
    };

    let error;
    if (editingEvent) {
      ({ error } = await supabase.from("school_calendar_events").update(payload).eq("id", editingEvent.id));
    } else {
      ({ error } = await supabase.from("school_calendar_events").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingEvent ? "Event updated" : "Event created", description: `"${formTitle}" has been saved.` });
      setDialogOpen(false);
      resetForm();
      fetchEvents();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("school_calendar_events").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted" });
      fetchEvents();
    }
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) =>
    events.filter(e => {
      const start = parseISO(e.start_date);
      const end = parseISO(e.end_date);
      return isSameDay(date, start) || isSameDay(date, end) || isWithinInterval(date, { start, end });
    });

  const selectedDateEvents = getEventsForDate(selectedDate);

  // Dates with events for calendar highlighting
  const datesWithEvents = events.flatMap(e => {
    const start = parseISO(e.start_date);
    const end = parseISO(e.end_date);
    return eachDayOfInterval({ start, end });
  });

  const modifiers = {
    hasEvent: datesWithEvents,
  };

  const modifiersStyles = {
    hasEvent: {
      fontWeight: 700,
      textDecoration: "underline",
      textDecorationColor: "hsl(var(--primary))",
      textUnderlineOffset: "3px",
    },
  };

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">School Calendar</h1>
            <p className="text-muted-foreground">Manage school days, holidays, events & activities</p>
          </div>
          <Button onClick={() => openCreateDialog()}>
            <Plus className="mr-2 h-4 w-4" />Add Event
          </Button>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card className="lg:col-span-1">
                <CardContent className="pt-6 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                  />
                </CardContent>
              </Card>

              {/* Events for selected date */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Events on {format(selectedDate, "EEEE, d MMMM yyyy")}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => openCreateDialog(selectedDate)}>
                    <Plus className="mr-1 h-3 w-3" />Add
                  </Button>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No events on this date.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateEvents.map(event => {
                        const config = getEventTypeConfig(event.event_type);
                        const Icon = config.icon;
                        return (
                          <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border">
                            <div className="rounded-full p-2" style={{ backgroundColor: `${event.color || config.color}20` }}>
                              <Icon className="h-4 w-4" style={{ color: event.color || config.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{event.title}</p>
                                <Badge variant="outline" className="text-xs">{config.label}</Badge>
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.start_date === event.end_date
                                  ? format(parseISO(event.start_date), "d MMM yyyy")
                                  : `${format(parseISO(event.start_date), "d MMM")} — ${format(parseISO(event.end_date), "d MMM yyyy")}`}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(event)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete event?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently remove "{event.title}".</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(event.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
              {EVENT_TYPES.map(t => (
                <div key={t.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.label}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  All Events — {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No events this month.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map(event => {
                        const config = getEventTypeConfig(event.event_type);
                        return (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" style={{ borderColor: event.color || config.color, color: event.color || config.color }}>
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(parseISO(event.start_date), "d MMM yyyy")}</TableCell>
                            <TableCell>{format(parseISO(event.end_date), "d MMM yyyy")}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(event)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete event?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently remove "{event.title}".</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(event.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Title *</label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Term 1 Holiday" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Event Type *</label>
                <Select value={formType} onValueChange={(v) => { setFormType(v); setFormColor(getEventTypeConfig(v).color); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Start Date *</label>
                  <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">End Date *</label>
                  <Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Optional details..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : editingEvent ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SchoolLayout>
  );
}
