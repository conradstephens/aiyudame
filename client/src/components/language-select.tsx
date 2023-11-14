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
import { UseFormReturn } from "react-hook-form";

interface ComponentProps {
  methods: UseFormReturn<
    {
      language: string;
      scenario: string;
    },
    any,
    undefined
  >;
}

export default function LanguageSelect(props: ComponentProps) {
  const { methods } = props;

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
