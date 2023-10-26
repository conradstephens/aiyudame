import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { set } from "idb-keyval";
import { block } from "million/react";
import { useFormContext } from "react-hook-form";

const LanguageSelect = block(
  function LanguageSelect() {
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
  },
  { ssr: false },
);

export default LanguageSelect;
