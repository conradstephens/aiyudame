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
import { useFormContext } from "react-hook-form";

export default function LanguageSelect() {
  const methods = useFormContext();

  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name="language"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Language</SelectLabel>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
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
