import { Loader2 } from "lucide-react";
import BernatLogo from "@/assets/bernat medical without.svg";

export const Icons = {
  spinner: Loader2,
  logo: (props: React.HTMLAttributes<HTMLImageElement>) => (
    <img src={BernatLogo} alt="Bernat Medical" {...props} />
  ),
}; 