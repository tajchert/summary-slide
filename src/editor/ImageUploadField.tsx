import { TextInput } from "./inspector-fields";

/** URL input now; upgraded to real R2 upload in Task 17. */
export function ImageUploadField({ label, value, onChange }: {
  label: string; value: string; onChange: (src: string) => void;
}) {
  return <TextInput label={label} value={value} onChange={onChange} />;
}
