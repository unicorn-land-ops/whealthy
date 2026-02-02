'use client';

import { useRef, useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

type PersistControlsProps = {
  onReset: () => void;
  exportJson: () => string;
  importJson: (payload: string) => { success: true } | { success: false; error: string };
};

export const PersistControls = ({ onReset, exportJson, importJson }: PersistControlsProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    const data = exportJson();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "whealthy-params.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Exported current parameters to whealthy-params.json");
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const result = importJson(text);
      if (result.success) {
        setMessage(`Imported parameters from ${file.name}`);
      } else {
        setMessage(`Import failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" />
        Export JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        Import JSON
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Reset defaults
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImport(file);
            event.target.value = "";
          }
        }}
      />
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

