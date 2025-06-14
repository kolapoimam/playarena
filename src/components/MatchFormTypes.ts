import { z } from "zod";

const skillLevels = ["Beginner", "Amateur", "Intermediate", "Advanced", "Professional", "All", "None"] as const;
const matchTypes = ["4-a-side", "5-a-side", "7-a-side", "11-a-side (Regular)", "Double", "Friendly", "All", "None"] as const;
const genders = ["Male", "Female", "All", "None"] as const;

const timePattern = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;

export const formSchema = z.object({
  title: z.string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title cannot exceed 100 characters" }),
  venue_id: z.string()
    .uuid({ message: "Please select a valid venue" }),
  match_date: z.date({ 
    required_error: "Please select a date",
    invalid_type_error: "Please select a valid date" 
  }),
  start_time: z.string()
    .regex(timePattern, { 
      message: "Please enter a valid start time in HH:MM AM/PM format (12-hour clock)" 
    }),
  end_time: z.string()
    .regex(timePattern, { 
      message: "Please enter a valid end time in HH:MM AM/PM format (12-hour clock)" 
    }),
  total_slots: z.number()
    .int({ message: "Must be a whole number" })
    .min(2, { message: "At least 2 players are required" })
    .max(100, { message: "Maximum 100 players allowed" }),
  is_paid: z.boolean().default(false),
  price: z.number()
    .min(0, { message: "Price cannot be negative" })
    .max(100000, { message: "Maximum price is ₦100,000" })
    .optional()
    .nullable()
    .refine(val => val === null || val === undefined || val >= 0, {
      message: "Price must be positive if provided"
    }),
  notes: z.string()
    .max(500, { message: "Notes cannot exceed 500 characters" })
    .optional(),
  organizer_name: z.string()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
  organizer_phone: z.string()
    .regex(/^[0-9]+$/, { message: "Must contain only numbers" })
    .length(11, { message: "Must be exactly 11 digits" })
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  disclose_phone: z.boolean().default(false),
  player_number_required: z.boolean().default(false),
  is_private: z.boolean().default(false),
  access_password: z.string().nullable().optional(),
  allow_bulk_tickets: z.boolean().default(false),
  skill_level: z.enum(skillLevels).optional().nullable()
    .transform(val => {
      if (val === "All") return null;
      if (val === "None") return "";
      return val;
    }),
  match_type: z.enum(matchTypes).optional().nullable()
    .transform(val => {
      if (val === "All") return null;
      if (val === "None") return "";
      return val;
    }),
  gender: z.enum(genders).optional().nullable()
    .transform(val => {
      if (val === "All") return null;
      if (val === "None") return "";
      return val;
    }),
  sell_tickets: z.boolean().default(false),
  ticket_price: z.number()
    .min(200, { message: "Ticket price must be at least ₦200" })
    .max(100000, { message: "Maximum ticket price is ₦100,000" })
    .optional()
    .nullable()
    .refine(val => val === null || val === undefined || val >= 200, {
      message: "Ticket price must be at least ₦200 if provided"
    }),
  max_tickets: z.number()
    .int({ message: "Must be a whole number" })
    .min(1, { message: "At least 1 ticket is required" })
    .max(5000, { message: "Maximum 5000 tickets allowed" })
    .optional()
    .nullable(),
}).refine(data => {
  const startDateTime = new Date(data.match_date);
  const [startHours, startMinutes] = data.start_time.replace(/ AM|PM/i, "").split(':').map(Number);
  const startPeriod = data.start_time.slice(-2).toUpperCase();
  let startH = startHours;
  if (startPeriod === "PM" && startHours !== 12) startH += 12;
  if (startPeriod === "AM" && startHours === 12) startH = 0;
  startDateTime.setHours(startH, startMinutes, 0, 0);

  const endDateTime = new Date(data.match_date);
  const [endHours, endMinutes] = data.end_time.replace(/ AM|PM/i, "").split(':').map(Number);
  const endPeriod = data.end_time.slice(-2).toUpperCase();
  let endH = endHours;
  if (endPeriod === "PM" && endHours !== 12) endH += 12;
  if (endPeriod === "AM" && endHours === 12) endH = 0;
  endDateTime.setHours(endH, endMinutes, 0, 0);

  const sameDayEarlier = endH < startH || (endH === startH && endMinutes <= startMinutes);
  if (sameDayEarlier) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return startDateTime < endDateTime;
}, {
  message: "Start time must be before end time",
  path: ["end_time"],
}).refine(data => {
  const now = new Date();
  const selectedDateTime = new Date(data.match_date);
  const [startHours, startMinutes] = data.start_time.replace(/ AM|PM/i, "").split(':').map(Number);
  const period = data.start_time.slice(-2).toUpperCase();
  let hours = startHours;
  if (period === "PM" && startHours !== 12) hours += 12;
  if (period === "AM" && startHours === 12) hours = 0;
  selectedDateTime.setHours(hours, startMinutes, 0, 0);

  const nowUTC = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const selectedUTC = new Date(selectedDateTime.getTime() + (selectedDateTime.getTimezoneOffset() * 60000));
  const tenMinutesLater = new Date(nowUTC.getTime() + 10 * 60 * 1000);

  return selectedUTC.getTime() >= tenMinutesLater.getTime();
}, {
  message: "Match must be scheduled at least clicks from now",
  path: ["start_time"],
}).refine(data => {
  if (data.sell_tickets && !data.ticket_price) {
    return false;
  }
  return true;
}, {
  message: "Ticket price is required when selling tickets",
  path: ["ticket_price"],
});

export type FormValues = z.infer<typeof formSchema>;
