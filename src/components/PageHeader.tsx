import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

const PageHeader = ({ title, subtitle, onBack, actions }: PageHeaderProps) => {
  return (
    <div className="bg-gradient-to-r from-playarena-500 to-playarena-700 text-white py-6 px-4">
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      )}
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm mt-1 opacity-80">{subtitle}</p>}
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  );
};

export default PageHeader;
