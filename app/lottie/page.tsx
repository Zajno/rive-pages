import Link from "next/link";
import { getAllDemos, LottieDemo } from "@/lib/lottie-demos";
import DemoCard from "@/components/lottie/DemoCard";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LottieListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const showPrivate = Object.prototype.hasOwnProperty.call(sp, "zajno-admin");
  let demos: LottieDemo[] = [];
  let fetchError: string | null = null;

  try {
    demos = await getAllDemos(showPrivate);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Failed to load demos";
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              ← Back to home
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Lottie Scroll Demos
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Create and manage scroll-driven Lottie animation demos
            </p>
            {showPrivate && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Admin mode: private demos are visible
              </p>
            )}
          </div>
          <Link
            href={showPrivate ? "/lottie/new?zajno-admin" : "/lottie/new"}
            className="btn-primary"
          >
            + New demo
          </Link>
        </div>

        {/* Error */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-600 dark:text-red-400">
            <strong>Error loading demos:</strong> {fetchError}
            <br />
            <span className="text-xs opacity-70">
              Make sure your Supabase credentials are set in .env.local and the table exists.
            </span>
          </div>
        )}

        {/* List */}
        {!fetchError && demos.length === 0 && (
          <div className="text-center py-20 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
            <p className="text-zinc-400 dark:text-zinc-500 text-lg">No demos yet</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">
              Create your first Lottie scroll demo
            </p>
            <Link
              href={showPrivate ? "/lottie/new?zajno-admin" : "/lottie/new"}
              className="btn-primary mt-6 inline-flex"
            >
              + New demo
            </Link>
          </div>
        )}

        {!fetchError && demos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {demos.map((demo) => (
              <DemoCard key={demo.id} demo={demo} adminMode={showPrivate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
