"use client";

import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  items?: NavItem[];
}

interface NavMainProps {
  items: NavItem[];
}

export function NavMain({ items }: NavMainProps) {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-2">
      {items.map((item) => (
        <NavItem key={item.title} item={item} pathname={location.pathname} />
      ))}
    </nav>
  );
}

function NavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.url !== "#" && pathname === item.url;
  const [isOpen, setIsOpen] = React.useState(item.isActive);

  if (!item.items) {
    return (
      <Link
        to={item.url}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>
        {item.title}
      </Link>
    );
  }

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>
        {item.title}
        <ChevronDownIcon
          className={cn("ml-auto size-4 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      {isOpen && (
        <div className="ml-8 mt-1 space-y-1 border-l border-border pl-2">
          {item.items.map((child) => (
            <Link
              key={child.title}
              to={child.url}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === child.url
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
