dab init --database-type "postgresql" --host-mode "Development" --connection-string "Host=db;Port=5432;Database=postgres;User ID=postgres;Password=postgres;"

dab add Chat --source "public.chat" --permissions "anonymous:*"
dab add Document --source "public.document" --permissions "anonymous:*"
dab add Message --source "public.message" --permissions "anonymous:*"
dab add Suggestion --source "public.suggestion" --permissions "anonymous:*"
dab add User --source "public.user" --permissions "anonymous:*"
dab add Vote --source "public.vote" --permissions "anonymous:*"
dab add Unicorns --source "public.unicorns" --permissions "anonymous:*"