import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ageOn } from "@/lib/age";
import { fullName, STATUS_LABELS } from "@/lib/format";
import type { ResidentSearchResult } from "@/lib/residents";
import { cn } from "@/lib/utils";

/** A tappable person card that opens their household with them highlighted. */
export function ResidentCard({
  resident,
  today,
  isHead = false,
  note,
}: {
  resident: ResidentSearchResult;
  /** Thailand's date (yyyy-mm-dd), for the age. */
  today: string;
  isHead?: boolean;
  /** An extra line, e.g. when the person turns 60. */
  note?: React.ReactNode;
}) {
  const age = ageOn(resident.birthDate, today);
  const isFormer = resident.status !== "resident";
  return (
    <li>
      <Link
        href={`/households/${resident.householdId}?person=${resident.id}`}
        className={cn(
          "flex items-center gap-3 rounded-md border-2 border-foreground p-4 transition-colors duration-150 active:bg-muted",
          isFormer && "border-dashed",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-title font-bold">{fullName(resident)}</p>
          <p>
            {resident.nickname && <>ชื่อเล่น {resident.nickname} · </>}
            บ้านเลขที่ <strong className="tabular-nums">{resident.houseNo}</strong>
            {age !== null && <> · อายุ {age} ปี</>}
          </p>
          {note && <p className="font-semibold">{note}</p>}
          {(isHead || isFormer) && (
            <div className="flex flex-wrap gap-2">
              {isHead && <Badge variant="strong">หัวหน้าครัวเรือน</Badge>}
              {isFormer && <Badge>{STATUS_LABELS[resident.status]}</Badge>}
            </div>
          )}
        </div>
        <ChevronRight aria-hidden className="size-7 shrink-0" strokeWidth={2.5} />
      </Link>
    </li>
  );
}
