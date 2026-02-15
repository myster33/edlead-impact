import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcutGroups = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "A"], description: "Go to Applications" },
      { keys: ["G", "C"], description: "Go to Chat" },
      { keys: ["G", "S"], description: "Go to Settings" },
      { keys: ["G", "R"], description: "Go to Reports" },
      { keys: ["G", "N"], description: "Go to Analytics" },
      { keys: ["G", "B"], description: "Go to Stories" },
      { keys: ["G", "U"], description: "Go to Admin Users" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open Command Palette" },
      { keys: ["?"], description: "Show this help" },
    ],
  },
];

export function ShortcutsHelpDialog({ open, onOpenChange }: ShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate quickly. Press G then the second key within 1 second.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{group.label}</h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.description} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-muted-foreground text-xs mx-0.5">then</span>}
                          <kbd className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded border bg-muted text-xs font-mono">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
