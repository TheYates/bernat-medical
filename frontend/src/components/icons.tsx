import {
  Loader2,
  CreditCard,
  Smartphone,
  Wallet,
  Shield,
  // Add other icons you need
} from "lucide-react";
import BernatLogo from "@/assets/bernat medical without.svg";

export const Icons = {
  // Keep existing icons
  spinner: Loader2,
  logo: (props: React.HTMLAttributes<HTMLImageElement>) => (
    <img src={BernatLogo} alt="Bernat Medical" {...props} />
  ),

  // Add new payment method icons
  creditCard: CreditCard,
  smartphone: Smartphone,
  wallet: Wallet,
  shield: Shield,
};
