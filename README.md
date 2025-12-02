# SysOut

A web POS system for the SysOut Printing shop of our own.

Features:
- GCASH POS
- PRINTING POS

User features(GCASH):
- The user must be able to login using their details
- The user must be able to input the amount of money the costumer wants to insert.
- The user must be able to input how much money the costumer wants to pull out.

- The user must be able to see how much money is still their in the Gcash Account
- The user must be able to see how much was generated with sorting filters
    - Per day
    - Per month
- The user must be able to download the Excel List containing how much was put out and put in
- The user must be able to view a detailed transaction history with search and filter options.
- The user must be able to generate an end-of-shift report summarizing their transactions.

Admin features(GCASH): 
- The user must be able to input how much money currently available in the Gcash account
- The user must be able to see how much money is still their in the Gcash Account
- The user must be able to manage user accounts (Add, Edit, Deactivate).
- The admin must be able to view comprehensive reports and analytics on GCash transactions.
- The admin must be able to view an audit log of all significant user actions.

User Features(Printing):
- The user must be able to calculate printing costs based on:
    - Paper size (e.g., A4, Letter, Legal)
    - Print type (e.g., Black & White, Colored)
    - Number of pages
- The user must be able to add multiple print jobs to a single customer transaction.
- The user must be able to process payments for printing services.

Admin Features(Printing):
- The admin must be able to set and update pricing for different print services and paper types.
- The admin must be able to view overall printing sales reports.

General System Features:
- **Dashboard:** A main dashboard showing key metrics at a glance (e.g., total sales, GCash transaction volume, recent activity).
- **Security:** Secure user authentication with password policies and automatic logout after a period of inactivity.
- **Unified Reporting:** Generate combined reports for both printing and GCash services.