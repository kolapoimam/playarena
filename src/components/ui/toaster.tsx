import { useToast } from "@/hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { AlertTriangle, Check } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={4500}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const v = props.variant as string | undefined
        const bad = v === "destructive" || v === "error" || (typeof title === "string" && /error|fail|invalid|could not|can.t|not found|denied|missing/i.test(title))
        return (
          <Toast key={id} {...props} variant={bad ? "destructive" : props.variant === "error" ? "destructive" : props.variant}>
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: bad ? "#FEE2E2" : "#16A34A", color: bad ? "#B91C1C" : "#FFFFFF" }}
            >
              {bad ? <AlertTriangle size={20} /> : <Check size={20} strokeWidth={3} />}
            </span>
            <div className="flex-1 min-w-0 grid gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
