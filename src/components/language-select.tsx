import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { set } from "idb-keyval";
import { useRouter, useSearchParams } from "next/navigation";

export default function LanguageSelect() {
  const { replace } = useRouter();
  const params = useSearchParams();
  const value = params.get("lang") ?? "es";
  const onboarding = params.get("onboarding");

  return (
    <Select
      value={value}
      onValueChange={(newValue: string) => {
        if (onboarding) {
          replace(`/speak?lang=${newValue}&onboarding=true`);
        }
        replace(`/speak?lang=${newValue}`);

        // Persist the value to IndexedDB
        set("settings", { language: newValue });
      }}
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Language</SelectLabel>
          <SelectItem value="es">Spanish</SelectItem>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="it">Italian</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
