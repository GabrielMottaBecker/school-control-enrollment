import { classOfferingsReferenceSchema } from "./class-offering-reference.schema";
import { studentsReferenceSchema } from "./student-reference.schema";
import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "canceled",
]);

export const enrollmentsSchema = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => studentsReferenceSchema.id),
  classOfferingId: uuid("class_offering_id")
    .notNull()
    .references(() => classOfferingsReferenceSchema.id),
  status: enrollmentStatusEnum("status").notNull().default("active"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});