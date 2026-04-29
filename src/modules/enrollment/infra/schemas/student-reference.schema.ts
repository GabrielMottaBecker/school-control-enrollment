import { pgTable, uuid } from "drizzle-orm/pg-core";

export const studentsReferenceSchema = pgTable("students", {
  id: uuid("id").primaryKey(),
});