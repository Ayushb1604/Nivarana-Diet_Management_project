import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["Ctrl", "K"], description: "Open quick actions" },
  { keys: ["Ctrl", "H"], description: "Go to dashboard" },
  { keys: ["Ctrl", "F"], description: "Focus search" },
  { keys: ["Shift", "?"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close dialogs" },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "?",
      shiftKey: true,
      action: () => setOpen(true),
      description: "Show shortcuts",
    },
    {
      key: "Escape",
      action: () => setOpen(false),
      description: "Close shortcuts",
    },
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIdx) => (
                  <span key={keyIdx}>
                    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                      {key}
                    </kbd>
                    {keyIdx < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

