CREATE TABLE "api_endpoints" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_endpoints_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"endpoint_id" text NOT NULL,
	"source_file" text NOT NULL,
	"path" text,
	"client" text NOT NULL,
	"name" text NOT NULL,
	"interface_name" text NOT NULL,
	"method" text NOT NULL,
	"return_type" text NOT NULL,
	"parameters" jsonb,
	"body" text,
	"description" text,
	"segments" text[],
	"tool" jsonb NOT NULL,
	CONSTRAINT "api_endpoints_endpoint_id_key" UNIQUE("endpoint_id")
);