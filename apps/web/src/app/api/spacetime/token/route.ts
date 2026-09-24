import { auth } from "@/lib/auth"

const spacetimeServerUrl =
  process.env.SPACETIME_SERVER_URL ?? "https://maincloud.spacetimedb.com"
const spacetimeDatabaseName =
  process.env.SPACETIME_DATABASE_NAME ?? "free-roam-97kss"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session)
    return Response.json({ message: "Unauthorized" }, { status: 401 })

  return Response.json({
    databaseName: spacetimeDatabaseName,
    serverUrl: spacetimeServerUrl,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
  })
}
