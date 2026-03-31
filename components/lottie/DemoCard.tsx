"use client";

import Link from "next/link";
import { useState } from "react";
import { LottieDemo } from "@/lib/lottie-demos";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const CardPreview = dynamic(() => import("./CardPreview"), { ssr: false });

interface DemoCardProps {
  demo: LottieDemo;
  adminMode?: boolean;
}

export default function DemoCard({ demo, adminMode = false }: DemoCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const editHref = adminMode
    ? `/lottie/${demo.id}/edit?zajno-admin`
    : `/lottie/${demo.id}/edit`;

  const handleCopy = () => {
    const url = `${window.location.origin}/demo/${demo.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${demo.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/lottie-demos/${demo.id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setDeleting(false);
    }
  };

  const createdAt = new Date(demo.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
      {/* Preview thumbnail */}
      <div className="relative">
        <CardPreview demo={demo} />
        {demo.is_private && (
          <span className="absolute top-2 left-2 text-[10px] font-medium bg-zinc-900/70 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            Private
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {demo.title}
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{createdAt}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="btn-secondary text-xs w-full"
          title="Copy public URL"
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={editHref} className="btn-secondary text-xs flex-1 text-center">
            Edit
          </Link>
          <a
            href={`/demo/${demo.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs flex-1 text-center"
          >
            Open demo
          </a>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
