import { useId, useState } from "react";
import type { Background, RichText } from "../schema/slide";

export function TextInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-xs text-neutral-400">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm" />
    </div>
  );
}

export function NumberInput({ label, value, onChange, placeholder }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-xs text-neutral-400">{label}</label>
      <input id={id} type="number" value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm" />
    </div>
  );
}

export function ColorInput({ label, value, onChange }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="mb-2 flex items-center gap-2">
      <label htmlFor={id} className="flex-1 text-xs text-neutral-400">{label}</label>
      <input id={id} type="color" value={value ?? "#ffffff"}
        onChange={(e) => onChange(e.target.value)} className="h-7 w-10 cursor-pointer bg-transparent" />
    </div>
  );
}

export function SelectInput<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="block text-xs text-neutral-400">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}
        className="mt-0.5 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/** Text content + collapsible full styling controls for one RichText field. */
export function RichTextControls({ label, value, onChange }: {
  label: string; value: RichText; onChange: (v: RichText) => void;
}) {
  const [open, setOpen] = useState(false);
  const patch = (p: Partial<RichText>) => onChange({ ...value, ...p });
  return (
    <div className="mb-3 rounded border border-neutral-800 p-2">
      <div className="flex items-end gap-2">
        <div className="flex-1"><TextInput label={label} value={value.text}
          onChange={(text) => patch({ text })} /></div>
        <button onClick={() => setOpen(!open)}
          className="mb-2 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800">
          Style
        </button>
      </div>
      {open && (
        <div className="mt-1 grid grid-cols-2 gap-x-3">
          <NumberInput label="Size" value={value.size}
            onChange={(size) => patch({ size })} placeholder="auto" />
          <NumberInput label="Weight" value={value.weight}
            onChange={(weight) => patch({ weight })} placeholder="auto" />
          <NumberInput label="Letter spacing" value={value.letterSpacing}
            onChange={(letterSpacing) => patch({ letterSpacing })} placeholder="0" />
          <SelectInput label="Align" value={value.align ?? "center"}
            options={["left", "center", "right"] as const}
            onChange={(align) => patch({ align })} />
          <ColorInput label="Color" value={value.color}
            onChange={(color) => patch({ color, gradient: undefined })} />
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={!!value.gradient}
                onChange={(e) => patch({ gradient: e.target.checked
                  ? { from: "#ff5555", to: "#55aaff", angle: 90 } : undefined })} />
              Gradient text
            </label>
            {value.gradient && (
              <div className="mt-1 grid grid-cols-3 gap-2">
                <ColorInput label="From" value={value.gradient.from}
                  onChange={(from) => patch({ gradient: { ...value.gradient!, from } })} />
                <ColorInput label="To" value={value.gradient.to}
                  onChange={(to) => patch({ gradient: { ...value.gradient!, to } })} />
                <NumberInput label="Angle" value={value.gradient.angle}
                  onChange={(angle) => patch({ gradient: { ...value.gradient!, angle: angle ?? 90 } })} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Background editor used for both card overrides and the slide canvas. */
export function BackgroundControls({ label, value, allowImage, onChange }: {
  label: string; value: Background | undefined; allowImage?: boolean;
  onChange: (v: Background | undefined) => void;
}) {
  const kind = value?.type ?? "theme";
  const kinds = allowImage ? ["theme", "solid", "gradient", "image"] : ["theme", "solid", "gradient"];
  return (
    <div className="mb-3">
      <SelectInput label={label} value={kind} options={kinds as never}
        onChange={(k) => {
          if (k === "theme") onChange(undefined);
          else if (k === "solid") onChange({ type: "solid", color: "#1c1c1e" });
          else if (k === "gradient") onChange({ type: "gradient", from: "#1a2980", to: "#26d0ce", angle: 135 });
          else onChange({ type: "image", src: "" });
        }} />
      {value?.type === "solid" && (
        <ColorInput label="Color" value={value.color}
          onChange={(color) => onChange({ type: "solid", color })} />
      )}
      {value?.type === "gradient" && (
        <div className="grid grid-cols-3 gap-2">
          <ColorInput label="From" value={value.from}
            onChange={(from) => onChange({ ...value, from })} />
          <ColorInput label="To" value={value.to}
            onChange={(to) => onChange({ ...value, to })} />
          <NumberInput label="Angle" value={value.angle}
            onChange={(angle) => onChange({ ...value, angle: angle ?? 135 })} />
        </div>
      )}
      {value?.type === "image" && (
        <TextInput label="Image URL" value={value.src}
          onChange={(src) => onChange({ type: "image", src })} />
      )}
    </div>
  );
}
