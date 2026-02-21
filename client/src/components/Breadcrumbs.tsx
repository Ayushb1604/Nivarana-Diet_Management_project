import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const [location] = useLocation();

  // Auto-generate breadcrumbs from path if not provided
  const breadcrumbs: BreadcrumbItem[] = items || (() => {
    const paths = location.split("/").filter(Boolean);
    const result: BreadcrumbItem[] = [{ label: "Home", href: "/dashboard" }];
    
    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const label = path
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      
      result.push({
        label,
        href: index === paths.length - 1 ? undefined : currentPath,
      });
    });
    
    return result;
  })();

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index === 0 && <Home className="w-4 h-4 text-muted-foreground" />}
          {item.href ? (
            <Link href={item.href}>
              <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {item.label}
              </span>
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {index < breadcrumbs.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </nav>
  );
}

