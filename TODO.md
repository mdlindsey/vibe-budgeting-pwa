# Backlog

Review `PRD.md` and the existing repo as needed to understand context for each task. Feel free to ask clarifying questions if necessary.

## Task

Enhancements:
- Store their text input in the spreadsheet under a new column "description" if present
- Error messaging
  - "Duplicate receipt detected"
  - "No receipt detected"
  - "OpenAI failed to respond"
  - "Image failed to upload"
- Test models with sample image and expected output repeatedly to find best fit
- Guardrails on output to ensure it's only responding to related questions
- Upload statements to ask for missing receipts
- Allow voice and make it so the submit button is less tied to the text input

Bugs:
- Waffle House “in about 15 hours” 
- Didn’t read TopGolf receipt until it's cropped
- Large numbers should be comma separated
- Clear chat history when disconnecting sheet
- Starting screen should detect client theme (dark or light) rather than choosing light as default until the "active user" state is reached
- Extracts wrong/inconsistent amounts; top golf logged as 407 then 414.75 but actual amount was 436.98
  - The next time it logged it as additional line items in the previous transaction
- If sheet isn't shared with the SA it should throw an error and take you back to the regular screen not progress to active