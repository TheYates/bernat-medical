import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-7xl font-bold">404</h1>
      <p className="text-2xl mt-4 mb-8 text-muted-foreground">Page not found</p>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );
} 