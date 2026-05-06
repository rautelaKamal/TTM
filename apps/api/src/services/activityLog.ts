import { prisma } from "@ttm/db";

interface FieldDiff {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

const TRACKED_FIELDS = [
  "title",
  "description",
  "status",
  "assigneeId",
  "dueDate",
];

export function diffTask(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  for (const field of TRACKED_FIELDS) {
    if (!(field in incoming)) continue;
    const oldVal = existing[field];
    const newVal = incoming[field];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      diffs.push({
        field,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      });
    }
  }

  return diffs;
}

export async function logActivity(
  taskId: string,
  userId: string,
  action: string,
  diffs: FieldDiff[] = []
) {
  const entries =
    diffs.length > 0
      ? diffs.map((d) => ({
          taskId,
          userId,
          action,
          field: d.field,
          oldValue: d.oldValue,
          newValue: d.newValue,
        }))
      : [
          {
            taskId,
            userId,
            action,
            field: null,
            oldValue: null,
            newValue: null,
          },
        ];

  await prisma.activityLog.createMany({ data: entries });
}
