import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  description: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdminApiSession();
    const rows = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const body = patchSchema.parse(await request.json());
    const updated = await prisma.appSetting.upsert({
      where: { key: body.key },
      create: {
        key: body.key,
        value: body.value as object,
        description: body.description,
      },
      update: {
        value: body.value as object,
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
