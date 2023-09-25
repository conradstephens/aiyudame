import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
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
import { useFormContext } from "react-hook-form";

export default function LanguageSelect() {
  const methods = useFormContext();

  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name="language"
        render={({ field }) => (
          <FormItem className="language-select">
            <FormControl>
              <Select
                value={field.value}
                onValueChange={(value: string) => {
                  field.onChange(value);
                  // Persist the value to IndexedDB
                  set("settings", { language: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Language</SelectLabel>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  );
}
