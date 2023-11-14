import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
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
            <FormLabel>Language</FormLabel>
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
                    <SelectItem value="es">Spanish</SelectItem>
                    {/* <SelectItem value="en">English</SelectItem> */}
                    {/* <SelectItem value="it">Italian</SelectItem> */}
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