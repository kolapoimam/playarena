import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const TimeInput = ({
  value,
  onChange,
  disabled = false,
  placeholder = "01:00",
}: TimeInputProps) => {
  const [time, setTime] = useState("12:00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (value) {
      const [timePart, periodPart] = value.split(" ");
      if (timePart) setTime(timePart);
      if (periodPart === "AM" || periodPart === "PM") setPeriod(periodPart);
    }
  }, [value]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, "");
    if (val.length === 2 && !val.includes(":")) {
      val += ":";
    }

    if (/^\d{1,2}:\d{0,2}$/.test(val)) {
      setTime(val);
    }

    if (/^\d{1,2}:\d{2}$/.test(val)) {
      const formatted = formatTime(val);
      if (formatted) {
        setTime(formatted);
        onChange(`${formatted} ${period}`);
      }
    }
  };

  const handlePeriodChange = (val: string) => {
    const updated = val === "PM" ? "PM" : "AM";
    setPeriod(updated);
    onChange(`${time} ${updated}`);
  };

  const formatTime = (input: string): string | null => {
    const [h, m] = input.split(":");
    let hh = parseInt(h, 10);
    let mm = parseInt(m, 10);

    if (isNaN(hh) || isNaN(mm)) return null;
    if (hh < 1 || hh > 12) return null;
    if (mm < 0 || mm > 59) mm = 0;

    return `${hh.toString().padStart(2, "0")}:${mm
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative w-full">
        <Input
          type="text"
          value={time}
          onChange={handleTimeChange}
          disabled={disabled}
          placeholder={placeholder}
          className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white pr-10"
        />
        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <ToggleGroup
        type="single"
        value={period}
        onValueChange={handlePeriodChange}
        className="shrink-0"
      >
        <ToggleGroupItem value="AM" disabled={disabled}>
          AM
        </ToggleGroupItem>
        <ToggleGroupItem value="PM" disabled={disabled}>
          PM
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default TimeInput;
