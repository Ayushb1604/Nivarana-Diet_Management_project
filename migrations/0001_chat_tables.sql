CREATE TABLE "conversations" (
    "id" serial PRIMARY KEY,
    "user_id" varchar NOT NULL,
    "title" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
    "id" serial PRIMARY KEY,
    "conversation_id" integer NOT NULL,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade;
--> statement-breakpoint
