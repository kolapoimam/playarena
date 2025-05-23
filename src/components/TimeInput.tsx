import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const hourRef = useRef<HTMLSelectElement>(null);
  const minuteRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (value) {
      const [timePart, periodPart] = value.split(" ");
      if (timePart) setTime(timePart);
      if (periodPart === "AM" || periodPart === "PM") setPeriod(periodPart);
    }
  }, [value]);

  const handleTimeChange = (type: "hour" | "minute", val: number) => {
    const [currentHour, currentMinute] = time.split(":");
    let newTime = "";

    if (type === "hour") {
      newTime = `${val.toString().padStart(2, "0")}:${currentMinute || "00"}`;
    } else {
      newTime = `${currentHour || "12"}:${val.toString().padStart(2, "0")}`;
    }

    setTime(newTime);
    onChange(`${newTime} ${period}`);
  };

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setPeriod(newPeriod);
    onChange(`${time} ${newPeriod}`);
  };

  const generateNumbers = (start: number, end: number, step: number = 1) => {
    const numbers = [];
    for (let i = start; i <= end; i += step) {
      numbers.push(i);
    }
    return numbers;
  };

  const hours = generateNumbers(1, 12);
  const minutes = generateNumbers(0, 59, 5);

  const [hour, minute] = time.split(":").map(part => parseInt(part, 10));

  // Enable smooth scrolling for select elements
  const handleScroll = (ref: React.RefObject<HTMLSelectElement>, type: "hour" | "minute") => {
    if (ref.current) {
      const selectedIndex = ref.current.selectedIndex;
      handleTimeChange(type, type === "hour" ? hours[selectedIndex] : minutes[selectedIndex]);
    }
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1 flex-1">
        <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
        
        {/* Hour Selector */}
        <div className="relative flex-1">
          <select
            ref={hourRef}
            value={hour || 12}
            onChange={(e) => handleTimeChange("hour", parseInt(e.target.value, 10))}
            onMouseUp={() => hourRef.current?.blur()}
            onTouchEnd={() => hourRef.current?.blur()}
            onScroll={() => handleScroll(hourRef, "hour")}
            disabled={disabled}
            className="w-full bg-transparent py-2 pl-2 pr-6 appearance-none focus:outline-none cursor-pointer text-center scroll-smooth"
            size={5} // Makes the select scrollable
          >
            {hours.map((h) => (
              <option key={`hour-${h}`} value={h}>
                {h.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        
        <span className="text-gray-500">:</span>
        
        {/* Minute Selector */}
        <div className="relative flex-1">
          <select
            ref={minuteRef}
            value={minute || 0}
            onChange={(e) => handleTimeChange("minute", parseInt(e.target.value, 10))}
            onMouseUp={() => minuteRef.current?.blur()}
            onTouchEnd={() => minuteRef.current?.blur()}
            onScroll={() => handleScroll(minuteRef, "minute")}
            disabled={disabled}
            className="w-full bg-transparent py-2 pl-2 pr-6 appearance-none focus:outline-none cursor-pointer text-center scroll-smooth"
            size={5} // Makes the select scrollable
          >
            {minutes.map((m) => (
              <option key={`minute-${m}`} value={m}>
                {m.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>

      {/* AM/PM Toggle */}
      <div className="relative flex items-center">
        <input
          type="checkbox"
          id={`period-toggle-${Math.random().toString(36).substring(2, 9)}`} // Unique ID for each instance
          checked={period === "PM"}
          onChange={() => handlePeriodChange(period === "AM" ? "PM" : "AM")}
          disabled={disabled}
          className="sr-only"
        />
        <label
          htmlFor={`period-toggle-${Math.random().toString(36).substring(2, 9)}`}
          className={`relative flex items-center justify-between h-10 w-24 rounded-full cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Track */}
          <div className={`absolute inset-0 rounded-full transition-colors ${period === "PM" ? 'bg-[#17a34a]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
          
          {/* Thumb */}
          <div className={`absolute left-1 top-1 h-8 w-11 rounded-full bg-white shadow-md transform transition-transform ${period === "PM" ? 'translate-x-11' : 'translate-x-0'}`}></div>
          
          {/* Labels */}
          <span className={`relative z-10 w-12 text-center text-sm font-medium ${period === "AM" ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            AM
          </span>
          <span className={`relative z-10 w-12 text-center text-sm font-medium ${period === "PM" ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            PM
          </span>
        </label>
      </div>
    </div>
  );
};

export default TimeInput;
