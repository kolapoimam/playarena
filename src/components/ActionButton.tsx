
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

export default function ActionButton({ icon: Icon, label, href }: ActionButtonProps) {
  return (
    <Link to={href} className="flex flex-col items-center justify-center p-4 bg-secondary hover:bg-accent rounded-lg transition-all duration-200">
      <Icon className="h-8 w-8 text-primary mb-2" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
