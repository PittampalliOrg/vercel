BEGIN;

-- 1. Move existing JSON content from message to state:
--    - key = message.id (cast to text)
--    - value = message.content (cast to text, then to bytea)
INSERT INTO public.state (key, value)
SELECT m.id::text AS key,
       m.content::text::bytea AS value
  FROM public.message m
 WHERE m.content IS NOT NULL
       -- Make sure we don't duplicate rows in state if they already exist:
       AND NOT EXISTS (
         SELECT 1
           FROM public.state s
          WHERE s.key = m.id::text
       );

-- 2. Remove the content column from the message table
ALTER TABLE public.message
  DROP COLUMN content;

-- 3. Drop the old primary key on state (since we’ll convert key -> uuid)  
ALTER TABLE public.state
  DROP CONSTRAINT IF EXISTS state_pkey CASCADE;

-- 4. Convert state.key from text to uuid
ALTER TABLE public.state
  ALTER COLUMN key TYPE uuid USING (key::uuid);

-- 5. Reinstate the primary key on state (now that key is uuid)
ALTER TABLE public.state
  ADD CONSTRAINT state_pkey PRIMARY KEY (key);

-- 6. Add a foreign key so each state.key references message.id
ALTER TABLE public.state
  ADD CONSTRAINT state_message_fk
  FOREIGN KEY (key)
  REFERENCES public.message(id)
  ON DELETE CASCADE;

COMMIT;
