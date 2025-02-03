## dab-config.json
<p>&nbsp;</p>

```mermaid
stateDiagram-v2
direction LR

  classDef empty fill:none,stroke:none
  classDef table stroke:black;
  classDef view stroke:black;
  classDef proc stroke:black;
  classDef phantom stroke:gray,stroke-dasharray:5 5;

  class NoTables empty
  class NoViews empty
  class NoProcs empty

  class Suggestion table
  class Chat table
  class Document table
  class Message table
  class User table
  class Vote table
  state Tables {
    Suggestion
    Chat
    Document
    Message
    User
    Vote
  }
  state Views {
    NoViews
  }
  state Procedures {
    NoProcs
  }
```

### Tables
|Entity|Source|Relationships
|-|-|-
|Suggestion|public.suggestion|-
|Chat|public.chat|-
|Document|public.document|-
|Message|public.message|-
|User|public.user|-
|Vote|public.vote|-

### Views
> None

### Stored Procedures
> None

