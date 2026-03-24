import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ step: "user_lookup", found: false });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    return NextResponse.json({
      step: "password_check",
      found: true,
      email: user.email,
      name: user.name,
      hashPrefix: user.passwordHash.slice(0, 10),
      passwordValid: isValid,
    });
  } catch (e) {
    return NextResponse.json({
      step: "error",
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
