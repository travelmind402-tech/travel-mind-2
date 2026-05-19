import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
      <p className="text-lg text-muted-foreground">Page not found</p>
      <Link href="/">
        <Button variant="outline">Go Home</Button>
      </Link>
    </div>
  );
}
