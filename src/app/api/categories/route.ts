import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  loadCategories,
  createCategory,
  deleteCategory,
  renameCategory,
  assignChannel,
  unassignChannel,
} from "@/lib/storage";

async function getUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email || null;
}

// GET: 카테고리 목록 조회
export async function GET() {
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await loadCategories(email);
    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("Failed to load categories:", error?.message);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}

// POST: 카테고리 생성 / 채널 배정 / 배정 해제 / 이름 변경 / 삭제
export async function POST(request: NextRequest) {
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { name } = body;
        if (!name?.trim()) {
          return NextResponse.json(
            { error: "name is required" },
            { status: 400 }
          );
        }
        const category = await createCategory(email, name.trim());
        return NextResponse.json({ category });
      }

      case "delete": {
        const { categoryId } = body;
        if (!categoryId) {
          return NextResponse.json(
            { error: "categoryId is required" },
            { status: 400 }
          );
        }
        await deleteCategory(email, categoryId);
        return NextResponse.json({ success: true });
      }

      case "rename": {
        const { categoryId, newName } = body;
        if (!categoryId || !newName?.trim()) {
          return NextResponse.json(
            { error: "categoryId and newName are required" },
            { status: 400 }
          );
        }
        await renameCategory(email, categoryId, newName.trim());
        return NextResponse.json({ success: true });
      }

      case "assign": {
        const { categoryId, channelId } = body;
        if (!categoryId || !channelId) {
          return NextResponse.json(
            { error: "categoryId and channelId are required" },
            { status: 400 }
          );
        }
        await assignChannel(email, categoryId, channelId);
        return NextResponse.json({ success: true });
      }

      case "unassign": {
        const { channelId } = body;
        if (!channelId) {
          return NextResponse.json(
            { error: "channelId is required" },
            { status: 400 }
          );
        }
        await unassignChannel(email, channelId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Category operation failed:", error?.message);
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
}
