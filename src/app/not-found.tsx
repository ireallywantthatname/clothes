import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex-1 flex flex-col items-center justify-center px-4 py-20"
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <p className="label-caps">404</p>
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-mono text-2xl tracking-[0.2em] text-mono-900 text-balance">
            PAGE NOT FOUND
          </h1>
          <p className="text-sm text-mono-500 leading-relaxed max-w-xs text-pretty">
            That route is not in the closet. Head back and keep mixing.
          </p>
        </div>
        <Link href="/" className="btn-primary px-6 py-3 text-sm tracking-wider">
          BACK HOME
        </Link>
      </div>
    </main>
  );
}
