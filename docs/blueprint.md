# **App Name**: TeamUp

## Core Features:

- Name Input with Dynamic Fields: Users can input names into dynamically generated text fields. Each field is pre-filled with 'Person X' and can be easily cleared on focus. Pressing 'Enter' generates a new field with slight transparency, ready for input. Another 'Enter' press without input triggers team generation, excluding the empty field. Implements smooth URL-based state synchronization so your team config can be sent via URL. Includes automatic renumbering.
- Role Assignment: Enables users to assign roles to each person from a predefined list using dropdown menus. Offers warnings in case of logical problems.
- Must/Cannot Team Together: This function ensures certain individuals are always or never grouped together based on user-defined rules. The system allows for multiple selections using dropdown menus. A tool analyzes and validates team formation to recommend compromise or edits.
- Team Generation: Generates teams based on inputted names, roles, and constraints (mandatory and forbidden pairings) to guarantee some quota of each role are in each team.
- Team Adjustment: Allows users to drag and drop names between teams in the results field. Also features ‘return’ and ‘redo’ buttons to revert or reapply changes.
- Data Persistence with Firestore: Uses Firestore to persist team configurations, name lists, and group constellations.
- Multilingual Support: Implements multilingual support for multiple world languages to cater to a broad audience.
- SEO Optimization: Generates metadata descriptions that optimize content for common search engines like Google.

## Style Guidelines:

- Primary color: A vibrant blue (#29ABE2) to convey trust and collaboration.
- Background color: Light gray (#F5F5F5) to provide a clean and neutral backdrop.
- Accent color: Orange (#FF8C00) for highlighting interactive elements and CTAs.
- Body and headline font: 'Inter', a grotesque-style sans-serif known for its modern, objective, and neutral appearance, making it suitable for both headlines and body text.
- Use flat, minimalistic icons to represent different roles and functions.
- Maintain a clean and structured layout, prioritizing user input fields at the top, followed by settings, and finally the results area.
- Employ subtle animations when adding new name fields or generating teams to enhance user engagement.