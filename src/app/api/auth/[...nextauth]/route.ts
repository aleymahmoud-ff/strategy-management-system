import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

const { GET: authGET, POST: authPOST } = handlers;

function withNoCache(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const res = await handler(req);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    return res;
  };
}

export const GET = withNoCache(authGET);
export const POST = withNoCache(authPOST);
export const dynamic = "force-dynamic";
