# Vyavsay Mock Data

These CSV files are synthetic demo data. They are not real people, real government officials, real startup registrations, or production credentials.

`government-officials.csv` mirrors the current Government Official registration fields:

- `name`, `email`, `initial_password`, `role`
- `department`, `designation`, `employee_id`

`startups.csv` combines the Startup registration and Discovery Profile fields:

- Account and registration: `account_name`, `email`, `initial_password`, `role`, `company_name`, `cin`, `dpiit_number`
- Discovery: `sector`, `technology_tags`, `trl`, `location`, `website`, `description`, `past_government_pilots`
- Eligibility: `registered`, `dpiit_recognised`, `years_active`, `certifications`
- Demo metadata: `rating`, `badge`, `source`, `screening_case`

Technology tags and certifications are semicolon-separated so the fields remain CSV-safe. Convert them to arrays when importing into the application.

The current signup API does not bulk-import CSV records or accept plaintext passwords. Treat `initial_password` as development-only mock data; a future importer should hash it using the existing registration logic before storing it.
