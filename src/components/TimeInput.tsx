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
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (value) {
      const [timePart, periodPart] = value.split(" ");
      if (timePart) {
        const [h, m] = timePart.split(":");
        setHour(h);
        setMinute(m);
      }
      if (periodPart === "AM" || periodPart === "PM") setPeriod(periodPart);
    }
  }, [value]);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setHour(val);
    onChange(`${val}:${minute} ${period}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setMinute(val);
    onChange(`${hour}:${val} ${period}`);
  };

  const handlePeriodChange = (val: string) => {
    const updated = val === "PM" ? "PM" : "AM";
    setPeriod(updated);
    onChange(`${hour}:${minute} ${updated}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex w-full gap-2">
        <select
          value={hour}
          onChange={handleHourChange}
          disabled={disabled}
          className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white p-2 rounded-md w-20 max-h-40 overflow-y-auto"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-base dark:text-white">:</span>
        <select
          value={minute}
          onChange={handleMinuteChange}
          disabled={disabled}
          className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white p-2 rounded-md w-20 max-h-40 overflow-y-auto"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <ToggleGroup
        type="single"
        value={period}
        onValueChange={handlePeriodChange}
        className="shrink-0"
      >
        <ToggleGroupItem
          value="AM"
          disabled={disabled}
          className="data-[state=on]:bg-[#17a34a] data-[state=on]:text-white"
        >
          AM
        </ToggleGroupItem>
        <ToggleGroupItem
          value="PM"
          disabled={disabled}
          className="data-[state=on]:bg-[#17a34a] data-[state=on]:text-white"
        >
          PM
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default TimeInput;
