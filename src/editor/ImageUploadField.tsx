import { useRef, useState } from "react";
import { uploadImage } from "../lib/api";
import { TextInput } from "./inspector-fields";

export function ImageUploadField({ label, value, onChange }: {
  label: string; value: string; onChange: (src: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  return (
    <div className="mb-2">
      <TextInput label={label} value={value} onChange={onChange} />
      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={state === "uploading"}
          className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 disabled:opacity-40">
          {state === "uploading" ? "Uploading…" : "Upload image"}
        </button>
        {state === "error" && <span className="text-xs text-red-400">{error}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setState("uploading");
          try {
            onChange(await uploadImage(file));
            setState("idle");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            setState("error");
          }
          e.target.value = "";
        }} />
    </div>
  );
}
