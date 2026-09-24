import { drizzle } from "drizzle-orm/libsql"

import { getAuthDbCredentials } from "@/db/config"

const { url, authToken } = getAuthDbCredentials()

export const db = drizzle({
  connection: {
    url,
    authToken,
  },
})
