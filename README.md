Core HTML Pages
These files define the structure and content of the different pages of your website.
index.html
Purpose: This is the main entry point for your website. When a user navigates to your root domain (e.g., www.your-site.com), this is the file the web server will load first. Its only job is to immediately redirect the user to zosinfo.html. This is a best practice that ensures a clean URL for your visitors.
zosinfo.html
Purpose: This is your main content page. It displays the z/OS-related information. It features the "zOS COMMON INFORMATION" title and the data table. It relies on script-public.js to fetch and display the data from zosinfo-data.json.
linkedin.html
Purpose: This is your second content page, specifically for the LinkedIn article links. It has a layout consistent with the zOSINFO page but without the main title. It also uses script-public.js to load its data from linkedin-data.json.
edit.html
Purpose: This is the private, password-protected administration page. It allows you to view, edit, add, and delete entries from both the zosinfo-data.json and linkedin-data.json files. It uses the more powerful script-private.js to handle all the editing and saving functionality.
Data Files (JSON)
These files act as simple databases for your website, separating the content from the presentation.
zosinfo-data.json
Purpose: This file stores all the data records for the zosinfo.html page. When you save changes from the editor for the zOSINFO page, you are creating a new version of this file.
linkedin-data.json
Purpose: This file stores the data records for the linkedin.html page, containing the topics and links for your articles.
JavaScript Logic
These files contain the "brains" of the website, making the pages interactive and dynamic.
script-public.js
Purpose: This script is loaded by the public-facing pages (zosinfo.html and linkedin.html). It handles fetching the correct JSON data, building the HTML table, and enabling the interactive filtering feature for visitors. It also manages the three-dots navigation menu.
script-private.js
Purpose: This is the advanced script for the edit.html page. It contains all the functionality of the public script but adds the critical editing features: password protection, making table cells editable, adding and deleting rows, and saving the updated data back to a new JSON file that you can download.
This structure creates a robust and easy-to-maintain static website with powerful dynamic and content management capabilities.

