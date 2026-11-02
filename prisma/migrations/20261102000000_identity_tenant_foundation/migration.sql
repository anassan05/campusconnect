-- Initial identity schema. No credentials or authentication are implemented.
CREATE TYPE "Role" AS ENUM ('PLATFORM_SUPER_ADMIN', 'COLLEGE_ADMIN', 'PLACEMENT_OFFICER', 'COORDINATOR', 'STUDENT');

CREATE TABLE "colleges" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "college_id" UUID,
    "created_by_user_id" UUID,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_role_tenant_check" CHECK (
      ("role" = 'PLATFORM_SUPER_ADMIN' AND "college_id" IS NULL AND "created_by_user_id" IS NULL)
      OR ("role" <> 'PLATFORM_SUPER_ADMIN' AND "college_id" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_college_id_id_key" ON "users"("college_id", "id");
ALTER TABLE "users" ADD CONSTRAINT "users_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_college_id_created_by_user_id_fkey" FOREIGN KEY ("college_id", "created_by_user_id") REFERENCES "users"("college_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "colleges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "colleges" FORCE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

-- Missing/empty settings match no row. Platform users (NULL college_id) never
-- match; platform-wide access is not provided by the runtime role in Phase 1A.
CREATE POLICY "colleges_tenant_isolation" ON "colleges"
  USING ("id"::text = NULLIF(current_setting('app.college_id', true), ''))
  WITH CHECK ("id"::text = NULLIF(current_setting('app.college_id', true), ''));
CREATE POLICY "users_tenant_isolation" ON "users"
  USING ("college_id"::text = NULLIF(current_setting('app.college_id', true), ''))
  WITH CHECK ("college_id"::text = NULLIF(current_setting('app.college_id', true), ''));
