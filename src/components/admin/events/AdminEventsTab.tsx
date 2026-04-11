import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Eye, EyeOff, Loader2, Upload, X, ZoomIn } from "lucide-react";
import { format } from "date-fns";
import { formatDateSAST, getTimeSAST } from "@/lib/date-utils";

interface EventFormData {
  title: string;
  description: string;
  location: string;
  event_date: string;
  event_start_time: string;
  event_end_date: string;
  event_end_time: string;
  category: "concurrent" | "once_off";
  status: "open" | "closed";
  max_capacity: string;
  price: string;
  price_inclusions: string[];
  newInclusion: string;
  organiser_name: string;
  organiser_website: string;
}

const emptyForm: EventFormData = {
  title: "",
  description: "",
  location: "",
  event_date: "",
  event_start_time: "",
  event_end_date: "",
  event_end_time: "",
  category: "once_off",
  status: "open",
  max_capacity: "",
  price: "",
  price_inclusions: [],
  newInclusion: "",
  organiser_name: "",
  organiser_website: "",
};

/** Combine a date string (YYYY-MM-DD) and optional time (HH:mm) into an ISO timestamp with SAST offset or null */
function combineDatetime(date: string, time: string): string | null {
  if (!date) return null;
  if (time) return `${date}T${time}:00+02:00`;
  return `${date}T00:00:00+02:00`;
}

/** Extract date (YYYY-MM-DD) from an ISO string, converting to SAST */
function extractDate(iso: string | null): string {
  if (!iso) return "";
  // Parse as Date and format in SAST (Africa/Johannesburg)
  const d = new Date(iso);
  const sast = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  return sast.toISOString().slice(0, 10);
}

/** Extract time (HH:mm) from an ISO string in SAST, returns "" if midnight (meaning no time was set) */
function extractTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sast = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const hh = String(sast.getUTCHours()).padStart(2, "0");
  const mm = String(sast.getUTCMinutes()).padStart(2, "0");
  const t = `${hh}:${mm}`;
  return t === "00:00" ? "" : t;
}

/** Format a date string to SAST for display */
function formatInSAST(iso: string): Date {
  // Shift UTC to SAST for display purposes
  const d = new Date(iso);
  return new Date(d.getTime() + 2 * 60 * 60 * 1000);
}

