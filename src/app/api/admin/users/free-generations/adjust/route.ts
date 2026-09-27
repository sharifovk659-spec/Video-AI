import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adjustUserFreeGenerations } from "@/lib/admin/adjust-user-free-generations";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError } from "@/lib/errors/handle-api-error";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid(),
  delta: z.number().int().refine((v) => v !== 0),
  note: z.string().min(3).max(512),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminApiSession();
    const body = schema.parse(await request.json());
    const result = await adjustUserFreeGenerations({
      userId: body.userId,
      delta: body.delta,
      adminActorId: user.id,
      note: body.note,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
