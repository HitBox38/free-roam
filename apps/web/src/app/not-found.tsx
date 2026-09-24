import Link from "next/link"

export default function NotFound() {
  return (
    <main className="container mx-auto flex flex-col gap-3 p-6 pt-16">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p>The requested page could not be found.</p>
      <Link href="/trips" className="underline">
        Back to trips
      </Link>
    </main>
  )
}
