import ThemeToggle from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex justify-center">
      <div className="flex flex-col gap-5 p-5 sm:max-w-4xl w-full">
        <div className="flex justify-between">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
