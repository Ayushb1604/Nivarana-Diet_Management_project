import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        (target.closest("[role='textbox']") && target.closest("[contenteditable='true']"))
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.altKey ? event.altKey : !event.altKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          event.preventDefault();
          shortcut.action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, setLocation, toast]);
}

// Global keyboard shortcuts hook
export function useGlobalKeyboardShortcuts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useKeyboardShortcuts([
    {
      key: "k",
      ctrlKey: true,
      action: () => {
        // Open command palette or search (can be extended)
        toast({
          title: "Quick Actions",
          description: "Press Ctrl+K to open quick actions (coming soon)",
        });
      },
      description: "Open quick actions",
    },
    {
      key: "h",
      ctrlKey: true,
      action: () => setLocation("/dashboard"),
      description: "Go to dashboard",
    },
    {
      key: "f",
      ctrlKey: true,
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('[data-testid="input-search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: "Focus search",
    },
  ]);
}

