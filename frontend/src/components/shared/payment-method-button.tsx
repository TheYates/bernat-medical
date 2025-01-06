import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

interface PaymentMethodButtonProps {
  id: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function PaymentMethodButton({
  id,
  label,
  selected,
  onClick,
}: PaymentMethodButtonProps) {
  const getIcon = () => {
    switch (id) {
      case "card":
        return <Icons.creditCard className="h-6 w-6 mb-2" />;
      case "mobile":
        return <Icons.smartphone className="h-8 w-8 mb-2" />;
      case "cash":
        return <Icons.wallet className="h-8 w-8 mb-2" />;
      case "insurance":
        return <Icons.shield className="h-8 w-8 mb-2" />;
      default:
        return null;
    }
  };

  return (
    <Button
      variant="outline"
      className={cn(
        "h-auto w-[120px] flex flex-col items-center justify-center py-4 px-2",
        "border-2 hover:bg-accent",
        selected && "border-primary bg-accent"
      )}
      onClick={onClick}
    >
      {getIcon()}
      <span className="text-sm font-medium">{label}</span>
    </Button>
  );
}
