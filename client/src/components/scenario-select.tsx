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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roles } from "@/constants/prompts";
import { set } from "idb-keyval";
import { useFormContext } from "react-hook-form";

export default function ScenarioSelect() {
  const methods = useFormContext();

  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name="scenario"
        render={({ field }) => (
          <FormItem className="scenario-select">
            <FormLabel>Scenario</FormLabel>
            <FormControl>
              <Select
                value={field.value}
                onValueChange={(value: string) => {
                  field.onChange(value);

                  // Persist the value to IndexedDB
                  set("settings", { scenario: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {roles.map(({ category, scenarios }) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {scenarios.map((scenario) => (
                        <SelectItem
                          key={scenario}
                          value={scenario.toLowerCase().replaceAll(" ", "")}
                        >
                          {scenario}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  );
}
