import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";

import {
  TreeExpander,
  TreeIcon,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "@/components/kibo-ui/tree";
import { listSandboxFiles, type SandboxFile } from "@/lib/api";
import { formatBytes } from "@/lib/resources";

type FilesPanelProps = {
  sandboxName: string;
  enabled: boolean;
  onClose: () => void;
};

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function nameOf(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || "/";
}

function resolveFiles(parent: string, files: SandboxFile[]): SandboxFile[] {
  const base = parent.replace(/\/+$/, "");

  return files.map((file) => {
    const path = file.path.startsWith("/") ? file.path : `${base}/${file.path}`;
    return { ...file, path: path === "/" ? "/" : path.replace(/\/+$/, "") };
  });
}

function sortFiles(files: SandboxFile[]): SandboxFile[] {
  return [...files].sort((a, b) => {
    const aDirectory = a.kind === "directory" ? 0 : 1;
    const bDirectory = b.kind === "directory" ? 0 : 1;
    if (aDirectory !== bDirectory) return aDirectory - bDirectory;
    return nameOf(a.path).localeCompare(nameOf(b.path));
  });
}

type FileNodeProps = {
  entry: SandboxFile;
  level: number;
  isLast: boolean;
  parentPath: boolean[];
  childrenByPath: Record<string, SandboxFile[]>;
  loadingPaths: Set<string>;
  onLoad: (path: string) => void;
};

function FileNode({
  entry,
  level,
  isLast,
  parentPath,
  childrenByPath,
  loadingPaths,
  onLoad,
}: FileNodeProps) {
  const isDirectory = entry.kind === "directory";
  const children = childrenByPath[entry.path];
  const loading = loadingPaths.has(entry.path);
  const nextParentPath = [...parentPath, isLast];

  return (
    <TreeNode nodeId={entry.path} level={level} isLast={isLast} parentPath={parentPath}>
      <TreeNodeTrigger
        onClick={() => {
          if (isDirectory) onLoad(entry.path);
        }}
      >
        <TreeExpander
          hasChildren={isDirectory}
          onClick={() => {
            if (isDirectory) onLoad(entry.path);
          }}
        />
        <TreeIcon hasChildren={isDirectory} />
        <TreeLabel className="font-mono text-xs">{nameOf(entry.path)}</TreeLabel>
        {loading ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
        {isDirectory ? null : (
          <span className="ml-2 shrink-0 font-mono text-[10px] text-muted-foreground/60">
            {formatBytes(entry.size)}
          </span>
        )}
      </TreeNodeTrigger>

      <TreeNodeContent hasChildren={isDirectory}>
        {children === undefined ? (
          <p className="px-3 py-1 font-mono text-xs text-muted-foreground/60">
            {loading ? "loading…" : "not loaded"}
          </p>
        ) : children.length === 0 ? (
          <p className="px-3 py-1 font-mono text-xs text-muted-foreground/60">empty</p>
        ) : (
          children.map((child, index) => (
            <FileNode
              key={child.path}
              entry={child}
              level={level + 1}
              isLast={index === children.length - 1}
              parentPath={nextParentPath}
              childrenByPath={childrenByPath}
              loadingPaths={loadingPaths}
              onLoad={onLoad}
            />
          ))
        )}
      </TreeNodeContent>
    </TreeNode>
  );
}

export function FilesPanel({ sandboxName, enabled, onClose }: FilesPanelProps) {
  const [childrenByPath, setChildrenByPath] = useState<Record<string, SandboxFile[]>>({});
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef<Set<string>>(new Set());

  const load = useCallback(
    async (path: string, force = false) => {
      if (!enabled) return;
      if (!force && (loadedRef.current.has(path) || loadingRef.current.has(path))) return;

      loadingRef.current.add(path);
      setLoadingPaths(new Set(loadingRef.current));

      try {
        const files = await listSandboxFiles(sandboxName, path);
        loadedRef.current.add(path);
        setChildrenByPath((current) => ({
          ...current,
          [path]: sortFiles(resolveFiles(path, files)),
        }));
        setError(null);
      } catch (cause) {
        setError(message(cause));
      } finally {
        loadingRef.current.delete(path);
        setLoadingPaths(new Set(loadingRef.current));
      }
    },
    [enabled, sandboxName],
  );

  useEffect(() => {
    loadedRef.current.clear();
    loadingRef.current.clear();
    setChildrenByPath({});
    setLoadingPaths(new Set());
    setError(null);

    if (enabled) void load("/", true);
  }, [enabled, load]);

  function refresh() {
    loadedRef.current.clear();
    setChildrenByPath({});
    setError(null);
    void load("/", true);
  }

  const root = childrenByPath["/"];
  const rootLoading = loadingPaths.has("/");

  return (
    <section aria-label="Files" className="h-fit rounded-md border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">files</span>
        {rootLoading ? (
          <span className="font-mono text-xs text-muted-foreground/70">listing…</span>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={refresh}
            disabled={!enabled || rootLoading}
            title="Refresh files"
            aria-label="Refresh files"
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5"
          >
            <RefreshCw className={rootLoading ? "animate-spin" : undefined} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Hide files"
            aria-label="Hide files"
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
          >
            <X />
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="border-b px-3 py-2 font-mono text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="max-h-[calc(100vh-12rem)] overflow-auto">
        {!enabled ? (
          <p className="px-3 py-4 font-mono text-xs text-muted-foreground/70">
            start the sandbox to browse its files
          </p>
        ) : root === undefined ? (
          rootLoading ? (
            <p className="flex items-center gap-2 px-3 py-4 font-mono text-xs text-muted-foreground/70">
              <Loader2 className="size-3 animate-spin" />
              listing files…
            </p>
          ) : null
        ) : root.length === 0 ? (
          <p className="px-3 py-4 font-mono text-xs text-muted-foreground/70">empty directory</p>
        ) : (
          <TreeProvider
            indent={14}
            showLines={false}
            animateExpand={false}
            className="font-mono"
          >
            <TreeView className="p-1">
              {root.map((entry, index) => (
                <FileNode
                  key={entry.path}
                  entry={entry}
                  level={0}
                  isLast={index === root.length - 1}
                  parentPath={[]}
                  childrenByPath={childrenByPath}
                  loadingPaths={loadingPaths}
                  onLoad={(path) => void load(path)}
                />
              ))}
            </TreeView>
          </TreeProvider>
        )}
      </div>
    </section>
  );
}
