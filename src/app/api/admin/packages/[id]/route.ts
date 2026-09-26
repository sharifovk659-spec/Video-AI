import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  slug: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(255).optional(),
  credits: z.coerce.number().int().positive().optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  benefits: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdminApiSession();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    assertFound(await prisma.creditPackage.findUnique({ where: { id } }));
    const updated = await prisma.creditPackage.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminApiSession();
    const { id } = await params;
    await prisma.creditPackage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
