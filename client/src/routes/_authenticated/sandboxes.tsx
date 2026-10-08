import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, DatabaseIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sandboxes")({
  component: SandboxesPage,
});

function SandboxesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
            <DatabaseIcon className="size-6" />
            Persistent Sandboxes
          </h2>
          <p className="text-sm text-muted-foreground">Manage long-running sandbox environments.</p>
        </div>
        <Button>
          <PlusIcon className="size-4 mr-2" />
          Create Sandbox
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Sandboxes</CardTitle>
          <CardDescription>List of persistent sandbox environments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DatabaseIcon className="size-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No persistent sandboxes yet</p>
            <p className="text-sm mt-2">Create your first persistent sandbox to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
