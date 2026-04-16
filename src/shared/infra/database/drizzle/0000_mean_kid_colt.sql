CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'canceled');--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL
);--> statement-breakpoint
CREATE TABLE "class_offerings" (
	"id" uuid PRIMARY KEY NOT NULL
);--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_offering_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "enrollments_class_offering_id_class_offerings_id_fk" FOREIGN KEY ("class_offering_id") REFERENCES "public"."class_offerings"("id") ON DELETE no action ON UPDATE no action
);