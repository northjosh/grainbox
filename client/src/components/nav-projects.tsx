"use client"

import { Link, useLocation } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Project {
  name: string
  url: string
  icon?: React.ReactNode
}

interface NavProjectsProps {
  projects: Project[]
}

export function NavProjects({ projects }: NavProjectsProps) {
  const pathname = useLocation()

  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center justify-between px-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </h3>
        <Link
          to="/"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3.5" />
        </Link>
      </div>
      <nav className="space-y-1">
        {projects.map((project) => (
          <Link
            key={project.name}
            to={project.url}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.pathname === project.url
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              {project.icon}
            </span>
            {project.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}