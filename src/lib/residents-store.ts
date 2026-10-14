import { eq } from "drizzle-orm";
import { withVillage } from "@/db";
import { households, persons } from "@/db/schema";
import { HEAD_RELATION, type HouseholdImport } from "./residents-import";

/**
 * Saves validated households and their members in one transaction. Runs as
 * the restricted role, so row-level security rejects any row that does not
 * belong to the given village. Returns the new person ids in input order.
 */
export async function insertHouseholds(villageId: string, imports: HouseholdImport[]): Promise<string[]> {
  return withVillage(villageId, async (tx) => {
    const personIds: string[] = [];
    for (const house of imports) {
      const [household] = await tx
        .insert(households)
        .values({ villageId, houseNo: house.houseNo, zone: house.zone })
        .returning({ id: households.id });

      for (const member of house.members) {
        const [person] = await tx
          .insert(persons)
          .values({
            villageId,
            householdId: household.id,
            title: member.title,
            firstName: member.firstName,
            lastName: member.lastName,
            nickname: member.nickname,
            relationToHead: member.relationToHead,
            birthDate: member.birthDate,
            phone: member.phone,
            note: member.note,
          })
          .returning({ id: persons.id });
        personIds.push(person.id);

        if (member.relationToHead === HEAD_RELATION) {
          await tx.update(households).set({ headPersonId: person.id }).where(eq(households.id, household.id));
        }
      }
    }
    return personIds;
  });
}
