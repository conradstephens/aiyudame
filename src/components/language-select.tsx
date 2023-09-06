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
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

export default function LanguageSelect() {
  const methods = useFormContext();
  const watchLanguage = methods.watch("language");

  useEffect(() => {
    localStorage.setItem("language", watchLanguage);
  }, [watchLanguage]);

  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name="language"
        render={({ field }) => (
          <FormItem>
            {/* <FormLabel>AI Model</FormLabel> */}
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
