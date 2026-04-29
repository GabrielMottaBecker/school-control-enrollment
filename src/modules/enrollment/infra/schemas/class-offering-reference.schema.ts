import { pgTable, uuid } from "drizzle-orm/pg-core";

export const classOfferingsReferenceSchema = pgTable("class_offerings", {
  id: uuid("id").primaryKey(),
});
