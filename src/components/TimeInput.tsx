import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { Clock } from "lucide-react"; // Add this import

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const TimeInput = ({ value, onChange, disabled = false, placeholder = "e.g., 01:00 PM" }: TimeInputProps) => {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.toUpperCase();
    let formattedValue = rawValue;

    // Allow only digits, colon, space, and AM/PM
    formattedValue = rawValue.replace(/[^0-9:APM]/g, '');

    // Split into parts for validation
    const parts = formattedValue.split(/[:\s]/);
    let hours = parts[0] ? parseInt(parts[0], 10) : 0;
    let minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    const period = parts[2] || '';

    // Validate and normalize hours (01-12)
    if (hours > 12 || hours < 1) hours = 1;
    if (hours.toString().length > 2) hours = parseInt(hours.toString().slice(0, 2), 10);

    // Validate and normalize minutes (00-59)
    if (minutes > 59) minutes = 59;
    if (minutes.toString().length > 2) minutes = parseInt(minutes.toString().slice(0, 2), 10);

    // Ensure period is valid (AM or PM)
    let validPeriod = period.match(/(AM|PM)/) ? period : '';

    // Reconstruct the time string
    let newValue = '';
    if (hours || hours === 0) newValue += hours.toString().padStart(2, '0');
    if (minutes || minutes === 0) newValue += `:${minutes.toString().padStart(2, '0')}`;
    if (validPeriod) newValue += ` ${validPeriod}`;

    // Update state and trigger onChange
    setInputValue(newValue);
    onChange(newValue);
  }, []);

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue || ""}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white pr-10"
      />
      <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
};

export default TimeInput;
