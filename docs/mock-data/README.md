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

The server imports these CSV rows idempotently when it starts. Startup rows appear in the normal Startup Marketplace. Government-official rows appear in the Platform Admin mock-data directory. The importer never creates login accounts from this CSV, and does not use the `initial_password` column; this avoids exposing shared mock credentials in the public deployment.