export function AdminEventsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);

  // Banner file states
  const [wideBannerFile, setWideBannerFile] = useState<File | null>(null);
  const [squareBannerFile, setSquareBannerFile] = useState<File | null>(null);
  const [organiserLogoFile, setOrganiserLogoFile] = useState<File | null>(null);
  const [existingWideUrl, setExistingWideUrl] = useState<string | null>(null);
  const [existingSquareUrl, setExistingSquareUrl] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [uploadingBanners, setUploadingBanners] = useState(false);

  // Preview dialog
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadBanner = async (file: File, eventTitle: string, aspect: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const sanitized = eventTitle.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const path = `${sanitized}_${aspect}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("event-banners")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from("event-banners").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: EventFormData) => {
      setUploadingBanners(true);

      let imageUrl = existingWideUrl;
      let squareUrl = existingSquareUrl;
      let logoUrl = existingLogoUrl;

      try {
        if (wideBannerFile) {
          imageUrl = await uploadBanner(wideBannerFile, formData.title, "16x9");
        }
        if (squareBannerFile) {
          squareUrl = await uploadBanner(squareBannerFile, formData.title, "1x1");
        }
        if (organiserLogoFile) {
          logoUrl = await uploadBanner(organiserLogoFile, formData.title, "logo");
        }
      } finally {
        setUploadingBanners(false);
      }

      const payload: any = {
        title: formData.title,
        description: formData.description,
        image_url: imageUrl,
        banner_square_url: squareUrl,
        location: formData.location || null,
        event_date: combineDatetime(formData.event_date, formData.event_start_time),
        event_end_date: combineDatetime(formData.event_end_date, formData.event_end_time),
        category: formData.category,
        status: formData.status,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        price_inclusions: formData.price_inclusions.length > 0 ? formData.price_inclusions : [],
        organiser_name: formData.organiser_name || null,
        organiser_logo_url: logoUrl,
        organiser_website: formData.organiser_website || null,
      };

      if (editingId) {
        const { error } = await supabase.from("events").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast({ title: editingId ? "Event updated" : "Event created" });
      resetDialog();
    },
    onError: () => {
      toast({ title: "Error saving event", variant: "destructive" });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      const newStatus = current === "open" ? "closed" : "open";
      const { error } = await supabase.from("events").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast({ title: "Event status updated" });
    },
  });

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setWideBannerFile(null);
    setSquareBannerFile(null);
    setOrganiserLogoFile(null);
    setExistingWideUrl(null);
    setExistingSquareUrl(null);
    setExistingLogoUrl(null);
  };

  const openEdit = (event: any) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      location: event.location || "",
      event_date: extractDate(event.event_date),
      event_start_time: extractTime(event.event_date),
      event_end_date: extractDate(event.event_end_date),
      event_end_time: extractTime(event.event_end_date),
      category: event.category,
      status: event.status,
      max_capacity: event.max_capacity?.toString() || "",
      price: event.price?.toString() || "",
      price_inclusions: event.price_inclusions || [],
      newInclusion: "",
      organiser_name: event.organiser_name || "",
      organiser_website: event.organiser_website || "",
    });
    setExistingWideUrl(event.image_url || null);
    setExistingSquareUrl(event.banner_square_url || null);
    setExistingLogoUrl(event.organiser_logo_url || null);
    setWideBannerFile(null);
    setSquareBannerFile(null);
    setOrganiserLogoFile(null);
    setDialogOpen(true);
  };

  const openCreate = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const getPreviewSrc = (file: File | null, existingUrl: string | null) => {
    if (file) return URL.createObjectURL(file);
    return existingUrl;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Events</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Event" : "Create Event"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concurrent">On-going</SelectItem>
                      <SelectItem value="once_off">Once-Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                </div>
                <div>
                  <Label>Start Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="time" value={form.event_start_time} onChange={(e) => setForm({ ...form, event_start_time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.event_end_date} onChange={(e) => setForm({ ...form, event_end_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="time" value={form.event_end_time} onChange={(e) => setForm({ ...form, event_end_time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Max Capacity</Label>
                <Input type="number" min="1" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} placeholder="Unlimited if empty" />
              </div>

              {/* Price & Inclusions */}
              <div className="space-y-3">
                <div>
                  <Label>Price <span className="text-muted-foreground text-xs">(optional — leave empty for free events)</span></Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="R 0.00 (Free)"
                  />
                </div>
                {form.price && parseFloat(form.price) > 0 && (
                  <div className="space-y-2">
                    <Label>What's Included</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.newInclusion}
                        onChange={(e) => setForm({ ...form, newInclusion: e.target.value })}
                        placeholder="e.g. Transportation, Lunch — Buffet"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && form.newInclusion.trim()) {
                            e.preventDefault();
                            setForm({
                              ...form,
                              price_inclusions: [...form.price_inclusions, form.newInclusion.trim()],
                              newInclusion: "",
                            });
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!form.newInclusion.trim()}
                        onClick={() => {
                          if (form.newInclusion.trim()) {
                            setForm({
                              ...form,
                              price_inclusions: [...form.price_inclusions, form.newInclusion.trim()],
                              newInclusion: "",
                            });
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.price_inclusions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.price_inclusions.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                            {item}
                            <button
                              type="button"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  price_inclusions: form.price_inclusions.filter((_, i) => i !== idx),
                                })
                              }
                              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Press Enter or click + to add each item</p>
                  </div>
                )}
              </div>

              {/* Organiser Details */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Organiser Details</Label>
                <div>
                  <Label>Organiser Name</Label>
                  <Input
                    value={form.organiser_name}
                    onChange={(e) => setForm({ ...form, organiser_name: e.target.value })}
                    placeholder="e.g. edLEAD Foundation"
                  />
                </div>
                <div>
                  <Label>Organiser Website <span className="text-muted-foreground text-xs">(opens when logo is clicked)</span></Label>
                  <Input
                    type="url"
                    value={form.organiser_website}
                    onChange={(e) => setForm({ ...form, organiser_website: e.target.value })}
                    placeholder="https://www.example.org"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Organiser Logo</Label>
                  {getPreviewSrc(organiserLogoFile, existingLogoUrl) ? (
                    <div className="relative group rounded-lg overflow-hidden border bg-muted/50 max-w-[120px]">
                      <div className="aspect-square">
                        <img
                          src={getPreviewSrc(organiserLogoFile, existingLogoUrl)!}
                          alt="Organiser logo"
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          onClick={() => { setOrganiserLogoFile(null); setExistingLogoUrl(null); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors max-w-[120px] aspect-square">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">Upload logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setOrganiserLogoFile(e.target.files[0]); }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Banner uploads */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Event Banners</Label>

                {/* 16:9 Wide Banner */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Wide Banner (16:9) — Desktop / Landscape</Label>
                  {getPreviewSrc(wideBannerFile, existingWideUrl) ? (
                    <div className="relative group rounded-lg overflow-hidden border bg-muted/50">
                      <div className="aspect-video">
                        <img
                          src={getPreviewSrc(wideBannerFile, existingWideUrl)!}
                          alt="Wide banner preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => setPreviewImage(getPreviewSrc(wideBannerFile, existingWideUrl))}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => { setWideBannerFile(null); setExistingWideUrl(null); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors aspect-video">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload 16:9 banner</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setWideBannerFile(e.target.files[0]); }}
                      />
                    </label>
                  )}
                </div>

                {/* 1:1 Square Banner */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Square Banner (1:1) — Mobile / Social</Label>
                  {getPreviewSrc(squareBannerFile, existingSquareUrl) ? (
                    <div className="relative group rounded-lg overflow-hidden border bg-muted/50 max-w-[200px]">
                      <div className="aspect-square">
                        <img
                          src={getPreviewSrc(squareBannerFile, existingSquareUrl)!}
                          alt="Square banner preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => setPreviewImage(getPreviewSrc(squareBannerFile, existingSquareUrl))}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => { setSquareBannerFile(null); setExistingSquareUrl(null); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors aspect-square max-w-[200px]">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload 1:1 banner</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setSquareBannerFile(e.target.files[0]); }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploadingBanners}>
                {(saveMutation.isPending || uploadingBanners) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {uploadingBanners ? "Uploading banners..." : editingId ? "Update Event" : "Create Event"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewImage && (
            <img src={previewImage} alt="Banner preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banner</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-20 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(event.image_url)}
                      />
                    ) : (
                      <div className="w-20 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {event.category === "concurrent" ? "On-going" : "Once-Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.event_date ? (
                      <div className="text-sm">
                        <div>{formatDateSAST(event.event_date, "dd MMM yyyy")}</div>
                        {extractTime(event.event_date) && (
                          <div className="text-muted-foreground text-xs">
                            {getTimeSAST(event.event_date)}
                            {event.event_end_date && extractTime(event.event_end_date) && ` – ${getTimeSAST(event.event_end_date)}`}
                          </div>
                        )}
                      </div>
                    ) : "Anytime"}
                  </TableCell>
                  <TableCell>
                    {event.current_bookings}{event.max_capacity ? ` / ${event.max_capacity}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.status === "open" ? "default" : "secondary"}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStatus.mutate({ id: event.id, current: event.status })}
                      >
                        {event.status === "open" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {events?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No events yet. Create your first event above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
